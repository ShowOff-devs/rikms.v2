<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\Role;
use App\Models\SecurityEvent;
use App\Models\User;

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
