<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlatformSettingResource;
use App\Models\PlatformSetting;
use App\Services\BackupReadinessService;
use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AdminPlatformSettingController extends Controller
{
    public function backupReadiness(BackupReadinessService $readiness): JsonResponse
    {
        return ApiResponse::success(
            'Backup destination readiness checked.',
            $readiness->inspect(),
        );
    }

    public function update(Request $request, PlatformSetting $setting, PlatformSettingsService $settings): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['nullable'],
            'confirm_maintenance_mode' => ['sometimes', 'boolean'],
            'expected_version' => ['sometimes', 'nullable', 'string', 'size:64'],
        ]);

        $definition = $settings->definition($setting->key);

        if (! $definition) {
            throw ValidationException::withMessages([
                'setting' => 'Unknown platform setting.',
            ]);
        }

        $oldValues = $this->auditValues($setting);

        if (array_key_exists('expected_version', $validated)
            && $this->settingVersion($setting) !== $validated['expected_version']) {
            return ApiResponse::error(
                'This setting was changed by another administrator. Refresh before saving again.',
                ['setting' => ['The platform setting has changed since it was loaded.']],
                409,
            );
        }

        $type = (string) $definition['type'];
        $value = $settings->normalize($setting->key, $validated['value'] ?? null);

        $this->ensureMaintenanceEnableWasConfirmed(
            $setting->key,
            $value,
            (bool) ($validated['confirm_maintenance_mode'] ?? false),
            $settings,
        );

        $setting->forceFill([
            'value' => $settings->serialize($setting->key, $value),
            'type' => $type,
            'group' => $definition['group'] ?? $setting->group,
            'label' => $definition['label'] ?? $setting->label,
            'description' => $definition['description'] ?? $setting->description,
            'is_public' => (bool) ($definition['is_public'] ?? false),
            'is_encrypted' => false,
            'updated_by' => $request->user()->id,
        ])->save();

        AuditLogger::record(
            $request,
            'platform_setting.updated',
            $setting,
            $oldValues,
            $this->auditValues($setting->fresh()),
        );

        $settings->forgetCache();

        return ApiResponse::success(
            'Platform setting updated.',
            (new PlatformSettingResource($setting->fresh()))->resolve($request),
        );
    }

    public function bulkUpdate(Request $request, PlatformSettingsService $settings): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array', 'max:100'],
            'settings.*' => ['nullable'],
            'confirm_maintenance_mode' => ['sometimes', 'boolean'],
            'expected_versions' => ['sometimes', 'array'],
            'expected_versions.*' => ['nullable', 'string', 'size:64'],
        ]);

        $unknownKeys = array_values(array_diff(array_keys($validated['settings']), $settings->keys()));

        if ($unknownKeys !== []) {
            throw ValidationException::withMessages([
                'settings' => 'Unsupported platform setting keys: '.implode(', ', $unknownKeys),
            ]);
        }

        $unknownVersionKeys = array_values(array_diff(
            array_keys($validated['expected_versions'] ?? []),
            array_keys($validated['settings']),
        ));

        if ($unknownVersionKeys !== []) {
            throw ValidationException::withMessages([
                'expected_versions' => 'Version checks were supplied for settings that are not being updated.',
            ]);
        }

        if (array_key_exists(PlatformSettingsService::MAINTENANCE_ENABLED, $validated['settings'])) {
            $maintenanceEnabled = $settings->normalize(
                PlatformSettingsService::MAINTENANCE_ENABLED,
                $validated['settings'][PlatformSettingsService::MAINTENANCE_ENABLED],
            );

            $this->ensureMaintenanceEnableWasConfirmed(
                PlatformSettingsService::MAINTENANCE_ENABLED,
                $maintenanceEnabled,
                (bool) ($validated['confirm_maintenance_mode'] ?? false),
                $settings,
            );
        }

        $updated = DB::transaction(function () use ($request, $validated, $settings) {
            $existingSettings = PlatformSetting::query()
                ->whereIn('key', array_keys($validated['settings']))
                ->lockForUpdate()
                ->get()
                ->keyBy('key');

            foreach ($validated['expected_versions'] ?? [] as $key => $expectedVersion) {
                $existingSetting = $existingSettings->get($key);
                $actualVersion = $existingSetting ? $this->settingVersion($existingSetting) : null;

                if ($actualVersion !== $expectedVersion) {
                    throw new HttpResponseException(ApiResponse::error(
                        'Platform settings changed while you were editing. Refresh before saving again.',
                        ['settings.'.$key => ['This setting has changed since it was loaded.']],
                        409,
                    ));
                }
            }

            return collect($validated['settings'])
                ->map(function ($value, string $key) use ($request, $settings, $existingSettings): PlatformSetting {
                    $definition = $settings->definition($key);
                    $setting = $existingSettings->get($key) ?? new PlatformSetting(['key' => $key]);
                    $oldValues = $setting->exists ? $this->auditValues($setting) : null;
                    $normalizedValue = $settings->normalize($key, $value);

                    $setting->forceFill([
                        'value' => $settings->serialize($key, $normalizedValue),
                        'type' => $definition['type'],
                        'group' => $definition['group'],
                        'label' => $definition['label'],
                        'description' => $definition['description'] ?? $setting->description,
                        'is_public' => (bool) ($definition['is_public'] ?? false),
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
                ->values();
        });

        $settings->forgetCache();

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

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => ['required', 'file', 'image', 'mimetypes:image/png,image/jpeg,image/webp', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:min_width=16,min_height=16,max_width=4096,max_height=4096'],
        ]);

        $path = $validated['logo']->store('platform/logos', 'public');
        $url = Storage::disk('public')->url($path);

        AuditLogger::record(
            $request,
            'platform_setting.logo_uploaded',
            null,
            null,
            [
                'logo_url' => $url,
                'file_name' => $validated['logo']->getClientOriginalName(),
            ],
        );

        return ApiResponse::success('Platform logo uploaded.', [
            'logo_url' => $url,
            'file_name' => $validated['logo']->getClientOriginalName(),
            'uploaded_at' => now()->toISOString(),
        ], [], 201);
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

    private function settingVersion(PlatformSetting $setting): string
    {
        return hash('sha256', implode("\0", [
            (string) $setting->key,
            (string) $setting->value,
            (string) $setting->type,
            $setting->updated_at?->toISOString() ?? '',
        ]));
    }

    private function ensureMaintenanceEnableWasConfirmed(
        string $key,
        mixed $value,
        bool $confirmed,
        PlatformSettingsService $settings,
    ): void {
        if ($key !== PlatformSettingsService::MAINTENANCE_ENABLED
            || $value !== true
            || $settings->maintenanceEnabled()
            || $confirmed) {
            return;
        }

        throw ValidationException::withMessages([
            'confirm_maintenance_mode' => 'Confirm maintenance mode before enabling it.',
        ]);
    }
}
