<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlatformSettingResource;
use App\Models\PlatformSetting;
use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AdminPlatformSettingController extends Controller
{
    public function update(Request $request, PlatformSetting $setting, PlatformSettingsService $settings): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['nullable'],
        ]);

        $definition = $settings->definition($setting->key);

        if (! $definition) {
            throw ValidationException::withMessages([
                'setting' => 'Unknown platform setting.',
            ]);
        }

        $oldValues = $this->auditValues($setting);
        $type = (string) $definition['type'];
        $value = $settings->normalize($setting->key, $validated['value'] ?? null);

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
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        $unknownKeys = array_values(array_diff(array_keys($validated['settings']), $settings->keys()));

        if ($unknownKeys !== []) {
            throw ValidationException::withMessages([
                'settings' => 'Unsupported platform setting keys: '.implode(', ', $unknownKeys),
            ]);
        }

        $updated = DB::transaction(function () use ($request, $validated, $settings) {
            return collect($validated['settings'])
                ->map(function ($value, string $key) use ($request, $settings): PlatformSetting {
                    $definition = $settings->definition($key);
                    $setting = PlatformSetting::query()->firstOrNew(['key' => $key]);
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
            'logo' => ['required', 'file', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
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
}
