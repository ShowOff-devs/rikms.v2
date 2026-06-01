<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlatformSettingResource;
use App\Models\PlatformSetting;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminPlatformSettingController extends Controller
{
    /**
     * @var array<string, array{type:string, group:string, label:string}>
     */
    private array $supportedSettings = [
        'site.name' => ['type' => 'string', 'group' => 'general', 'label' => 'Site Name'],
        'site.short_name' => ['type' => 'string', 'group' => 'general', 'label' => 'Short Name'],
        'site.default_language' => ['type' => 'string', 'group' => 'general', 'label' => 'Default Language'],
        'site.timezone' => ['type' => 'string', 'group' => 'general', 'label' => 'Timezone'],
        'site.logo_url' => ['type' => 'string', 'group' => 'general', 'label' => 'Logo URL'],
        'uploads.max_file_size_mb' => ['type' => 'integer', 'group' => 'uploads', 'label' => 'Maximum Upload Size'],
        'uploads.allowed_file_types' => ['type' => 'json', 'group' => 'uploads', 'label' => 'Allowed File Types'],
        'research.default_status' => ['type' => 'string', 'group' => 'research', 'label' => 'Default Research Status'],
        'research.require_authors' => ['type' => 'boolean', 'group' => 'research', 'label' => 'Require Authors'],
        'research.require_abstract' => ['type' => 'boolean', 'group' => 'research', 'label' => 'Require Abstract'],
        'research.require_keywords' => ['type' => 'boolean', 'group' => 'research', 'label' => 'Require Keywords'],
        'research.require_publication_year' => ['type' => 'boolean', 'group' => 'research', 'label' => 'Require Publication Year'],
        'access_requests.enabled' => ['type' => 'boolean', 'group' => 'access_control', 'label' => 'Access Requests Enabled'],
        'access_requests.default_policy' => ['type' => 'string', 'group' => 'access_control', 'label' => 'Default Access Policy'],
        'access_requests.embargo_override_enabled' => ['type' => 'boolean', 'group' => 'access_control', 'label' => 'Embargo Override'],
        'access_requests.embargo_duration_months' => ['type' => 'integer', 'group' => 'access_control', 'label' => 'Embargo Duration'],
        'security.require_mfa_super_admins' => ['type' => 'boolean', 'group' => 'security', 'label' => 'Require MFA for Super Admins'],
        'security.login_alerts_enabled' => ['type' => 'boolean', 'group' => 'security', 'label' => 'Login Alerts'],
        'security.failed_login_threshold' => ['type' => 'integer', 'group' => 'security', 'label' => 'Failed Login Threshold'],
        'security.lockout_duration_minutes' => ['type' => 'integer', 'group' => 'security', 'label' => 'Lockout Duration'],
        'security.session_timeout_minutes' => ['type' => 'integer', 'group' => 'security', 'label' => 'Session Timeout'],
        'notifications.system_enabled' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'System Notifications'],
        'notifications.email_enabled' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'Email Notifications'],
        'notifications.security_alerts_enabled' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'Security Alerts'],
        'notifications.access_request_submitted' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'Access Request Submitted'],
        'notifications.research_published' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'Research Published'],
        'notifications.weekly_activity_digest' => ['type' => 'boolean', 'group' => 'notifications', 'label' => 'Weekly Activity Digest'],
        'maintenance.enabled' => ['type' => 'boolean', 'group' => 'maintenance', 'label' => 'Maintenance Mode'],
        'maintenance.notice_text' => ['type' => 'string', 'group' => 'maintenance', 'label' => 'Maintenance Notice'],
        'backup.last_backup_at' => ['type' => 'string', 'group' => 'backup', 'label' => 'Last Backup At'],
        'backup.frequency' => ['type' => 'string', 'group' => 'backup', 'label' => 'Backup Frequency'],
        'backup.status' => ['type' => 'string', 'group' => 'backup', 'label' => 'Backup Status'],
        'ai.processing.enabled' => ['type' => 'boolean', 'group' => 'ai', 'label' => 'AI Processing Enabled'],
    ];

    public function update(Request $request, PlatformSetting $setting): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['nullable'],
            'type' => ['nullable', Rule::in(['string', 'integer', 'boolean', 'json', 'encrypted'])],
        ]);

        $oldValues = $this->auditValues($setting);
        $type = $validated['type'] ?? $setting->type;
        $value = $this->normalizeValue($validated['value'] ?? null, $type);

        $setting->forceFill([
            'value' => $type === 'encrypted' ? Crypt::encryptString((string) $value) : $this->serializeValue($value, $type),
            'type' => $type,
            'is_encrypted' => $type === 'encrypted' || $setting->is_encrypted,
            'updated_by' => $request->user()->id,
        ])->save();

        AuditLogger::record(
            $request,
            'platform_setting.updated',
            $setting,
            $oldValues,
            $this->auditValues($setting->fresh()),
        );

        return ApiResponse::success(
            'Platform setting updated.',
            (new PlatformSettingResource($setting->fresh()))->resolve($request),
        );
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        $updated = DB::transaction(function () use ($request, $validated) {
            return collect($validated['settings'])
                ->map(function ($value, string $key) use ($request): ?PlatformSetting {
                    $definition = $this->supportedSettings[$key] ?? null;

                    if (! $definition) {
                        return null;
                    }

                    $setting = PlatformSetting::query()->firstOrNew(['key' => $key]);
                    $oldValues = $setting->exists ? $this->auditValues($setting) : null;
                    $normalizedValue = $this->normalizeValue($value, $definition['type']);

                    $setting->forceFill([
                        'value' => $this->serializeValue($normalizedValue, $definition['type']),
                        'type' => $definition['type'],
                        'group' => $setting->group ?: $definition['group'],
                        'label' => $setting->label ?: $definition['label'],
                        'is_public' => $setting->is_public ?? false,
                        'is_encrypted' => false,
                        'updated_by' => $request->user()->id,
                    ])->save();

                    AuditLogger::record(
                        $request,
                        'platform_setting.updated',
                        $setting,
                        $oldValues,
                        $this->auditValues($setting),
                    );

                    return $setting;
                })
                ->filter()
                ->values();
        });

        AuditLogger::record(
            $request,
            'platform_settings.bulk_updated',
            null,
            null,
            ['keys' => $updated->pluck('key')->values()->all()],
        );

        return ApiResponse::success(
            'Platform settings updated.',
            PlatformSettingResource::collection($updated)->resolve($request),
            ['updated_count' => $updated->count()],
        );
    }

    private function normalizeValue(mixed $value, string $type): mixed
    {
        return match ($type) {
            'integer' => filter_var($value, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE),
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            'json' => is_string($value) ? json_decode($value, true) : $value,
            default => $value === null ? null : (string) $value,
        };
    }

    private function serializeValue(mixed $value, string $type): ?string
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'json' => json_encode($value),
            'boolean' => $value ? 'true' : 'false',
            default => (string) $value,
        };
    }

    private function auditValues(PlatformSetting $setting): array
    {
        return [
            'key' => $setting->key,
            'value' => $setting->is_encrypted ? '[encrypted]' : $setting->value,
            'type' => $setting->type,
            'group' => $setting->group,
        ];
    }
}
