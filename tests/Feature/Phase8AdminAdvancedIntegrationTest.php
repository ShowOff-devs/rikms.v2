<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification as SystemNotification;
use App\Models\Permission;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
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

test('rbac custom role deletion is backend connected and audited in history', function () {
    $superAdmin = createPhase8User('super_admin');
    $agencyAdmin = createPhase8User('agency_admin', createPhase8Agency('phase8-rbac-delete'));
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

test('system activity and security session APIs read relational data', function () {
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
        ->assertJsonPath('data.locked_accounts', 1)
        ->assertJsonPath('data.active_admin_sessions', 2)
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

    expect(AuditLog::query()->where('event', 'report.exported')->exists())->toBeTrue();
});
