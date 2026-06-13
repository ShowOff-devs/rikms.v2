<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

function agencyPortalApiAgency(): Agency
{
    return Agency::create([
        'slug' => 'agency-portal-api-'.str()->random(6),
        'name' => 'Agency Portal API',
        'short_name' => 'APA',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function agencyPortalApiUser(Agency $agency): User
{
    return User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
}

test('agency profile settings and analytics endpoints are database backed', function () {
    $agency = agencyPortalApiAgency();
    $user = agencyPortalApiUser($agency);

    $research = Research::create([
        'slug' => 'agency-portal-api-research-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Database Backed Agency Research',
        'abstract' => 'A real API-backed agency research record.',
        'authors' => ['Agency Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['agency api'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 7,
    ]);

    AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Research User',
        'requester_email' => 'researcher@example.test',
        'purpose' => 'Validation',
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->getJson('/api/agency/profile')
        ->assertOk()
        ->assertJsonPath('data.id', (string) $agency->id)
        ->assertJsonPath('data.researchSummary.totalResearchPublications', 1);

    $this->actingAs($user)
        ->patchJson('/api/agency/profile', [
            'agencyName' => 'Updated Agency Portal API',
            'agencyShortName' => 'UAPA',
            'agencyDescription' => 'Updated from the agency profile API.',
            'agencyWebsite' => 'https://agency.example.test',
            'agencyContactEmail' => 'agency@example.test',
            'agencyOfficeAddress' => 'Davao City',
        ])
        ->assertOk()
        ->assertJsonPath('data.shortName', 'UAPA');

    $this->actingAs($user)
        ->getJson('/api/agency/settings')
        ->assertOk()
        ->assertJsonPath('data.account.emailAddress', $user->email);

    $this->actingAs($user)
        ->patchJson('/api/agency/settings/notifications', [
            'notifyNewAccessRequests' => true,
            'notifyRequestApprovalsDenials' => true,
            'notifyNewResearchUploads' => false,
            'browserNotifications' => false,
            'weeklyDigest' => true,
            'monthlyAnalyticsReport' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.notifyNewResearchUploads', false);

    expect($user->fresh()->notification_preferences['notifyNewResearchUploads'])->toBeFalse();

    $this->actingAs($user)
        ->patchJson('/api/agency/settings/account', [
            'fullName' => 'Updated Agency Admin',
            'emailAddress' => 'updated-agency-admin@example.test',
        ])
        ->assertOk()
        ->assertJsonPath('data.fullName', 'Updated Agency Admin')
        ->assertJsonPath('data.emailAddress', 'updated-agency-admin@example.test');

    expect($user->fresh()->email)->toBe('updated-agency-admin@example.test');

    $this->actingAs($user)
        ->postJson('/api/agency/settings/password', [
            'currentPassword' => 'password',
            'newPassword' => 'NewSecurePassword123!',
            'newPassword_confirmation' => 'NewSecurePassword123!',
        ])
        ->assertOk()
        ->assertJsonPath('data.success', true);

    expect(Hash::check('NewSecurePassword123!', $user->fresh()->password))->toBeTrue();

    $user->forceFill([
        'security_preferences' => [
            'twoFactorEnabled' => true,
            'sessionTimeout' => 45,
        ],
    ])->save();

    $this->actingAs($user)
        ->getJson('/api/agency/settings')
        ->assertOk()
        ->assertJsonPath('data.security.twoFactorEnabled', false)
        ->assertJsonPath('data.security.sessionTimeout', 45);

    $this->actingAs($user)
        ->patchJson('/api/agency/settings/security', [
            'sessionTimeout' => 20,
        ])
        ->assertOk()
        ->assertJsonPath('data.twoFactorEnabled', false)
        ->assertJsonPath('data.sessionTimeout', 20);

    expect($user->fresh()->security_preferences)->toBe(['sessionTimeout' => 20]);

    $this->actingAs($user)
        ->postJson('/api/agency/settings/deactivation-request')
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    expect($user->fresh()->deactivation_requested_at)->not->toBeNull()
        ->and(AuditLog::query()->where('event', 'agency.deactivation_requested')->exists())->toBeTrue();

    $this->actingAs($user)
        ->getJson('/api/agency/analytics')
        ->assertOk()
        ->assertJsonPath('data.summaryMetrics.0.value', 1)
        ->assertJsonPath('data.accessRequestBreakdown.pending', 1)
        ->assertJsonPath('data.records.0.title', 'Database Backed Agency Research');
});

test('agency settings reports confirmed two factor state from fortify fields', function () {
    $agency = agencyPortalApiAgency();
    $user = User::factory()->withTwoFactor()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
        'security_preferences' => ['sessionTimeout' => 30],
    ]);

    $this->actingAs($user)
        ->getJson('/api/agency/settings')
        ->assertOk()
        ->assertJsonPath('data.security.twoFactorEnabled', true);
});

test('agency admin can revoke only their own non-current settings sessions', function () {
    config(['session.driver' => 'database']);

    $agency = agencyPortalApiAgency();
    $user = agencyPortalApiUser($agency);
    $otherUser = agencyPortalApiUser($agency);

    DB::table('sessions')->insert([
        [
            'id' => 'owned-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 Chrome Windows',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'other-session',
            'user_id' => $otherUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 Firefox Windows',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ],
    ]);

    $this->actingAs($user)
        ->deleteJson('/api/agency/settings/sessions/other-session')
        ->assertNotFound();

    expect(DB::table('sessions')->where('id', 'other-session')->exists())->toBeTrue();

    $this->actingAs($user)
        ->deleteJson('/api/agency/settings/sessions/owned-session')
        ->assertOk()
        ->assertJsonPath('data.id', 'owned-session');

    expect(DB::table('sessions')->where('id', 'owned-session')->exists())->toBeFalse()
        ->and(AuditLog::query()->where('event', 'agency_session.revoked')->exists())->toBeTrue();
});

test('agency session timeout preference expires stale web sessions', function () {
    $agency = agencyPortalApiAgency();
    $user = agencyPortalApiUser($agency);

    $user->forceFill([
        'security_preferences' => ['sessionTimeout' => 5],
    ])->save();

    $this->actingAs($user)
        ->withSession(['rikms_last_activity_at' => now()->subMinutes(6)->timestamp])
        ->get('/agency/settings')
        ->assertRedirect('/agency/login');

    $this->assertGuest();
});

test('agency notification preferences control access decisions and research upload alerts', function () {
    $agency = agencyPortalApiAgency();
    $mutedAdmin = agencyPortalApiUser($agency);
    $subscribedAdmin = agencyPortalApiUser($agency);

    $mutedAdmin->forceFill([
        'notification_preferences' => [
            'notifyRequestApprovalsDenials' => false,
            'notifyNewResearchUploads' => false,
        ],
    ])->save();

    $subscribedAdmin->forceFill([
        'notification_preferences' => [
            'notifyRequestApprovalsDenials' => true,
            'notifyNewResearchUploads' => true,
        ],
    ])->save();

    $research = Research::create([
        'slug' => 'agency-settings-preferences-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $mutedAdmin->id,
        'title' => 'Preference Controlled Research',
        'abstract' => 'A research record for notification preference coverage.',
        'authors' => ['Agency Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['preferences'],
        'status' => 'published',
        'access_level' => 'restricted',
    ]);

    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Preference Tester',
        'requester_email' => 'preference-tester@example.test',
        'purpose' => 'Testing notifications',
        'status' => 'pending',
    ]);

    $this->actingAs($mutedAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve", [
            'decision_notes' => 'Approved for preference coverage.',
        ])
        ->assertOk();

    $this->assertDatabaseMissing('notifications', [
        'user_id' => $mutedAdmin->id,
        'type' => 'agency_access_request.approved',
    ]);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $subscribedAdmin->id,
        'type' => 'agency_access_request.approved',
    ]);

    Notification::query()->delete();

    $this->actingAs($mutedAdmin)
        ->postJson('/api/agency/research', [
            'title' => 'Preference Controlled Upload',
            'abstract' => 'A new research upload notification preference test.',
            'authors' => ['Agency Tester'],
            'publication_year' => 2026,
            'category' => 'Public Governance',
            'sdgs' => ['SDG 16'],
            'keywords' => ['upload preference'],
            'access_level' => 'request_required',
        ])
        ->assertCreated();

    $this->assertDatabaseMissing('notifications', [
        'user_id' => $mutedAdmin->id,
        'type' => 'research.created',
    ]);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $subscribedAdmin->id,
        'type' => 'research.created',
    ]);
});
