<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Seed the core RIKMS role records.
     */
    public function run(): void
    {
        collect([
            [
                'slug' => 'super_admin',
                'name' => 'Super Admin',
                'display_name' => 'Super Admin',
                'description' => 'Regionwide platform administrator with full system access.',
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'slug' => 'agency_admin',
                'name' => 'Agency Admin',
                'display_name' => 'Agency Admin',
                'description' => 'Agency-level administrator for research uploads and access requests.',
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'slug' => 'public_user',
                'name' => 'Public User',
                'display_name' => 'Public User',
                'description' => 'Authenticated public user for future saved requests and access workflows.',
                'is_system' => true,
                'is_active' => true,
            ],
        ])->each(fn (array $role) => Role::updateOrCreate(
            ['slug' => $role['slug']],
            $role,
        ));
    }
}
