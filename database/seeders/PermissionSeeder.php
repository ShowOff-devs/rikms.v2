<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Seed module-level permissions and attach the initial role matrix.
     */
    public function run(): void
    {
        $permissions = collect([
            ['module' => 'dashboard', 'action' => 'view'],
            ['module' => 'agencies', 'action' => 'view'],
            ['module' => 'agencies', 'action' => 'manage'],
            ['module' => 'users', 'action' => 'view'],
            ['module' => 'users', 'action' => 'manage'],
            ['module' => 'research', 'action' => 'view'],
            ['module' => 'research', 'action' => 'manage'],
            ['module' => 'uploads', 'action' => 'create'],
            ['module' => 'uploads', 'action' => 'manage'],
            ['module' => 'access_requests', 'action' => 'view'],
            ['module' => 'access_requests', 'action' => 'decide'],
            ['module' => 'approvals', 'action' => 'view'],
            ['module' => 'approvals', 'action' => 'decide'],
            ['module' => 'analytics', 'action' => 'view'],
            ['module' => 'reports', 'action' => 'view'],
            ['module' => 'notifications', 'action' => 'view'],
            ['module' => 'archive', 'action' => 'view'],
            ['module' => 'archive', 'action' => 'restore'],
            ['module' => 'audit_logs', 'action' => 'view'],
            ['module' => 'security', 'action' => 'view'],
            ['module' => 'platform_settings', 'action' => 'view'],
            ['module' => 'platform_settings', 'action' => 'manage'],
        ])->map(function (array $permission): Permission {
            $slug = $permission['module'].'.'.$permission['action'];
            $name = str($slug)->replace(['_', '.'], ' ')->title()->toString();

            return Permission::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'module' => $permission['module'],
                    'display_name' => $name,
                    'description' => 'Allows '.$permission['action'].' access for '.$permission['module'].'.',
                ],
            );
        });

        $superAdmin = Role::where('slug', 'super_admin')->first();
        $agencyAdmin = Role::where('slug', 'agency_admin')->first();
        $publicUser = Role::where('slug', 'public_user')->first();

        $superAdmin?->permissions()->syncWithoutDetaching($permissions->pluck('id'));

        $agencyAdmin?->permissions()->syncWithoutDetaching(
            $permissions
                ->whereIn('module', [
                    'dashboard',
                    'research',
                    'uploads',
                    'access_requests',
                    'approvals',
                    'analytics',
                    'reports',
                    'notifications',
                    'archive',
                ])
                ->pluck('id'),
        );

        $publicUser?->permissions()->syncWithoutDetaching(
            $permissions
                ->where('module', 'research')
                ->where('slug', 'research.view')
                ->pluck('id'),
        );
    }
}
