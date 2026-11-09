<?php

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AdminAccountInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

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

test('super admin can create a portal only moderator account', function () {
    Notification::fake();
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $moderatorRole = remediationRole('moderator', ['research_moderation.view']);

    $response = $this->actingAs($superAdmin)
        ->postJson('/api/admin/rbac/users', [
            'name' => 'Regional Moderator',
            'email' => 'Moderator@Example.test',
            'role_id' => $moderatorRole->id,
            'mfa_required' => true,
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.userName', 'Regional Moderator')
        ->assertJsonPath('data.roleId', (string) $moderatorRole->id)
        ->assertJsonPath('meta.invite_sent', true);

    $moderator = User::query()->where('email', 'moderator@example.test')->firstOrFail();

    expect($moderator->agency_id)->toBeNull()
        ->and($moderator->hasVerifiedEmail())->toBeFalse()
        ->and($moderator->status)->toBe('pending_activation')
        ->and($moderator->mfa_required)->toBeTrue()
        ->and($moderator->hasRole('moderator'))->toBeTrue()
        ->and($moderator->canAccessAdminPortal())->toBeTrue()
        ->and($moderator->adminLandingPath())->toBe('/admin/research');

    Notification::assertSentTo($moderator, AdminAccountInvitation::class);
});

test('admin account creation rejects duplicate email and supports sub admin roles', function () {
    Notification::fake();
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $subAdminRole = remediationRole('sub_admin', ['dashboard.view', 'analytics.view']);
    User::factory()->create(['email' => 'existing-admin@example.test']);

    $this->actingAs($superAdmin)->postJson('/api/admin/rbac/users', [
        'name' => 'Duplicate Admin',
        'email' => 'EXISTING-admin@example.test',
        'role_id' => $subAdminRole->id,
    ])->assertUnprocessable()->assertJsonValidationErrors('email');

    $this->actingAs($superAdmin)->postJson('/api/admin/rbac/users', [
        'name' => 'Regional Sub Admin',
        'email' => 'sub-admin@example.test',
        'role_id' => $subAdminRole->id,
    ])->assertCreated()->assertJsonPath('data.role.name', 'sub_admin');
});

test('custom admin signs in through admin portal and is rejected by agency portal', function () {
    $moderator = remediationUser(remediationRole('moderator_login', ['research_moderation.view']));
    $moderator->forceFill([
        'email' => 'portal-moderator@example.test',
        'password' => bcrypt('Temporary!234'),
        'email_verified_at' => now(),
        'agency_id' => null,
    ])->save();

    $this->postJson('/admin/login', [
        'email' => $moderator->email,
        'password' => 'Temporary!234',
    ])->assertOk()->assertJsonPath('redirect', '/admin/research');

    $this->postJson('/logout')->assertSuccessful();

    $this->postJson('/agency/login', [
        'email' => $moderator->email,
        'password' => 'Temporary!234',
        'agency' => 'any-agency',
    ])->assertUnprocessable();
});

test('admin invitation activates once and requires mfa before privileged access', function () {
    Notification::fake();
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $role = remediationRole('invited_moderator', ['research_moderation.view']);

    $this->actingAs($superAdmin)->postJson('/api/admin/rbac/users', [
        'name' => 'Invited Moderator',
        'email' => 'invited-moderator@example.test',
        'role_id' => $role->id,
        'mfa_required' => true,
    ])->assertCreated();

    $user = User::query()->where('email', 'invited-moderator@example.test')->firstOrFail();
    $token = null;
    Notification::assertSentTo($user, AdminAccountInvitation::class, function ($notification) use (&$token) {
        $token = $notification->token;

        return true;
    });

    $this->post('/logout');
    $this->post(route('password.update'), [
        'token' => $token,
        'email' => $user->email,
        'password' => 'Activated!234',
        'password_confirmation' => 'Activated!234',
    ])->assertSessionHasNoErrors();

    expect($user->fresh()->status)->toBe('active')
        ->and($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and(AuditLog::query()->where('event', 'admin_user.invitation_accepted')->exists())->toBeTrue();

    $this->post(route('password.update'), [
        'token' => $token,
        'email' => $user->email,
        'password' => 'Reused!23456',
        'password_confirmation' => 'Reused!23456',
    ])->assertSessionHasErrors('email');

    $this->postJson('/admin/login', [
        'email' => $user->email,
        'password' => 'Activated!234',
    ])->assertOk()->assertJsonPath('redirect', '/settings/two-factor');
});

test('expired admin invitation cannot activate an account', function () {
    $role = remediationRole('expired_invite_role', ['dashboard.view']);
    $user = remediationUser($role);
    $user->forceFill([
        'status' => 'pending_activation',
        'email_verified_at' => null,
    ])->save();
    $token = Password::broker('users')->createToken($user);

    $this->travel(61)->minutes();

    $this->post(route('password.update'), [
        'token' => $token,
        'email' => $user->email,
        'password' => 'Expired!23456',
        'password_confirmation' => 'Expired!23456',
    ])->assertSessionHasErrors('email');

    expect($user->fresh()->status)->toBe('pending_activation')
        ->and($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('custom admin suspension revokes sessions and account can be reactivated', function () {
    config(['session.driver' => 'database']);
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $customAdmin = remediationUser(remediationRole('suspendable_admin', ['dashboard.view']));
    DB::table('sessions')->insert([
        'id' => 'custom-admin-session',
        'user_id' => $customAdmin->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'payload' => 'test',
        'last_activity' => now()->timestamp,
    ]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/rbac/users/{$customAdmin->id}/suspend")
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');

    expect($customAdmin->fresh()->status)->toBe('suspended')
        ->and(DB::table('sessions')->where('user_id', $customAdmin->id)->exists())->toBeFalse();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/rbac/users/{$customAdmin->id}/reactivate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');
});

test('agency scoped custom admin cannot read another agency research', function () {
    $ownAgency = Agency::query()->create([
        'slug' => 'scope-own', 'name' => 'Scope Own', 'short_name' => 'OWN', 'status' => 'active',
    ]);
    $otherAgency = Agency::query()->create([
        'slug' => 'scope-other', 'name' => 'Scope Other', 'short_name' => 'OTHER', 'status' => 'active',
    ]);
    $role = remediationRole('agency_reviewer', ['research_moderation.view']);
    $role->forceFill(['access_scope' => 'agency'])->save();
    $reviewer = remediationUser($role);
    $reviewer->forceFill(['agency_id' => $ownAgency->id, 'email_verified_at' => now()])->save();
    $uploader = User::factory()->create(['agency_id' => $ownAgency->id, 'status' => 'active']);
    $ownResearch = Research::query()->create([
        'agency_id' => $ownAgency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Own scoped record',
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]);
    $otherResearch = Research::query()->create([
        'agency_id' => $otherAgency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Other scoped record',
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]);

    $this->actingAs($reviewer)
        ->getJson("/api/admin/research/{$ownResearch->id}")
        ->assertOk();
    $this->actingAs($reviewer)
        ->getJson("/api/admin/research/{$otherResearch->id}")
        ->assertForbidden();

    $this->actingAs($reviewer)
        ->getJson('/api/admin/research')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $ownResearch->id);
});

test('agency scoped roles reject system wide permissions', function () {
    $superAdmin = remediationUser(remediationRole('super_admin'));
    $analytics = remediationPermission('analytics.view');

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/rbac/roles', [
            'name' => 'Agency Analyst',
            'slug' => 'agency_analyst',
            'access_scope' => 'agency',
            'permission_ids' => [$analytics->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('permission_ids');

    $role = remediationRole('legacy_agency_analyst', ['analytics.view']);
    $role->forceFill(['access_scope' => 'agency'])->save();
    $analyst = remediationUser($role);

    expect($analyst->hasPermission('analytics.view'))->toBeFalse();
    $this->actingAs($analyst)
        ->getJson('/api/admin/analytics/overview')
        ->assertForbidden();
});
