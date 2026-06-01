<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            PlatformSettingSeeder::class,
        ]);

        if (
            app()->environment(['local', 'testing', 'pilot'])
            || (bool) config('rikms.dev_seed_accounts.allow_outside_safe_environments', false)
        ) {
            $this->call(DevelopmentAccountSeeder::class);
        }
    }
}
