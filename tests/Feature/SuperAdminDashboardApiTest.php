<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\SecurityEvent;
use App\Models\User;

function superAdminDashboardRole(string $slug): Role
{
    return Role::updateOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function superAdminDashboardUser(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        superAdminDashboardRole($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function superAdminDashboardAgency(string $slug, string $status = 'active'): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => $status,
    ]);
}

function superAdminDashboardResearch(Agency $agency, User $user, string $status): Research
{
    return Research::create([
        'slug' => $status.'-research-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => str($status)->replace('_', ' ')->title().' Research',
        'abstract' => 'A database-backed dashboard research record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['dashboard'],
        'status' => $status,
        'access_level' => 'public',
    ]);
}

test('guest cannot access super admin dashboard api', function () {
    $this->getJson('/api/admin/dashboard')
        ->assertUnauthorized()
        ->assertJsonStructure(['message', 'errors']);
});

test('agency admin cannot access super admin dashboard api', function () {
    $agency = superAdminDashboardAgency('agency-admin-dashboard');
    $agencyAdmin = superAdminDashboardUser('agency_admin', $agency);

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/dashboard')
        ->assertForbidden()
        ->assertJsonStructure(['message', 'errors']);
});

test('super admin dashboard api returns database metrics and safe recent records', function () {
    $activeAgency = superAdminDashboardAgency('active-dashboard-agency');
    $inactiveAgency = superAdminDashboardAgency('inactive-dashboard-agency', 'inactive');
    $agencyAdmin = superAdminDashboardUser('agency_admin', $activeAgency);
    $superAdmin = superAdminDashboardUser('super_admin');

    $draft = superAdminDashboardResearch($activeAgency, $agencyAdmin, 'draft');
    superAdminDashboardResearch($activeAgency, $agencyAdmin, 'submitted');
    superAdminDashboardResearch($inactiveAgency, $agencyAdmin, 'under_review');
    superAdminDashboardResearch($activeAgency, $agencyAdmin, 'approved');
    superAdminDashboardResearch($activeAgency, $agencyAdmin, 'published');
    superAdminDashboardResearch($inactiveAgency, $agencyAdmin, 'archived');

    AccessRequest::create([
        'research_id' => $draft->id,
        'agency_id' => $activeAgency->id,
        'requester_name' => 'Policy Researcher',
        'requester_email' => 'policy@example.test',
        'purpose' => 'Policy review',
        'status' => 'pending',
    ]);

    AccessRequest::create([
        'research_id' => $draft->id,
        'agency_id' => $activeAgency->id,
        'requester_name' => 'Approved Researcher',
        'requester_email' => 'approved@example.test',
        'purpose' => 'Approved request',
        'status' => 'approved',
    ]);

    AccessRequest::create([
        'research_id' => $draft->id,
        'agency_id' => $activeAgency->id,
        'requester_name' => 'Denied Researcher',
        'requester_email' => 'denied@example.test',
        'purpose' => 'Denied request',
        'status' => 'denied',
    ]);

    ResearchFile::create([
        'research_id' => $draft->id,
        'agency_id' => $activeAgency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'dashboard.pdf',
        'stored_name' => 'dashboard.pdf',
        'disk' => 'local',
        'path' => 'research/dashboard.pdf',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    Notification::create([
        'user_id' => $superAdmin->id,
        'type' => 'dashboard.notice',
        'title' => 'Dashboard notice',
        'message' => 'Unread dashboard notification.',
        'status' => 'unread',
    ]);

    AuditLog::create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $activeAgency->id,
        'event' => 'research.created',
        'auditable_type' => Research::class,
        'auditable_id' => $draft->id,
        'metadata' => ['target' => $draft->title],
        'created_at' => now(),
    ]);

    SecurityEvent::create([
        'user_id' => $agencyAdmin->id,
        'agency_id' => $activeAgency->id,
        'event_type' => 'login.failed',
        'severity' => 'medium',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($superAdmin)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->assertJsonStructure([
            'message',
            'data' => [
                'metrics',
                'recent_research',
                'recent_agencies',
                'recent_audit_logs',
                'recent_security_events',
                'pending_moderation_items',
                'research_by_agency',
                'research_uploads_by_year',
                'security_status',
            ],
            'meta',
        ])
        ->assertJsonPath('message', 'Admin dashboard loaded successfully.')
        ->assertJsonPath('data.metrics.total_agencies', 2)
        ->assertJsonPath('data.metrics.active_agencies', 1)
        ->assertJsonPath('data.metrics.inactive_agencies', 1)
        ->assertJsonPath('data.metrics.total_users', 2)
        ->assertJsonPath('data.metrics.agency_admin_users', 1)
        ->assertJsonPath('data.metrics.super_admin_users', 1)
        ->assertJsonPath('data.metrics.total_research', 6)
        ->assertJsonPath('data.metrics.draft_research', 1)
        ->assertJsonPath('data.metrics.submitted_research', 1)
        ->assertJsonPath('data.metrics.under_review_research', 1)
        ->assertJsonPath('data.metrics.approved_research', 1)
        ->assertJsonPath('data.metrics.published_research', 1)
        ->assertJsonPath('data.metrics.archived_research', 1)
        ->assertJsonPath('data.metrics.total_access_requests', 3)
        ->assertJsonPath('data.metrics.pending_access_requests', 1)
        ->assertJsonPath('data.metrics.approved_access_requests', 1)
        ->assertJsonPath('data.metrics.denied_access_requests', 1)
        ->assertJsonPath('data.metrics.pending_moderation_count', 2)
        ->assertJsonPath('data.metrics.total_uploads', 1)
        ->assertJsonPath('data.metrics.unread_notifications_count', 1)
        ->assertJsonPath('data.metrics.unresolved_security_events', 1)
        ->assertJsonPath('data.security_status.recent_failed_logins', 1);

    $payload = $response->json('data');

    expect($payload['recent_audit_logs'])->not->toBeEmpty()
        ->and($payload['recent_security_events'])->not->toBeEmpty()
        ->and($payload['recent_audit_logs'][0]['user'])->not->toHaveKeys([
            'password',
            'remember_token',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ])
        ->and($payload['recent_security_events'][0]['user'])->not->toHaveKeys([
            'password',
            'remember_token',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ]);
});
