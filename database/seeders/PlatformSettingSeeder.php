<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use App\Services\PlatformSettingsService;
use Illuminate\Database\Seeder;

class PlatformSettingSeeder extends Seeder
{
    /**
     * Seed safe default platform settings for the pilot foundation.
     */
    public function run(): void
    {
        $settings = app(PlatformSettingsService::class);

        collect($settings->allDefinitions())->each(function (array $definition, string $key) use ($settings): void {
            $setting = PlatformSetting::query()->firstOrNew(['key' => $key]);

            if (! $setting->exists) {
                $setting->value = $settings->serialize($key, $definition['default'] ?? null);
            }

            $setting->forceFill(
                [
                    'type' => $definition['type'],
                    'group' => $definition['group'],
                    'label' => $definition['label'],
                    'description' => $definition['description'] ?? null,
                    'is_public' => (bool) ($definition['is_public'] ?? false),
                    'is_encrypted' => false,
                ],
            )->save();
        });

        $settings->forgetCache();
    }
}
