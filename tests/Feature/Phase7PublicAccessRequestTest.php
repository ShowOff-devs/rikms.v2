<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;

function createPhase7Role(string $slug): Role
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

function createPhase7Agency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase7User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase7Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase7Research(
    Agency $agency,
    User $uploader,
    string $accessLevel = 'restricted',
    string $status = 'published',
): Research {
    return Research::create([
        'slug' => 'phase-7-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 7 Restricted Research',
        'abstract' => 'A public access request test record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 7'],
        'status' => $status,
        'access_level' => $accessLevel,
        'submitted_at' => now(),
        'approved_at' => now(),
        'published_at' => $status === 'published' ? now() : null,
    ]);
}

function phase7PublicPayload(array $overrides = []): array
{
    return array_merge([
        'requester_name' => 'Public Researcher',
        'requester_email' => 'public.researcher@example.test',
        'requester_affiliation' => 'University of Southeastern Mindanao',
        'requester_purpose' => 'Policy analysis for a regional knowledge-sharing study.',
        'message' => 'Please review this access request.',
        'intended_use' => 'Research synthesis and policy briefing.',
    ], $overrides);
}

test('/browse redirects to the implemented research browse page', function () {
    $this->get('/browse')->assertRedirect('/browse-research');
});

test('guest can submit a public access request for restricted research', function () {
    $agency = createPhase7Agency('phase-7-public-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    $response = $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(),
    );

    $response
        ->assertCreated()
        ->assertJsonStructure(['message', 'data', 'meta'])
        ->assertJsonPath('data.research_id', $research->id)
        ->assertJsonPath('data.agency_id', $agency->id)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.requester_affiliation', 'University of Southeastern Mindanao')
        ->assertJsonPath('data.intended_use', 'Research synthesis and policy briefing.');

    $accessRequestId = $response->json('data.id');

    $this->assertDatabaseHas('access_requests', [
        'id' => $accessRequestId,
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_email' => 'public.researcher@example.test',
        'status' => 'pending',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'event' => 'access_request.submitted',
        'auditable_id' => $accessRequestId,
        'agency_id' => $agency->id,
    ]);
    $this->assertDatabaseHas('notifications', [
        'type' => 'access_request.submitted',
        'user_id' => $agencyAdmin->id,
        'agency_id' => $agency->id,
    ]);
});

test('public access request validation and duplicate pending requests are blocked', function () {
    $agency = createPhase7Agency('phase-7-validation-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    $this->postJson("/api/public/research/{$research->slug}/access-requests", [
        'requester_email' => 'not-an-email',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'requester_name',
            'requester_email',
            'requester_purpose',
        ]);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(),
    )->assertCreated();

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(),
    )
        ->assertStatus(409)
        ->assertJsonStructure(['message', 'errors']);
});

test('public access requests are rejected for public archived or deleted research', function () {
    $agency = createPhase7Agency('phase-7-rejected-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $publicResearch = createPhase7Research($agency, $agencyAdmin, 'public');
    $archivedResearch = createPhase7Research($agency, $agencyAdmin);
    $deletedResearch = createPhase7Research($agency, $agencyAdmin);

    $archivedResearch->forceFill([
        'status' => 'archived',
        'archived_at' => now(),
    ])->save();
    $deletedResearch->delete();

    $this->postJson(
        "/api/public/research/{$publicResearch->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'public-level@example.test']),
    )->assertUnprocessable();

    $this->postJson(
        "/api/public/research/{$archivedResearch->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'archived@example.test']),
    )->assertUnprocessable();

    $this->postJson(
        "/api/public/research/{$deletedResearch->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'deleted@example.test']),
    )->assertNotFound();
});

test('agency admin can see and decide the public request for own agency only', function () {
    $ownAgency = createPhase7Agency('phase-7-own-agency');
    $otherAgency = createPhase7Agency('phase-7-other-agency');
    $ownAdmin = createPhase7User('agency_admin', $ownAgency);
    $otherAdmin = createPhase7User('agency_admin', $otherAgency);
    $ownResearch = createPhase7Research($ownAgency, $ownAdmin);
    $otherResearch = createPhase7Research($otherAgency, $otherAdmin);

    $created = $this->postJson(
        "/api/public/research/{$ownResearch->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'own-agency@example.test']),
    )->assertCreated();

    $ownRequestId = $created->json('data.id');
    $otherRequest = AccessRequest::create([
        'research_id' => $otherResearch->id,
        'agency_id' => $otherAgency->id,
        'requester_name' => 'Other Requester',
        'requester_email' => 'other-agency@example.test',
        'purpose' => 'Cross agency request',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($ownAdmin)
        ->getJson('/api/agency/access-requests?per_page=100')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.id', $ownRequestId);

    $this->actingAs($ownAdmin)
        ->postJson("/api/agency/access-requests/{$ownRequestId}/approve", [
            'decision_notes' => 'Approved after Phase 7 browser QA.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $this->actingAs($ownAdmin)
        ->postJson("/api/agency/access-requests/{$otherRequest->id}/deny", [
            'decision_notes' => 'Should be forbidden.',
        ])
        ->assertForbidden();

    expect(AuditLog::where('event', 'access_request.approved')->count())->toBe(1);
    expect(Notification::where('type', 'access_request.approved')->count())->toBe(1);
});
