<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification as SystemNotification;
use App\Models\Permission;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchApproval;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

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

    if ($role === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('test-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

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

test('queue health is super admin only and exposes safe backlog summaries', function () {
    config(['queue.default' => 'database']);

    $agency = createPhase8Agency('queue-health-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $secretPayload = 'requester@example.test RAW_PRIVATE_JOB_PAYLOAD';

    DB::table('jobs')->insert([
        'queue' => 'default',
        'payload' => $secretPayload,
        'attempts' => 0,
        'reserved_at' => null,
        'available_at' => now()->subMinutes(120)->timestamp,
        'created_at' => now()->subMinutes(120)->timestamp,
    ]);
    DB::table('failed_jobs')->insert([
        'uuid' => (string) str()->uuid(),
        'connection' => 'database',
        'queue' => 'default',
        'payload' => $secretPayload,
        'exception' => 'SMTP password and private exception trace',
        'failed_at' => now(),
    ]);

    $this->getJson('/api/admin/security/queue-health')->assertUnauthorized();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/security/queue-health')
        ->assertForbidden();

    $response = $this->actingAs($superAdmin)
        ->getJson('/api/admin/security/queue-health')
        ->assertOk()
        ->assertJsonPath('data.queue_connection', 'database')
        ->assertJsonPath('data.pending_jobs', 1)
        ->assertJsonPath('data.failed_jobs', 1)
        ->assertJsonPath('data.status', 'critical')
        ->assertJsonStructure([
            'data' => [
                'queue_connection',
                'pending_jobs',
                'failed_jobs',
                'oldest_pending_job_age_minutes',
                'scheduler_heartbeat',
                'worker_heartbeat',
                'status',
            ],
        ]);

    expect($response->json('data.oldest_pending_job_age_minutes'))->toBeGreaterThanOrEqual(119)
        ->and($response->getContent())->not->toContain($secretPayload)
        ->and($response->getContent())->not->toContain('SMTP password')
        ->and(array_keys($response->json('data')))->toBe([
            'queue_connection',
            'pending_jobs',
            'failed_jobs',
            'oldest_pending_job_age_minutes',
            'scheduler_heartbeat',
            'worker_heartbeat',
            'status',
        ]);
});

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

test('access monitoring tracks independent audits and safely revokes overridden approvals', function () {
    $agency = createPhase8Agency('access-monitor-integrity');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $research = createPhase8Research($agency, $agencyAdmin);
    $approved = AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Audited Requester',
        'requester_email' => 'audited@example.test',
        'requester_affiliation' => 'Policy Institute',
        'status' => 'approved',
        'requested_at' => now()->subHours(2),
        'reviewed_by' => $agencyAdmin->id,
        'reviewed_at' => now()->subHour(),
        'access_token_hash' => hash('sha256', 'active-token'),
        'access_token_generated_at' => now()->subHour(),
        'access_expires_at' => now()->addDay(),
    ]);
    $pending = AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Pending Requester',
        'requester_email' => 'pending-audit@example.test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/access-monitoring?organization=Policy%20Institute&per_page=1')
        ->assertOk()
        ->assertJsonPath('data.0.id', $approved->id)
        ->assertJsonPath('data.0.audit_status', 'unreviewed')
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('meta.summary.approved', 1)
        ->assertJsonPath('meta.requests_by_agency.0.count', 1)
        ->assertJsonFragment(['organizations' => ['Policy Institute']]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/access-requests/{$pending->id}/audit-reviewed")
        ->assertConflict();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/access-requests/{$approved->id}/audit-reviewed", ['notes' => 'Decision verified.'])
        ->assertOk()
        ->assertJsonPath('data.audit_status', 'reviewed')
        ->assertJsonPath('data.audit_trail.0.notes', 'Decision verified.');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/access-requests/{$approved->id}/audit-reviewed")
        ->assertConflict();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/access-requests/{$approved->id}/override-deny", ['reason' => 'Approval violated the documented access policy.'])
        ->assertOk()
        ->assertJsonPath('data.status', 'denied')
        ->assertJsonPath('data.public_denial_reason', 'Approval violated the documented access policy.');

    $approved->refresh();
    expect($approved->access_token_hash)->toBeNull()
        ->and($approved->access_token_generated_at)->toBeNull()
        ->and($approved->access_expires_at)->toBeNull()
        ->and($approved->access_revoked_at)->not->toBeNull()
        ->and(AuditLog::query()->where('event', 'access_request.override_denied')->where('auditable_id', $approved->id)->count())->toBe(1);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/access-requests/{$approved->id}/override-deny", ['reason' => 'Repeated override.'])
        ->assertConflict();
});

test('rbac writes assign remove permissions and protect the last super admin', function () {
    $superRole = createPhase8Role('super_admin');
    $agencyRole = createPhase8Role('agency_admin');
    $publicRole = createPhase8Role('public_user');
    $editableRole = Role::query()->create([
        'name' => 'Phase 8 Reviewer',
        'slug' => 'phase_8_reviewer',
        'display_name' => 'Phase 8 Reviewer',
        'is_system' => false,
        'is_active' => true,
    ]);
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
        ->patchJson("/api/admin/rbac/roles/{$editableRole->id}/permissions", [
            'permission_ids' => [$permission->id],
        ])
        ->assertOk();

    expect(AuditLog::query()->where('event', 'rbac.permissions.updated')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$secondSuperAdmin->id}/role", ['role_id' => $publicRole->id])
        ->assertOk();

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$superAdmin->id}/role", ['role_id' => $publicRole->id])
        ->assertUnprocessable();
});

test('rbac custom role deletion is backend connected and audited in history', function () {
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('phase8-rbac-delete'));
    $agencyRole = createPhase8Role('agency_admin');
    $permission = Permission::query()->create([
        'name' => 'Delete Connected Permission',
        'slug' => 'delete.connected',
        'module' => 'rbac',
        'display_name' => 'Delete Connected Permission',
    ]);

    $createdRoleId = $this->actingAs($superAdmin)
        ->postJson('/api/admin/rbac/roles', [
            'name' => 'Temporary Reviewer',
            'description' => 'Temporary custom role for deletion coverage.',
            'permission_ids' => [$permission->id],
        ])
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/rbac/users/{$agencyAdmin->id}/roles", ['role_id' => $createdRoleId])
        ->assertOk();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/rbac/roles/{$createdRoleId}")
        ->assertUnprocessable();

    $this->actingAs($superAdmin)
        ->putJson("/api/admin/rbac/users/{$agencyAdmin->id}/role", ['role_id' => $agencyRole->id])
        ->assertOk();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/rbac/roles/{$createdRoleId}")
        ->assertOk();

    $this->assertSoftDeleted('roles', ['id' => $createdRoleId]);
    $this->assertDatabaseMissing('permission_role', [
        'role_id' => $createdRoleId,
        'permission_id' => $permission->id,
    ]);
    $this->assertDatabaseMissing('role_user', [
        'role_id' => $createdRoleId,
        'user_id' => $agencyAdmin->id,
    ]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'rbac.role.deleted']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/rbac/history')
        ->assertOk()
        ->assertJsonPath('data.0.changeType', 'role-deleted')
        ->assertJsonPath('data.0.roleName', 'Temporary Reviewer')
        ->assertJsonPath('data.0.before.0', 'delete.connected');
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
        ->postJson('/api/admin/agency-admin-users', [
            'full_name' => 'Generated Password Admin',
            'email' => 'generated-password-admin@example.test',
            'agency_id' => $agency->id,
            'status' => 'active',
            'send_invite' => false,
            'temporary_password' => 'temporary-password',
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Generated Password Admin')
        ->assertJsonPath('data.email', 'generated-password-admin@example.test');

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

test('agency admin users expose the latest successful login and require a delivery path for credentials', function () {
    $agency = createPhase8Agency('agency-admin-login-metadata');
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $latestLogin = now()->subMinutes(5)->startOfSecond();

    SecurityEvent::query()->create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
        'event_type' => 'login.success',
        'created_at' => now()->subDay(),
    ]);
    SecurityEvent::query()->create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
        'event_type' => 'login.success',
        'created_at' => $latestLogin,
    ]);
    SecurityEvent::query()->create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
        'event_type' => 'password.changed',
        'created_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/agency-admin-users?per_page=100')
        ->assertOk()
        ->assertJsonFragment([
            'email' => $agencyAdmin->email,
            'last_login_at' => $latestLogin->toISOString(),
        ]);

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/agency-admin-users/{$agencyAdmin->id}")
        ->assertOk()
        ->assertJsonPath('data.last_login_at', $latestLogin->toISOString());

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/agency-admin-users', [
            'full_name' => 'No Credential Delivery',
            'email' => 'no-credential-delivery@example.test',
            'agency_id' => $agency->id,
            'status' => 'active',
            'send_invite' => false,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('temporary_password');
});

test('agency admin users reject inactive or archived agency assignments and expose complete summary metadata', function () {
    $activeAgency = createPhase8Agency('agency-admin-valid-assignment');
    $inactiveAgency = createPhase8Agency('agency-admin-inactive-assignment');
    $archivedAgency = createPhase8Agency('agency-admin-archived-assignment');
    $inactiveAgency->forceFill(['status' => 'inactive'])->save();
    $archivedAgency->forceFill(['archived_at' => now()])->save();
    $superAdmin = createPhase8User('super_admin');
    $existingAdmin = createPhase8User('agency_admin', $activeAgency);
    createPhase8User('agency_admin', $activeAgency)->forceFill(['status' => 'inactive'])->save();

    foreach ([$inactiveAgency, $archivedAgency] as $agency) {
        $this->actingAs($superAdmin)
            ->postJson('/api/admin/agency-admin-users', [
                'full_name' => 'Invalid Agency Assignment',
                'email' => "invalid-{$agency->id}@example.test",
                'agency_id' => $agency->id,
                'status' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('agency_id');
    }

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/agency-admin-users/{$existingAdmin->id}", [
            'full_name' => 'Should Not Change',
            'email' => 'should-not-change@example.test',
            'agency_id' => $inactiveAgency->id,
            'status' => 'inactive',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('agency_id');

    expect($existingAdmin->fresh()->agency_id)->toBe($activeAgency->id)
        ->and($existingAdmin->fresh()->email)->toBe($existingAdmin->email)
        ->and(User::query()->where('email', 'should-not-change@example.test')->exists())->toBeFalse();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/agency-admin-users?per_page=1')
        ->assertOk()
        ->assertJsonPath('meta.pagination.per_page', 1)
        ->assertJsonPath('meta.pagination.total', 2)
        ->assertJsonPath('meta.summary.total_users', 2)
        ->assertJsonPath('meta.summary.active_users', 1)
        ->assertJsonPath('meta.summary.inactive_users', 1);
});

test('admin can send agency admin password reset instructions and audit the send', function () {
    Notification::fake();

    $agency = createPhase8Agency('agency-admin-reset-success');
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', $agency);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$agencyAdmin->id}/password-reset")
        ->assertOk()
        ->assertJsonPath('data.id', $agencyAdmin->id)
        ->assertJsonPath('data.sent_to', $agencyAdmin->email)
        ->assertJson(fn ($json) => $json->whereType('data.sent_at', 'string')->etc());

    Notification::assertSentTo($agencyAdmin, ResetPassword::class);

    expect(AuditLog::query()
        ->where('event', 'agency_admin_user.password_reset_sent')
        ->where('user_id', $superAdmin->id)
        ->exists())->toBeTrue();
});

test('admin password reset rejects non active agency admin targets without audit', function () {
    Notification::fake();

    $agency = createPhase8Agency('agency-admin-reset-rejected');
    $superAdmin = createPhase8User('super_admin');
    $nonAgencyAdmin = createPhase8User('super_admin');
    $inactiveAgencyAdmin = createPhase8User('agency_admin', $agency);
    $archivedAgencyAdmin = createPhase8User('agency_admin', $agency);

    $inactiveAgencyAdmin->forceFill(['status' => 'inactive'])->save();
    $archivedAgencyAdmin->forceFill(['archived_at' => now()])->save();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$nonAgencyAdmin->id}/password-reset")
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$inactiveAgencyAdmin->id}/password-reset")
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agency-admin-users/{$archivedAgencyAdmin->id}/password-reset")
        ->assertNotFound();

    Notification::assertNothingSent();

    expect(AuditLog::query()
        ->where('event', 'agency_admin_user.password_reset_sent')
        ->exists())->toBeFalse();
});

test('agency admin user creation succeeds when invitation mail cannot be delivered', function () {
    config()->set('mail.default', 'smtp');
    config()->set('mail.mailers.smtp.scheme', 'tls');

    $agency = createPhase8Agency('agency-admin-mail-failure');
    $superAdmin = createPhase8User('super_admin');

    $createdId = $this->actingAs($superAdmin)
        ->postJson('/api/admin/agency-admin-users', [
            'full_name' => 'Invite Failure Admin',
            'email' => 'invite-failure-admin@example.test',
            'agency_id' => $agency->id,
            'status' => 'active',
            'temporary_password' => 'temporary-password',
            'send_invite' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('message', 'Agency admin user created, but the invitation email could not be sent.')
        ->assertJsonPath('meta.invite_sent', false)
        ->assertJsonPath('meta.invite_message', 'Invitation email could not be delivered.')
        ->json('data.id');

    $createdUser = User::query()->findOrFail($createdId);

    expect($createdUser->email)->toBe('invite-failure-admin@example.test')
        ->and($createdUser->isAgencyAdmin())->toBeTrue();
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

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/agencies', [
            'name' => 'Relational Agency Management Office Updated',
            'short_name' => 'RAMOU',
            'type' => 'research-consortium',
            'description' => 'Replacement agency after archive.',
            'website' => 'https://replacement-ramou.example.test',
            'email' => 'contact@replacement-ramou.example.test',
            'address' => 'Davao City',
            'status' => 'active',
            'agency_admin_id' => null,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Relational Agency Management Office Updated')
        ->assertJsonPath('data.short_name', 'RAMOU');
});

test('agency management rejects ineligible admins without partial agency writes', function () {
    $superAdmin = createPhase8User('super_admin');
    $agency = createPhase8Agency('atomic-agency');
    $existingAdmin = createPhase8User('agency_admin', $agency);
    $inactiveAdmin = createPhase8User('agency_admin');
    $inactiveAdmin->forceFill(['status' => 'inactive'])->save();
    $agencyCount = Agency::query()->count();

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/agencies', [
            'name' => 'Should Not Be Created',
            'short_name' => 'SNBC',
            'type' => 'government-agency',
            'status' => 'active',
            'agency_admin_id' => $inactiveAdmin->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('agency_admin_id');

    expect(Agency::query()->count())->toBe($agencyCount)
        ->and(Agency::query()->where('short_name', 'SNBC')->exists())->toBeFalse();

    $this->actingAs($superAdmin)
        ->patchJson("/api/admin/agencies/{$agency->id}", [
            'name' => 'Partially Updated Name',
            'short_name' => $agency->short_name,
            'type' => 'research-consortium',
            'status' => 'inactive',
            'agency_admin_id' => $inactiveAdmin->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('agency_admin_id');

    expect($agency->fresh()->name)->not->toBe('Partially Updated Name')
        ->and($agency->fresh()->status)->toBe('active')
        ->and($existingAdmin->fresh()->agency_id)->toBe($agency->id);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agencies/{$agency->id}/assign-admin", [
            'admin_user_id' => $inactiveAdmin->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('admin_user_id');

    expect($existingAdmin->fresh()->agency_id)->toBe($agency->id)
        ->and($inactiveAdmin->fresh()->agency_id)->toBeNull();
});

test('agency management list provides complete server pagination filters and summary', function () {
    $superAdmin = createPhase8User('super_admin');

    foreach (range(1, 12) as $index) {
        $agency = createPhase8Agency("pagination-agency-{$index}");

        if ($index === 12) {
            $agency->forceFill(['status' => 'inactive'])->save();
        }
    }

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/agencies?per_page=3&page=2&keyword=pagination&type=government-agency&status=active')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.pagination.current_page', 2)
        ->assertJsonPath('meta.pagination.per_page', 3)
        ->assertJsonPath('meta.pagination.total', 11)
        ->assertJsonPath('meta.pagination.last_page', 4)
        ->assertJsonPath('meta.summary.total_agencies', 12)
        ->assertJsonPath('meta.summary.active_agencies', 11)
        ->assertJsonPath('meta.summary.inactive_agencies', 1);
});

test('admin notification list can return an exact unread total for the shared dashboard badge', function () {
    $superAdmin = createPhase8User('super_admin');

    SystemNotification::query()->create([
        'user_id' => $superAdmin->id,
        'type' => 'system.update',
        'title' => 'Unread notification',
        'message' => 'Unread.',
        'priority' => 'normal',
        'status' => 'unread',
    ]);
    SystemNotification::query()->create([
        'user_id' => $superAdmin->id,
        'type' => 'system.update',
        'title' => 'Read notification',
        'message' => 'Read.',
        'priority' => 'normal',
        'status' => 'read',
        'read_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/system-activity/notifications?status=unread&per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Unread notification')
        ->assertJsonPath('meta.pagination.total', 1);
});

test('system activity and security session APIs read relational data', function () {
    config(['session.driver' => 'database']);

    $superAdmin = createPhase8User('super_admin');
    $agency = createPhase8Agency('activity-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);

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
    DB::table('sessions')->insert([
        'id' => 'phase8-agency-admin-session',
        'user_id' => $agencyAdmin->id,
        'ip_address' => '127.0.0.2',
        'user_agent' => 'Feature test agency browser',
        'payload' => '',
        'last_activity' => now()->subMinutes(20)->timestamp,
    ]);

    SecurityEvent::query()->create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
        'event_type' => 'login.failed',
        'severity' => 'medium',
        'created_at' => now(),
    ]);
    SecurityEvent::query()->create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
        'event_type' => 'account.locked',
        'severity' => 'high',
        'resolved_at' => now(),
        'created_at' => now(),
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
        ->assertJsonFragment(['id' => 'phase8-admin-session'])
        ->assertJsonFragment(['id' => 'phase8-agency-admin-session']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/security/summary')
        ->assertOk()
        ->assertJsonPath('data.mfa_enabled_admin_accounts', 1)
        ->assertJsonPath('data.mfa_eligible_admin_accounts', 2)
        ->assertJsonPath('data.failed_login_attempts', 1)
        ->assertJsonPath('data.locked_accounts', 0)
        ->assertJsonPath('data.active_admin_sessions', 1)
        ->assertJsonPath('data.security_alerts', 1);

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/phase8-admin-session')
        ->assertOk();

    expect(DB::table('sessions')->where('id', 'phase8-admin-session')->exists())->toBeFalse();
});

test('admin research moderation duplicate and activity APIs are database backed', function () {
    $agency = createPhase8Agency('moderation-connected-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $original = createPhase8Research($agency, $agencyAdmin);
    $matching = createPhase8Research($agency, $agencyAdmin);

    $original->forceFill([
        'title' => 'Renewable Energy Roadmap for Local Governments',
        'authors' => ['RIKMS Tester', 'Policy Analyst'],
        'publication_year' => 2026,
        'status' => 'published',
    ])->save();
    $matching->forceFill([
        'title' => 'Renewable Energy Roadmap for Local Governments',
        'authors' => ['Policy Analyst'],
        'publication_year' => 2026,
        'status' => 'submitted',
    ])->save();

    AuditLog::query()->create([
        'user_id' => $superAdmin->id,
        'event' => 'research.approved',
        'auditable_type' => $original->getMorphClass(),
        'auditable_id' => $original->id,
        'created_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research-moderation/duplicates')
        ->assertOk()
        ->assertJsonPath('data.0.original_research_id', $original->id)
        ->assertJsonPath('data.0.matching_research_id', $matching->id)
        ->assertJsonPath('data.0.matchingTitle', 'Renewable Energy Roadmap for Local Governments');

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research-moderation/activity')
        ->assertOk()
        ->assertJsonPath('data.0.type', 'approved')
        ->assertJsonPath('data.0.researchTitle', 'Renewable Energy Roadmap for Local Governments');

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/research-moderation/duplicates/dismiss', [
            'original_research_id' => $original->id,
            'matching_research_id' => $matching->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.pair_key', "{$original->id}:{$matching->id}");

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research-moderation/duplicates')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->assertDatabaseHas('audit_logs', ['event' => 'research.duplicate.dismissed']);

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/research-moderation/duplicates/dismiss', [
            'original_research_id' => $original->id,
            'matching_research_id' => $matching->id,
        ])
        ->assertConflict();
});

test('published duplicate research can be flagged without changing publication status', function () {
    $agency = createPhase8Agency('duplicate-flag-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $original = createPhase8Research($agency, $agencyAdmin);
    $matching = createPhase8Research($agency, $agencyAdmin);

    $original->forceFill([
        'title' => 'Blockchain Technology Security and Healthcare Applications',
        'authors' => ['Research Author'],
        'publication_year' => 2026,
        'status' => 'published',
    ])->save();
    $matching->forceFill([
        'title' => 'Blockchain Technology Security and Healthcare Applications',
        'authors' => ['Research Author'],
        'publication_year' => 2026,
        'status' => 'published',
    ])->save();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research-moderation/duplicates')
        ->assertOk()
        ->assertJsonPath('data.0.originalStatus', 'published')
        ->assertJsonPath('data.0.matchingStatus', 'published');

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/research-moderation/duplicates/flag', [
            'original_research_id' => $original->id,
            'matching_research_id' => $matching->id,
            'notes' => 'The exact-title match requires a manual authorship review.',
        ])
        ->assertOk()
        ->assertJsonPath('data.pair_key', "{$original->id}:{$matching->id}")
        ->assertJsonPath('data.matching_research_id', $matching->id);

    expect($original->fresh()->status)->toBe('published')
        ->and($matching->fresh()->status)->toBe('published');

    $this->assertDatabaseHas('research_approvals', [
        'research_id' => $matching->id,
        'reviewed_by' => $superAdmin->id,
        'status' => 'flagged',
        'issue_type' => 'possible_duplicate',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'event' => 'research.duplicate.flagged',
        'auditable_id' => $matching->id,
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research-moderation/duplicates')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research?moderation=1&moderation_status=flagged&issue_type=possible_duplicate')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matching->id)
        ->assertJsonPath('data.0.status', 'published')
        ->assertJsonPath('data.0.moderation_decision_status', 'flagged')
        ->assertJsonPath('data.0.moderation_issue_type', 'possible_duplicate');

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/research-moderation/duplicates/flag', [
            'original_research_id' => $original->id,
            'matching_research_id' => $matching->id,
            'notes' => 'This duplicate pair should not be reviewed twice.',
        ])
        ->assertConflict();
});

test('research moderation list and export apply complete server-side filters', function () {
    $agency = createPhase8Agency('moderation-filter-agency');
    $otherAgency = createPhase8Agency('moderation-filter-other');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $otherAdmin = createPhase8User('agency_admin', $otherAgency);
    $superAdmin = createPhase8User('super_admin');
    $matching = createPhase8Research($agency, $agencyAdmin);
    $matching->forceFill([
        'title' => 'Sensitive Records Policy Review',
        'status' => 'rejected',
        'publication_year' => 2025,
    ])->save();
    ResearchApproval::query()->create([
        'research_id' => $matching->id,
        'reviewed_by' => $superAdmin->id,
        'status' => 'rejected',
        'issue_type' => 'policy_noncompliance',
        'remarks' => 'Policy evidence is incomplete.',
        'reviewed_at' => now(),
    ]);
    $excluded = createPhase8Research($otherAgency, $otherAdmin);
    $excluded->forceFill([
        'title' => 'Unrelated Approved Research',
        'status' => 'approved',
        'publication_year' => 2026,
    ])->save();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/research?moderation=1&per_page=1&moderation_status=flagged&issue_type=policy_noncompliance&agency='.$agency->id.'&year=2025&keyword=Sensitive%20Records')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matching->id)
        ->assertJsonPath('data.0.moderation_issue_type', 'policy_noncompliance')
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('meta.summary.flagged_research_records', 1)
        ->assertJsonPath('meta.summary.pending_review', 0)
        ->assertJsonPath('meta.summary.resolved_issues', 0);

    $export = $this->actingAs($superAdmin)
        ->get('/api/admin/reports/moderation/export?search=Sensitive%20Records&agency='.$agency->id.'&publicationYear=2025&moderation_status=flagged&issue_type=policy_noncompliance');

    $export->assertOk();
    expect($export->streamedContent())->toContain('Sensitive Records Policy Review')
        ->not->toContain('Unrelated Approved Research');

    $unrelated = createPhase8Research($agency, $agencyAdmin);
    $unrelated->forceFill(['title' => 'Entirely Different Record', 'status' => 'submitted'])->save();

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/research-moderation/duplicates/dismiss', [
            'original_research_id' => $matching->id,
            'matching_research_id' => $unrelated->id,
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

test('platform settings bulk update creates page settings and logo upload stores a public file', function () {
    Storage::fake('public');

    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('platform-logo-agency'));
    $superAdmin = createPhase8User('super_admin');

    $payload = [
        'settings' => [
            'site.name' => 'RIKMS Pilot',
            'site.short_name' => 'RIKMS',
            'uploads.allowed_file_types' => ['PDF', 'DOCX'],
            'security.failed_login_threshold' => 5,
            'maintenance.enabled' => false,
            'backup.frequency' => 'Daily at 03:00 AM',
        ],
    ];

    $this->actingAs($agencyAdmin)
        ->postJson('/api/admin/platform-settings/bulk-update', $payload)
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson('/api/admin/platform-settings/bulk-update', $payload)
        ->assertOk()
        ->assertJsonPath('meta.updated_count', 6)
        ->assertJsonFragment(['key' => 'site.short_name', 'value' => 'RIKMS'])
        ->assertJsonFragment(['key' => 'uploads.allowed_file_types', 'value' => '["PDF","DOCX"]']);

    $this->actingAs($superAdmin)
        ->post('/api/admin/platform-settings/logo', [
            'logo' => UploadedFile::fake()->image('rikms-logo.png', 128, 128),
        ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('data.file_name', 'rikms-logo.png')
        ->assertJson(fn ($json) => $json->whereType('data.logo_url', 'string')->etc());

    Storage::disk('public')->assertExists(
        collect(Storage::disk('public')->files('platform/logos'))->first(),
    );

    expect(AuditLog::query()->where('event', 'platform_settings.bulk_updated')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('event', 'platform_setting.logo_uploaded')->exists())->toBeTrue();
});

test('security center actions resolve reopen and audit security events', function () {
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('security-agency'));
    $superAdmin = createPhase8User('super_admin');
    $event = SecurityEvent::query()->create([
        'event_type' => 'login_failed',
        'severity' => 'high',
        'ip_address' => '203.0.113.24',
        'user_agent' => 'Feature test browser',
        'metadata' => ['description' => 'Repeated failed login attempts.'],
        'created_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/security/events')
        ->assertOk()
        ->assertJsonPath('data.0.ip_address', '203.0.113.24')
        ->assertJsonPath('data.0.user_agent', 'Feature test browser');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/resolve")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/acknowledge")
        ->assertOk()
        ->assertJsonPath('data.id', $event->id);

    expect($event->fresh()->acknowledged_at)->not->toBeNull();
    expect(AuditLog::query()->where('event', 'security_event.acknowledged')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/resolve")
        ->assertOk()
        ->assertJsonPath('data.id', $event->id);

    expect($event->fresh()->resolved_at)->not->toBeNull();
    expect(AuditLog::query()->where('event', 'security_event.resolved')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/security/events/{$event->id}/reopen")
        ->assertOk();

    expect($event->fresh()->resolved_at)->toBeNull()
        ->and($event->fresh()->acknowledged_at)->toBeNull();
    expect(AuditLog::query()->where('event', 'security_event.reopened')->exists())->toBeTrue();
});

test('system research uses server filters pagination view counts and matching exports', function () {
    $agency = createPhase8Agency('system-research-agency');
    $otherAgency = createPhase8Agency('system-research-other-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $otherAdmin = createPhase8User('agency_admin', $otherAgency);
    $superAdmin = createPhase8User('super_admin');
    $matching = createPhase8Research($agency, $agencyAdmin);
    $matching->forceFill([
        'title' => 'Distinctive Climate Terminal Report',
        'publication_year' => null,
        'status' => 'submitted',
    ])->save();
    $excluded = createPhase8Research($otherAgency, $otherAdmin);
    $excluded->forceFill(['title' => 'Unrelated Agricultural Study'])->save();

    ResearchFile::query()->create([
        'research_id' => $matching->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'terminal-report.pdf',
        'stored_name' => 'terminal-report.pdf',
        'disk' => 'local',
        'path' => "research/{$matching->id}/terminal-report.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', 'system-research-terminal-report'),
        'file_type' => 'terminal-report',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    foreach (range(1, 2) as $index) {
        ResearchAnalyticsEvent::query()->create([
            'research_id' => $matching->id,
            'agency_id' => $agency->id,
            'user_id' => $superAdmin->id,
            'event_type' => 'view',
            'source' => 'admin',
            'session_hash' => "system-research-view-{$index}",
            'occurred_at' => now(),
        ]);
    }

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/research?per_page=1&agency={$agency->id}&status=submitted&document_type=terminal-report&keyword=Distinctive%20Climate")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matching->id)
        ->assertJsonPath('data.0.publication_year', null)
        ->assertJsonPath('data.0.document_type', 'terminal-report')
        ->assertJsonPath('data.0.views', 2)
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('meta.summary.total_records', 1)
        ->assertJsonPath('meta.summary.under_review', 1)
        ->assertJsonPath('meta.summary.total_views', 2)
        ->assertJsonFragment(['years' => ['2026']]);

    $export = $this->actingAs($superAdmin)
        ->get("/api/admin/reports/research/export?search=Distinctive%20Climate&agency={$agency->id}&status=submitted&documentType=terminal-report");

    $export->assertOk();
    expect($export->streamedContent())->toContain('Distinctive Climate Terminal Report')
        ->not->toContain('Unrelated Agricultural Study');
});

test('admin analytics use relational counts and protected exports write audit logs', function () {
    $agency = createPhase8Agency('analytics-agency');
    $agencyAdmin = createPhase8User('agency_admin', $agency);
    $superAdmin = createPhase8User('super_admin');
    $research = createPhase8Research($agency, $agencyAdmin);
    $file = ResearchFile::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'analytics-policy-brief.pdf',
        'stored_name' => 'analytics-policy-brief.pdf',
        'disk' => 'local',
        'path' => 'research/'.$research->id.'/analytics-policy-brief.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', 'analytics-policy-brief'),
        'file_type' => 'policy_brief',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    ResearchAnalyticsEvent::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'user_id' => $superAdmin->id,
        'event_type' => 'view',
        'source' => 'admin',
        'occurred_at' => now(),
    ]);
    ResearchAnalyticsEvent::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'user_id' => $superAdmin->id,
        'research_file_id' => $file->id,
        'event_type' => 'download',
        'source' => 'admin',
        'occurred_at' => now(),
    ]);

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
        ->assertJsonPath('data.metrics.2.value', 7)
        ->assertJsonPath('data.metrics.3.value', 1)
        ->assertJsonPath('data.accessRequestStatus.approved', 1)
        ->assertJsonPath('data.mostAccessedResearch.0.views', 1)
        ->assertJsonFragment([
            'month' => now()->format('M'),
            'repositoryViews' => 1,
            'downloads' => 1,
            'accessRequests' => 1,
        ])
        ->assertJsonFragment(['value' => 'SDG 16', 'label' => 'SDG 16'])
        ->assertJsonFragment(['documentTypes' => ['policy_brief']]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/overview?documentType=policy_brief&sdg=SDG%2016')
        ->assertOk()
        ->assertJsonPath('data.metrics.0.value', 1)
        ->assertJsonPath('data.metrics.3.value', 1);

    $this->actingAs($superAdmin)
        ->get('/api/admin/reports/research/export')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $pdf = $this->actingAs($superAdmin)
        ->get('/api/admin/reports/research/export?format=pdf');

    $pdf->assertOk()
        ->assertHeader('content-type', 'application/pdf');
    expect($pdf->getContent())->toStartWith('%PDF-');

    expect(AuditLog::query()->where('event', 'report.exported')->exists())->toBeTrue();
});

test('shared admin notification state is isolated per user and cleared notifications stay hidden', function () {
    $firstAdmin = createPhase8User('super_admin');
    $secondAdmin = createPhase8User('super_admin');
    $notification = SystemNotification::query()->create([
        'type' => 'research.moderation_required',
        'title' => 'Shared moderation notice',
        'message' => 'Review this research record.',
        'priority' => 'high',
        'status' => 'unread',
    ]);

    $this->actingAs($firstAdmin)
        ->postJson("/api/admin/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'read');

    $this->actingAs($secondAdmin)
        ->getJson('/api/admin/system-activity/notifications?status=unread')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Shared moderation notice']);

    $this->actingAs($firstAdmin)
        ->postJson('/api/admin/system-activity/notifications/clear', [
            'scope' => 'current-category',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('category');

    $this->actingAs($firstAdmin)
        ->postJson('/api/admin/system-activity/notifications/clear', [
            'scope' => 'current-category',
            'category' => 'research-updates',
        ])
        ->assertOk()
        ->assertJsonPath('data.updated_count', 1);

    $this->actingAs($firstAdmin)
        ->getJson('/api/admin/system-activity/notifications')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($secondAdmin)
        ->getJson('/api/admin/system-activity/notifications')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Shared moderation notice']);
});

test('system activity applies role action and status filters before pagination', function () {
    $superAdmin = createPhase8User('super_admin');
    AuditLog::query()->create(['user_id' => $superAdmin->id, 'event' => 'research.import.failed', 'created_at' => now()]);
    AuditLog::query()->create(['user_id' => $superAdmin->id, 'event' => 'research.import.completed', 'created_at' => now()->subMinute()]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/system-activity/logs?per_page=1&role=Super%20Admin&status=failed&action=research.import.failed')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event', 'research.import.failed')
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonFragment(['actions' => ['research.import.completed', 'research.import.failed']]);
});

test('system analytics date range and agency filter scope all summary metrics', function () {
    $currentAgency = createPhase8Agency('current-analytics-agency');
    $oldAgency = createPhase8Agency('old-analytics-agency');
    $currentAdmin = createPhase8User('agency_admin', $currentAgency);
    $oldAdmin = createPhase8User('agency_admin', $oldAgency);
    $superAdmin = createPhase8User('super_admin');
    $currentResearch = createPhase8Research($currentAgency, $currentAdmin);
    $oldResearch = createPhase8Research($oldAgency, $oldAdmin);
    $oldResearch->forceFill(['created_at' => now()->subYears(2), 'updated_at' => now()->subYears(2)])->saveQuietly();

    AccessRequest::query()->create([
        'research_id' => $currentResearch->id,
        'agency_id' => $currentAgency->id,
        'requester_email' => 'current-analytics@example.test',
        'status' => 'approved',
    ]);
    AccessRequest::query()->create([
        'research_id' => $oldResearch->id,
        'agency_id' => $oldAgency->id,
        'requester_email' => 'old-analytics@example.test',
        'status' => 'pending',
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/overview?date_range=this-year')
        ->assertOk()
        ->assertJsonPath('data.metrics.0.value', 1)
        ->assertJsonPath('data.metrics.1.value', 1)
        ->assertJsonPath('data.metrics.4.value', 1)
        ->assertJsonPath('data.accessRequestStatus.approved', 1)
        ->assertJsonPath('data.accessRequestStatus.pending', 0);
});

test('delegated security managers cannot revoke super admin sessions', function () {
    config(['session.driver' => 'database']);
    $managerRole = createPhase8Role('delegated_security_manager');
    $managerRole->forceFill(['is_system' => false])->save();
    $managerRole->permissions()->sync([
        Permission::query()->firstOrCreate(['slug' => 'security.view'], ['name' => 'Security View', 'display_name' => 'Security View', 'module' => 'security'])->id,
        Permission::query()->firstOrCreate(['slug' => 'security.manage'], ['name' => 'Security Manage', 'display_name' => 'Security Manage', 'module' => 'security'])->id,
    ]);
    $manager = createPhase8User('delegated_security_manager');
    $superAdmin = createPhase8User('super_admin');

    DB::table('sessions')->insert([
        'id' => 'protected-super-admin-session',
        'user_id' => $superAdmin->id,
        'ip_address' => '127.0.0.10',
        'user_agent' => 'Protected browser',
        'payload' => '',
        'last_activity' => now()->timestamp,
    ]);
    DB::table('sessions')->insert([
        'id' => 'custom-admin-session',
        'user_id' => $manager->id,
        'ip_address' => '127.0.0.11',
        'user_agent' => 'Custom admin browser',
        'payload' => '',
        'last_activity' => now()->timestamp,
    ]);

    $this->actingAs($manager)
        ->getJson('/api/admin/security/sessions')
        ->assertOk()
        ->assertJsonFragment(['id' => 'custom-admin-session', 'role' => 'Custom Admin']);

    $this->actingAs($manager)
        ->deleteJson('/api/admin/security/sessions/protected-super-admin-session')
        ->assertForbidden();

    $this->assertDatabaseHas('sessions', ['id' => 'protected-super-admin-session']);
});

test('security event state transitions reject stale repeated actions', function () {
    $superAdmin = createPhase8User('super_admin');
    $event = SecurityEvent::query()->create([
        'event_type' => 'login.failed',
        'severity' => 'high',
        'created_at' => now(),
    ]);

    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/acknowledge")->assertOk();
    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/acknowledge")->assertUnprocessable();
    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/resolve")->assertOk();
    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/resolve")->assertUnprocessable();
    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/reopen")->assertOk();
    $this->actingAs($superAdmin)->postJson("/api/admin/security/events/{$event->id}/reopen")->assertUnprocessable();

    expect(AuditLog::query()->where('event', 'security_event.acknowledged')->count())->toBe(1)
        ->and(AuditLog::query()->where('event', 'security_event.resolved')->count())->toBe(1)
        ->and(AuditLog::query()->where('event', 'security_event.reopened')->count())->toBe(1);
});

test('security reports require security access and honor selected sections', function () {
    $analyticsRole = createPhase8Role('analytics_exporter');
    $analyticsRole->forceFill(['is_system' => false])->save();
    $analyticsRole->permissions()->sync([
        Permission::query()->firstOrCreate(['slug' => 'analytics.export'], ['name' => 'Analytics Export', 'display_name' => 'Analytics Export', 'module' => 'analytics'])->id,
    ]);
    $analyticsUser = createPhase8User('analytics_exporter');

    $this->actingAs($analyticsUser)
        ->get('/api/admin/reports/security/export?format=csv')
        ->assertForbidden();

    $securityRole = createPhase8Role('security_report_viewer');
    $securityRole->forceFill(['is_system' => false])->save();
    $securityRole->permissions()->sync([
        Permission::query()->firstOrCreate(['slug' => 'security.view'], ['name' => 'Security View', 'display_name' => 'Security View', 'module' => 'security'])->id,
    ]);
    $securityUser = createPhase8User('security_report_viewer');

    $response = $this->actingAs($securityUser)
        ->get('/api/admin/security/export?format=csv&date_range=last-7-days&include_summary=1');

    $response->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    expect($response->streamedContent())->toContain('SECURITY SUMMARY')
        ->not->toContain('SECURITY EVENTS');
});
