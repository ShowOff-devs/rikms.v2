<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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

        $user = User::updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'first_name' => 'Test',
            'last_name' => 'User',
            'password' => Hash::make('password'),
            'role' => 'agency_admin',
            'status' => 'active',
        ]);

        $agencyAdmin = Role::where('slug', 'agency_admin')->first();

        if ($agencyAdmin) {
            $user->roles()->syncWithoutDetaching([
                $agencyAdmin->id => ['assigned_at' => now()],
            ]);
        }
    }
}
