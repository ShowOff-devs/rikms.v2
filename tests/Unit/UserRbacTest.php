<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function createUnitRbacRole(string $slug): Role
{
    return Role::create([
        'slug' => $slug,
        'name' => str($slug)->replace('_', ' ')->title()->toString(),
        'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
        'is_active' => true,
    ]);
}

test('user has role through normalized role relationship', function () {
    $role = createUnitRbacRole('agency_admin');
    $user = User::factory()->create(['role' => 'public_user']);

    $user->roles()->attach($role, ['assigned_at' => now()]);

    expect($user->fresh()->hasRole('agency_admin'))->toBeTrue()
        ->and($user->fresh()->hasAnyRole(['public_user', 'agency_admin']))->toBeTrue()
        ->and($user->fresh()->isAgencyAdmin())->toBeTrue();
});

test('user has permission through assigned role', function () {
    $role = createUnitRbacRole('agency_admin');
    $permission = Permission::create([
        'slug' => 'research.view',
        'name' => 'Research View',
        'module' => 'research',
        'display_name' => 'Research View',
    ]);
    $role->permissions()->attach($permission);

    $user = User::factory()->create(['role' => 'public_user']);
    $user->roles()->attach($role, ['assigned_at' => now()]);

    expect($user->fresh()->hasPermission('research.view'))->toBeTrue()
        ->and($user->fresh()->hasAnyPermission(['research.manage', 'research.view']))->toBeTrue();
});

test('super admin has permissions by role shortcut', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    expect($user->hasPermission('platform_settings.view'))->toBeTrue()
        ->and($user->isSuperAdmin())->toBeTrue();
});
