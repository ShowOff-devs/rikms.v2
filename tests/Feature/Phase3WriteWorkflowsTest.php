<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function createPhase3Agency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase3Role(string $slug): Role
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

function createPhase3User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase3Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase3Research(Agency $agency, User $uploader, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => 'phase-3-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 3 Research',
        'abstract' => 'A Phase 3 write workflow record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 3'],
        'status' => $status,
        'access_level' => 'request_required',
        'submitted_at' => in_array($status, ['submitted', 'under_review', 'approved', 'published'], true) ? now() : null,
        'approved_at' => in_array($status, ['approved', 'published'], true) ? now() : null,
        'published_at' => $status === 'published' ? now() : null,
    ]);
}

test('guest cannot use protected write endpoints', function () {
    $agency = createPhase3Agency('guest-write-agency');
    $user = createPhase3User('agency_admin', $agency);
    $research = createPhase3Research($agency, $user);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Guest Researcher',
        'requester_email' => 'guest@example.test',
        'status' => 'pending',
    ]);

    $this->postJson('/api/agency/research', ['title' => 'Nope'])->assertUnauthorized();
    $this->postJson("/api/agency/research/{$research->id}/files")->assertUnauthorized();
    $this->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")->assertUnauthorized();
    $this->postJson("/api/admin/research/{$research->id}/approve")->assertUnauthorized();
});

test('real agency login session can access authenticated api user endpoint', function () {
    $agency = createPhase3Agency('sanctum-session-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);

    $this->post(route('login.store'), [
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertRedirect(route('agency.dashboard', absolute: false));

    $this->getJson('/api/auth/user')
        ->assertOk()
        ->assertJsonPath('data.id', $agencyAdmin->id)
        ->assertJsonPath('data.role', 'agency_admin');
});

test('real admin login session can access authenticated api user endpoint', function () {
    $superAdmin = createPhase3User('super_admin');

    $this->post(route('login.store'), [
        'email' => $superAdmin->email,
        'password' => 'password',
    ])->assertRedirect(route('admin.dashboard', absolute: false));

    $this->getJson('/api/auth/user')
        ->assertOk()
        ->assertJsonPath('data.id', $superAdmin->id)
        ->assertJsonPath('data.role', 'super_admin');
});

test('authenticated users without agency write role receive forbidden response', function () {
    $user = createPhase3User('public_user');

    $this->actingAs($user)
        ->postJson('/api/agency/research', ['title' => 'Forbidden Draft'])
        ->assertForbidden()
        ->assertJsonStructure(['message', 'errors']);
});

test('agency admin can create update and submit own draft research', function () {
    $agency = createPhase3Agency('draft-agency');
    $user = createPhase3User('agency_admin', $agency);

    $createResponse = $this->actingAs($user)->postJson('/api/agency/research', [
        'title' => 'Davao Region Water Security Study',
        'abstract' => 'Pilot draft metadata.',
        'authors' => ['Ana Santos'],
        'keywords' => ['water', 'resilience'],
        'sdg_tags' => ['SDG 6'],
        'publication_year' => 2026,
        'access_level' => 'request_required',
        'agency_id' => 999999,
    ]);

    $createResponse
        ->assertCreated()
        ->assertJsonStructure(['message', 'data', 'meta'])
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.agency_id', $agency->id);

    $researchId = $createResponse->json('data.id');

    $this->actingAs($user)->patchJson("/api/agency/research/{$researchId}", [
        'category' => 'Environment',
        'keywords' => ['water', 'policy'],
    ])
        ->assertOk()
        ->assertJsonPath('data.category', 'Environment');

    $this->actingAs($user)->postJson("/api/agency/research/{$researchId}/submit", [
        'notes' => 'Ready for review.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    $this->assertDatabaseHas('research', [
        'id' => $researchId,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'status' => 'submitted',
    ]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.created']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.updated']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.submitted']);
});

test('agency admin cannot write research for another agency or submit invalid transition', function () {
    $ownAgency = createPhase3Agency('own-write-agency');
    $otherAgency = createPhase3Agency('other-write-agency');
    $user = createPhase3User('agency_admin', $ownAgency);
    $otherUser = createPhase3User('agency_admin', $otherAgency);
    $publishedResearch = createPhase3Research($ownAgency, $user, 'published');
    $otherResearch = createPhase3Research($otherAgency, $otherUser);

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$otherResearch->id}", ['title' => 'Cross Agency Edit'])
        ->assertForbidden();

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$publishedResearch->id}/submit")
        ->assertForbidden();
});

test('agency admin can upload valid pdf and jobs are queued', function () {
    Storage::fake('local');
    Queue::fake();

    $agency = createPhase3Agency('upload-agency');
    $user = createPhase3User('agency_admin', $agency);
    $research = createPhase3Research($agency, $user);

    $response = $this->actingAs($user)->postJson("/api/agency/research/{$research->id}/files", [
        'file' => UploadedFile::fake()->create('study.pdf', 128, 'application/pdf'),
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.research_id', $research->id)
        ->assertJsonPath('data.status', 'active');

    $fileId = $response->json('data.id');

    $this->assertDatabaseHas('research_files', [
        'id' => $fileId,
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'mime_type' => 'application/pdf',
    ]);

    Queue::assertPushed(ParsePdfDocumentJob::class, fn (ParsePdfDocumentJob $job): bool => $job->researchId === $research->id && $job->fileId === $fileId);
    Queue::assertPushed(ExtractResearchMetadataJob::class);
    Queue::assertPushed(ClassifyResearchSdgJob::class);
});

test('invalid upload file type is rejected and cross agency upload is forbidden', function () {
    Storage::fake('local');

    $ownAgency = createPhase3Agency('invalid-upload-agency');
    $otherAgency = createPhase3Agency('invalid-upload-other-agency');
    $user = createPhase3User('agency_admin', $ownAgency);
    $otherUser = createPhase3User('agency_admin', $otherAgency);
    $ownResearch = createPhase3Research($ownAgency, $user);
    $otherResearch = createPhase3Research($otherAgency, $otherUser);

    $this->actingAs($user)->postJson("/api/agency/research/{$ownResearch->id}/files", [
        'file' => UploadedFile::fake()->create('study.txt', 12, 'text/plain'),
    ])->assertUnprocessable();

    $this->actingAs($user)->postJson("/api/agency/research/{$otherResearch->id}/files", [
        'file' => UploadedFile::fake()->create('study.pdf', 12, 'application/pdf'),
    ])->assertForbidden();
});

test('agency admin can approve and deny pending access requests for own agency', function () {
    $agency = createPhase3Agency('decision-agency');
    $user = createPhase3User('agency_admin', $agency);
    $requester = createPhase3User('public_user');
    $research = createPhase3Research($agency, $user, 'published');
    $approveRequest = AccessRequest::create([
        'research_id' => $research->id,
        'requested_by' => $requester->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Public Researcher',
        'requester_email' => 'public@example.test',
        'purpose' => 'Policy review',
        'status' => 'pending',
    ]);
    $denyRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Second Researcher',
        'requester_email' => 'second@example.test',
        'status' => 'pending',
    ]);

    $this->actingAs($user)->postJson("/api/agency/access-requests/{$approveRequest->id}/approve", [
        'decision_notes' => 'Approved for pilot access.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $this->actingAs($user)->postJson("/api/agency/access-requests/{$denyRequest->id}/deny", [
        'decision_notes' => 'Insufficient purpose.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'denied');

    expect(AuditLog::whereIn('event', ['access_request.approved', 'access_request.denied'])->count())->toBe(2);
    expect(Notification::whereIn('type', ['access_request.approved', 'access_request.denied'])->count())->toBe(2);
});

test('agency admin cannot decide another agency access request', function () {
    $ownAgency = createPhase3Agency('decision-own-agency');
    $otherAgency = createPhase3Agency('decision-other-agency');
    $user = createPhase3User('agency_admin', $ownAgency);
    $otherUser = createPhase3User('agency_admin', $otherAgency);
    $research = createPhase3Research($otherAgency, $otherUser, 'published');
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $otherAgency->id,
        'requester_name' => 'Other Requester',
        'requester_email' => 'other@example.test',
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertForbidden();
});

test('super admin can moderate research and invalid transitions fail', function () {
    $agency = createPhase3Agency('moderation-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $research = createPhase3Research($agency, $agencyAdmin, 'submitted');

    $this->actingAs($superAdmin)->postJson("/api/admin/research/{$research->id}/approve", [
        'notes' => 'Meets moderation requirements.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $this->actingAs($superAdmin)->postJson("/api/admin/research/{$research->id}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', 'published');

    $this->actingAs($superAdmin)->postJson("/api/admin/research/{$research->id}/reject")
        ->assertUnprocessable();

    expect(ResearchApproval::where('research_id', $research->id)->count())->toBe(2);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.approved']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.published']);
    $this->assertDatabaseHas('notifications', ['type' => 'research.approved']);
});

test('admin can archive and restore research while agency lists exclude archived records', function () {
    $agency = createPhase3Agency('archive-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $research = createPhase3Research($agency, $agencyAdmin, 'published');

    $this->actingAs($superAdmin)->postJson("/api/admin/research/{$research->id}/archive", [
        'reason' => 'Superseded by newer study.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');

    $this->actingAs($agencyAdmin)->getJson('/api/agency/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    $this->actingAs($superAdmin)->postJson("/api/admin/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'published');

    $this->assertDatabaseHas('archive_records', [
        'archivable_type' => (new Research)->getMorphClass(),
        'archivable_id' => $research->id,
        'archived_by' => $superAdmin->id,
        'restored_by' => $superAdmin->id,
    ]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.archived']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.restored']);
});
