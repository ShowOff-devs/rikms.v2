<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\User;

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

    $this->actingAs($user)
        ->getJson('/api/agency/analytics')
        ->assertOk()
        ->assertJsonPath('data.summaryMetrics.0.value', 1)
        ->assertJsonPath('data.accessRequestBreakdown.pending', 1)
        ->assertJsonPath('data.records.0.title', 'Database Backed Agency Research');
});
