<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class PlatformSettingSeeder extends Seeder
{
    /**
     * Seed safe default platform settings for the pilot foundation.
     */
    public function run(): void
    {
        collect([
            [
                'key' => 'site.name',
                'value' => 'RIKMS v2',
                'type' => 'string',
                'group' => 'general',
                'label' => 'Site Name',
                'description' => 'Public and administrative platform name.',
                'is_public' => true,
            ],
            [
                'key' => 'maintenance.enabled',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'maintenance',
                'label' => 'Maintenance Mode',
                'description' => 'Controls future platform maintenance behavior.',
                'is_public' => false,
            ],
            [
                'key' => 'uploads.max_file_size_mb',
                'value' => '25',
                'type' => 'integer',
                'group' => 'uploads',
                'label' => 'Maximum Upload Size',
                'description' => 'Default upload size limit for future upload APIs.',
                'is_public' => false,
            ],
            [
                'key' => 'ai.processing.enabled',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'ai',
                'label' => 'AI Processing Enabled',
                'description' => 'Future toggle for AI-assisted extraction jobs.',
                'is_public' => false,
            ],
        ])->each(fn (array $setting) => PlatformSetting::updateOrCreate(
            ['key' => $setting['key']],
            $setting + ['is_encrypted' => false],
        ));
    }
}
