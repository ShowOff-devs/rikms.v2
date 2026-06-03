<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification as SystemNotification;
use App\Models\Permission;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\Role;
use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

function createPhase8Role(string $slug): Role
{
    return Role::query()->firstOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function createPhase8User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase8Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase8Agency(string $slug = 'phase8-agency'): Agency
{
    return Agency::query()->create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase8Research(Agency $agency, User $uploader): Research
{
    return Research::query()->create([
        'slug' => 'phase-8-research-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 8 Relational Research',
        'abstract' => 'Phase 8 analytics fixture.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase8'],
        'status' => 'published',
        'access_level' => 'request_required',
        'downloads' => 7,
    ]);
}

test('admin access monitoring APIs are protected and filtered from relational access requests', function () {
    $agency = createPhase8Agency();
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $research = createPhase8Research($agency, $agencyAdmin);

    AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Phase Eight Requester',
        'requester_email' => 'phase8@example.test',
        'purpose' => 'Policy analysis',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->getJson('/api/admin/access-monitoring')->assertUnauthorized();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/access-monitoring')
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/access-monitoring?status=pending&requester_email=phase8')
        ->assertOk()
        ->assertJsonPath('meta.summary.pending', 1)
        ->assertJsonPath('data.0.requester_email', 'phase8@example.test');
});

test('rbac writes assign remove permissions and protect the last super admin', function () {
    $superRole = createPhase8Role('super_admin');
    $agencyRole = createPhase8Role('agency_admin');
    $superAdmin = createPhase8User('super_admin');
    $secondSuperAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('phase8-dost'));
    $permission = Permission::query()->create([
        'name' => 'Phase 8 Permission',
        'slug' => 'phase8.manage',
        'module' => 'phase8',
        'display_name' => 'Phase 8 Permission',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/admin/rbac/users/{$agencyAdmin->id}/roles", ['role_id' => $agencyRole->id])
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/rbac/users/{$agencyAdmin->id}/roles", ['role_id' => $agencyRole->id])
        ->assertOk();

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/rbac/roles/{$agencyRole->id}/permissions", [
            'permission_ids' => [$permission->id],
        ])
        ->assertOk();

    expect(AuditLog::query()->where('event', 'rbac.permissions.updated')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/rbac/users/{$secondSuperAdmin->id}/roles/{$superRole->id}")
        ->assertOk();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/rbac/users/{$superAdmin->id}/roles/{$superRole->id}", [
            'confirm_self_removal' => true,
        ])
        ->assertUnprocessable();
});

test('agency admin user management APIs use relational users instead of mock records', function () {
    Notification::fake();

    $agency = createPhase8Agency('agency-admin-users-agency');
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', $agency);

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/agency-admin-users')
        ->assertForbidden();

    $createdId = $this->actingAs($superAdmin)
        ->postJson('/api/admin/agency-admin-users', [
            'full_name' => 'Database Backed Admin',
            'email' => 'database-backed-admin@example.test',
            'agency_id' => $agency->id,
            'status' => 'active',
            'temporary_password' => 'temporary-password',
            'send_invite' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Database Backed Admin')
        ->assertJsonPath('data.email', 'database-backed-admin@example.test')
        ->assertJsonPath('data.agency.id', $agency->id)
        ->json('data.id');

    $createdUser = User::query()->findOrFail($createdId);

    expect($createdUser->isAgencyAdmin())->toBeTrue();
    Notification::assertSentTo($createdUser, ResetPassword::class);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/agency-admin-users?per_page=100')
        ->assertOk()
        ->assertJsonFragment(['email' => 'database-backed-admin@example.test']);

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/agency-admin-users/{$createdId}", [
            'full_name' => 'Updated Database Admin',
            'email' => 'updated-database-admin@example.test',
            'agency_id' => $agency->id,
            'status' => 'inactive',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Database Admin')
        ->assertJsonPath('data.status', 'inactive');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$createdId}/activate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$createdId}/password-reset")
        ->assertOk()
        ->assertJsonPath('data.sent_to', 'updated-database-admin@example.test');

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/agency-admin-users/{$createdId}")
        ->assertOk();

    $removedUser = User::query()->findOrFail($createdId);

    expect($removedUser->archived_at)->not->toBeNull()
        ->and($removedUser->isAgencyAdmin())->toBeFalse()
        ->and(AuditLog::query()->where('event', 'agency_admin_user.removed')->exists())->toBeTrue();
});

test('agency management can assign a real agency admin user to an agency', function () {
    $agency = createPhase8Agency('assign-admin-agency');
    $superAdmin = createPhase8User('super_admin');
    $previousAdmin = createPhase8User('agency_admin', $agency);
    $newAdmin = createPhase8User('agency_admin');

    $this->actingAs($previousAdmin)
        ->postJson("/api/admin/agencies/{$agency->id}/assign-admin", [
            'admin_user_id' => $newAdmin->id,
        ])
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agencies/{$agency->id}/assign-admin", [
            'admin_user_id' => $newAdmin->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.agency_admins.0.id', $newAdmin->id)
        ->assertJsonPath('data.agency_admins.0.email', $newAdmin->email);

    expect($newAdmin->fresh()->agency_id)->toBe($agency->id)
        ->and($previousAdmin->fresh()->agency_id)->toBeNull()
        ->and(AuditLog::query()->where('event', 'agency.admin_assigned')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/agencies?per_page=100')
        ->assertOk()
        ->assertJsonFragment(['email' => $newAdmin->email]);
});

test('agency management create update status and archive write relational agencies', function () {
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin');

    $createdId = $this->actingAs($superAdmin)
        ->postJson('/api/admin/agencies', [
            'name' => 'Relational Agency Management Office',
            'short_name' => 'RAMO',
            'type' => 'government-agency',
            'description' => 'Created through relational API.',
            'website' => 'https://ramo.example.test',
            'email' => 'contact@ramo.example.test',
            'address' => 'Davao City',
            'status' => 'active',
            'agency_admin_id' => $agencyAdmin->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.short_name', 'RAMO')
        ->assertJsonPath('data.agency_admins.0.id', $agencyAdmin->id)
        ->json('data.id');

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/agencies/{$createdId}", [
            'name' => 'Relational Agency Management Office Updated',
            'short_name' => 'RAMOU',
            'type' => 'research-consortium',
            'description' => 'Updated through relational API.',
            'website' => 'https://ramou.example.test',
            'email' => 'contact@ramou.example.test',
            'address' => 'Davao City',
            'status' => 'inactive',
            'agency_admin_id' => $agencyAdmin->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.short_name', 'RAMOU')
        ->assertJsonPath('data.status', 'inactive');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agencies/{$createdId}/activate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agencies/{$createdId}/archive")
        ->assertOk();

    $agency = Agency::query()->findOrFail($createdId);

    expect($agency->archived_at)->not->toBeNull()
        ->and($agencyAdmin->fresh()->agency_id)->toBeNull()
        ->and(AuditLog::query()->where('event', 'agency.archived')->exists())->toBeTrue();
});

test('system activity and security session APIs read relational data', function () {
    $superAdmin = createPhase8User('super_admin');
    $agency = createPhase8Agency('activity-agency');

    SystemNotification::query()->create([
        'user_id' => $superAdmin->id,
        'type' => 'system.update',
        'title' => 'Relational notification',
        'message' => 'This notification is stored in the database.',
        'priority' => 'normal',
        'status' => 'unread',
    ]);

    AuditLog::query()->create([
        'user_id' => $superAdmin->id,
        'agency_id' => $agency->id,
        'event' => 'agency.updated',
        'created_at' => now(),
    ]);

    DB::table('sessions')->insert([
        'id' => 'phase8-admin-session',
        'user_id' => $superAdmin->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Feature test browser',
        'payload' => '',
        'last_activity' => now()->timestamp,
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/system-activity/notifications')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Relational notification']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/system-activity/logs')
        ->assertOk()
        ->assertJsonFragment(['event' => 'agency.updated']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/security/sessions')
        ->assertOk()
        ->assertJsonFragment(['id' => 'phase8-admin-session']);

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/phase8-admin-session')
        ->assertOk();

    expect(DB::table('sessions')->where('id', 'phase8-admin-session')->exists())->toBeFalse();
});

test('platform setting writes validate update mask encrypted values and audit changes', function () {
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('settings-agency'));
    $superAdmin = createPhase8User('super_admin');
    $setting = PlatformSetting::query()->create([
        'key' => 'site.name',
        'value' => 'RIKMS v2',
        'type' => 'string',
        'group' => 'general',
    ]);
    $encrypted = PlatformSetting::query()->create([
        'key' => 'secret.test',
        'value' => 'do-not-show',
        'type' => 'encrypted',
        'group' => 'security',
        'is_encrypted' => true,
    ]);

    $this->actingAs($agencyAdmin)
        ->patchJson("/api/admin/platform-settings/{$setting->id}", ['value' => 'Nope'])
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/platform-settings/{$setting->id}", ['value' => 'RIKMS Pilot', 'type' => 'string'])
        ->assertOk()
        ->assertJsonPath('data.value', 'RIKMS Pilot');

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/platform-settings?per_page=100')
        ->assertOk()
        ->assertJsonMissing(['value' => 'do-not-show'])
        ->assertJsonFragment(['key' => $encrypted->key, 'value' => null]);

    expect(AuditLog::query()->where('event', 'platform_setting.updated')->exists())->toBeTrue();
});

test('security center actions resolve reopen and audit security events', function () {
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('security-agency'));
    $superAdmin = createPhase8User('super_admin');
    $event = SecurityEvent::query()->create([
        'event_type' => 'login_failed',
        'severity' => 'high',
        'metadata' => ['description' => 'Repeated failed login attempts.'],
        'created_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/resolve")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/resolve")
        ->assertOk()
        ->assertJsonPath('data.id', $event->id);

    expect($event->fresh()->resolved_at)->not->toBeNull();
    expect(AuditLog::query()->where('event', 'security_event.resolved')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/reopen")
        ->assertOk();

    expect($event->fresh()->resolved_at)->toBeNull();
    expect(AuditLog::query()->where('event', 'security_event.reopened')->exists())->toBeTrue();
});

test('admin analytics use relational counts and protected exports write audit logs', function () {
    $agency = createPhase8Agency('analytics-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $research = createPhase8Research($agency, $agencyAdmin);

    AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_email' => 'analytics@example.test',
        'status' => 'approved',
    ]);

    $this->getJson('/api/admin/analytics/overview')->assertUnauthorized();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/overview')
        ->assertOk()
        ->assertJsonPath('data.metrics.0.value', 1)
        ->assertJsonPath('data.accessRequestStatus.approved', 1);

    $this->actingAs($superAdmin)
        ->get('/api/admin/reports/research/export')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    expect(AuditLog::query()->where('event', 'report.exported')->exists())->toBeTrue();
});
