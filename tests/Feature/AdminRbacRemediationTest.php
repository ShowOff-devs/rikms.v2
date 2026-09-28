<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

function remediationPermission(string $slug): Permission
{
    [$module, $action] = explode('.', $slug, 2);

    return Permission::query()->firstOrCreate(['slug' => $slug], [
        'name' => str($slug)->replace(['_', '.'], ' ')->title(),
        'display_name' => str($slug)->replace(['_', '.'], ' ')->title(),
        'module' => $module,
        'description' => "Allows {$action} access.",
    ]);
}

function remediationRole(string $slug, array $permissions = [], bool $active = true): Role
{
    $role = Role::query()->create([
        'slug' => $slug,
        'name' => str($slug)->replace('_', ' ')->title(),
        'display_name' => str($slug)->replace('_', ' ')->title(),
        'is_system' => $slug === 'super_admin',
        'is_active' => $active,
    ]);
    $role->permissions()->sync(collect($permissions)->map(fn ($permission) => remediationPermission($permission)->id));

    return $role;
}

function remediationUser(Role $role): User
{
    $user = User::factory()->create(['role' => $role->slug, 'status' => 'active']);
    $user->roles()->sync([$role->id => ['assigned_at' => now()]]);

    if ($role->slug === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('test-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['code'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

    return $user;
}

test('custom admin is limited to explicitly granted admin permissions', function () {
    $viewer = remediationUser(remediationRole('settings_viewer', ['platform_settings.view']));

    $this->actingAs($viewer)->getJson('/api/admin/platform-settings')->assertOk();
    $this->actingAs($viewer)->postJson('/api/admin/platform-settings/bulk-update', ['settings' => []])->assertForbidden();
    $this->actingAs($viewer)->getJson('/api/admin/rbac/roles')->assertForbidden();
});

test('analytics viewers cannot export project reports without export permission', function () {
    $viewer = remediationUser(remediationRole('analytics_viewer', ['analytics.view']));
    $exporter = remediationUser(remediationRole('analytics_exporter', ['analytics.view', 'analytics.export']));

    $this->actingAs($viewer)
        ->getJson('/api/admin/analytics/project-reports/summary')
        ->assertOk();
    $this->actingAs($viewer)
        ->get('/api/admin/analytics/project-reports/export?format=csv')
        ->assertForbidden();
    $this->actingAs($exporter)
        ->get('/api/admin/analytics/project-reports/export?format=csv')
        ->assertOk();
});

test('rbac user assignments are paginated and searchable', function () {
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $role = remediationRole('regional_reviewer', ['dashboard.view']);
    remediationUser($role)->forceFill(['name' => 'Unique Regional Reviewer'])->save();
    User::factory()->count(3)->create(['status' => 'active']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/rbac/users?per_page=2&page=1&query=Unique%20Regional')
        ->assertOk()
        ->assertJsonPath('meta.pagination.per_page', 2)
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.userName', 'Unique Regional Reviewer');
});

test('built in agency admin cannot enter admin portal despite overlapping permissions', function () {
    $agencyAdmin = remediationUser(remediationRole('agency_admin', ['analytics.view']));

    $this->actingAs($agencyAdmin)->getJson('/api/admin/analytics/overview')->assertForbidden();
});

test('inactive roles and expired direct permissions grant no access', function () {
    $inactive = remediationUser(remediationRole('inactive_auditor', ['security.view'], false));
    $this->actingAs($inactive)->getJson('/api/admin/security/queue-health')->assertForbidden();

    $role = remediationRole('direct_grantee');
    $user = remediationUser($role);
    $permission = remediationPermission('security.view');
    $user->directPermissions()->attach($permission, ['granted_at' => now(), 'expires_at' => now()->subMinute()]);
    expect($user->hasPermission('security.view'))->toBeFalse();

    $user->directPermissions()->updateExistingPivot($permission->id, ['expires_at' => now()->addMinute()]);
    expect($user->hasPermission('security.view'))->toBeTrue();
});

test('role replacement is atomic canonical and rejects inactive roles', function () {
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $oldRole = remediationRole('old_role', ['rbac.view']);
    $newRole = remediationRole('new_role', ['rbac.view']);
    $inactiveRole = remediationRole('inactive_role', [], false);
    $target = remediationUser($oldRole);

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$target->id}/role", ['role_id' => $newRole->id])
        ->assertOk()
        ->assertJsonCount(1, 'data.roles');

    expect($target->fresh()->role)->toBe('new_role')
        ->and($target->fresh()->roles()->pluck('roles.id')->all())->toBe([$newRole->id]);

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$target->id}/role", ['role_id' => $inactiveRole->id])
        ->assertUnprocessable();

    expect($target->fresh()->role)->toBe('new_role')
        ->and($target->fresh()->roles()->pluck('roles.id')->all())->toBe([$newRole->id]);
});

test('final active super admin cannot be replaced and system permissions are protected', function () {
    $superRole = remediationRole('super_admin');
    $superAdmin = remediationUser($superRole);
    $replacement = remediationRole('replacement', ['rbac.view']);

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$superAdmin->id}/role", ['role_id' => $replacement->id])
        ->assertUnprocessable();

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/rbac/roles/{$superRole->id}/permissions", ['permission_ids' => []])
        ->assertUnprocessable();

    expect($superAdmin->fresh()->isSuperAdmin())->toBeTrue();
});

test('delegated rbac managers cannot grant permissions above their own authority', function () {
    $managerRole = remediationRole('delegated_rbac_manager', [
        'rbac.view', 'rbac.manage', 'roles.manage', 'permissions.manage',
    ]);
    $manager = remediationUser($managerRole);
    $securityManage = remediationPermission('security.manage');
    $editableRole = remediationRole('limited_reviewer', ['rbac.view']);

    $this->actingAs($manager)
        ->postJson('/api/admin/rbac/roles', [
            'name' => 'Escalated Role',
            'permission_ids' => [$securityManage->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('permission_ids');

    $this->actingAs($manager)
        ->patchJson("/api/admin/rbac/roles/{$editableRole->id}/permissions", [
            'name' => 'Escalated Reviewer',
            'permission_ids' => [$securityManage->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('permission_ids');

    expect($editableRole->fresh()->name)->toBe('Limited Reviewer')
        ->and($editableRole->fresh()->permissions()->pluck('slug')->all())->toBe(['rbac.view']);
});

test('delegated rbac managers cannot assign or modify super admin accounts', function () {
    $manager = remediationUser(remediationRole('delegated_assignment_manager', [
        'rbac.view', 'rbac.manage',
    ]));
    $superRole = remediationRole('super_admin');
    $superAdmin = remediationUser($superRole);
    $target = remediationUser(remediationRole('assignment_target', ['rbac.view']));

    $this->actingAs($manager)
        ->putJson("/api/admin/rbac/users/{$target->id}/role", ['role_id' => $superRole->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('role_id');

    $this->actingAs($manager)
        ->putJson("/api/admin/rbac/users/{$superAdmin->id}/role", ['role_id' => $target->roles()->first()->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('role_id');

    expect($target->fresh()->isSuperAdmin())->toBeFalse()
        ->and($superAdmin->fresh()->isSuperAdmin())->toBeTrue();
});
