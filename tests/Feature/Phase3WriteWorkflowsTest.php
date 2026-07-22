<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\Role;
use App\Models\User;
use App\Services\PlatformSettingsService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
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

    if ($role === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('test-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

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
    ])->assertRedirect(route('two-factor.login', absolute: false));

    $this->post(route('two-factor.login'), [
        'recovery_code' => 'recovery-code-1',
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
        'public_metadata_fields' => [
            'title',
            'methodology',
            'results_and_discussion',
        ],
        'public_metadata' => [
            [
                'key' => 'title',
                'label' => 'Title',
                'value' => 'Davao Region Water Security Study',
            ],
            [
                'key' => 'methodology',
                'label' => 'Methodology',
                'value' => 'Mixed-methods regional assessment.',
            ],
            [
                'key' => 'results_and_discussion',
                'label' => 'Results and Discussion',
                'value' => 'Water policy coordination improved.',
            ],
        ],
        'sdg_tags' => ['SDG 6'],
        'publication_year' => 2026,
        'access_level' => 'request_required',
        'agency_id' => 999999,
    ]);

    $createResponse
        ->assertCreated()
        ->assertJsonStructure(['message', 'data', 'meta'])
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.agency_id', $agency->id)
        ->assertJsonPath('data.public_metadata.1.key', 'methodology')
        ->assertJsonPath('data.public_metadata.2.key', 'results_and_discussion')
        ->assertJsonPath('data.public_metadata_fields.2', 'results_and_discussion');

    $researchId = $createResponse->json('data.id');

    $this->actingAs($user)->patchJson("/api/agency/research/{$researchId}", [
        'category' => 'Environment',
        'keywords' => ['water', 'policy'],
        'public_metadata_fields' => ['title', 'abstract'],
        'public_metadata' => [
            [
                'key' => 'title',
                'label' => 'Title',
                'value' => 'Davao Region Water Security Study',
            ],
            [
                'key' => 'abstract',
                'label' => 'Abstract',
                'value' => 'Updated public abstract.',
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.category', 'Environment')
        ->assertJsonPath('data.public_metadata_fields.1', 'abstract');

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
    expect(Research::findOrFail($researchId)->public_metadata)
        ->toMatchArray([
            [
                'key' => 'title',
                'label' => 'Title',
                'value' => 'Davao Region Water Security Study',
            ],
            [
                'key' => 'abstract',
                'label' => 'Abstract',
                'value' => 'Updated public abstract.',
            ],
        ]);
    expect(Research::findOrFail($researchId)->public_metadata_fields)
        ->toBe(['title', 'abstract']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.created']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.updated']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.submitted']);
});

test('agency admin can save long selected public metadata sections', function () {
    $agency = createPhase3Agency('long-public-metadata-agency');
    $user = createPhase3User('agency_admin', $agency);
    $longSection = str_repeat('Long extracted methodology section. ', 900);

    $response = $this->actingAs($user)->postJson('/api/agency/research', [
        'title' => 'Long Public Metadata Draft',
        'abstract' => $longSection,
        'authors' => ['Ana Santos'],
        'public_metadata' => [
            [
                'key' => 'methodology',
                'label' => 'Methodology',
                'value' => $longSection,
            ],
        ],
        'access_level' => 'public',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.public_metadata.0.key', 'methodology');
});

test('agency research draft slug generation skips soft deleted records', function () {
    $agency = createPhase3Agency('soft-deleted-slug-agency');
    $user = createPhase3User('agency_admin', $agency);
    $title = 'Soft Deleted Slug Draft';
    $baseSlug = 'soft-deleted-slug-draft';

    Research::create([
        'slug' => $baseSlug,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => $title,
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);

    $deletedResearch = Research::create([
        'slug' => $baseSlug.'-1',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => $title,
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);
    $deletedResearch->delete();

    $this->actingAs($user)
        ->postJson('/api/agency/research', [
            'title' => $title,
            'access_level' => 'request_required',
        ])
        ->assertCreated()
        ->assertJsonPath('data.slug', $baseSlug.'-2');
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

test('agency admin can create editable draft revision from published research', function () {
    $agency = createPhase3Agency('revision-agency');
    $user = createPhase3User('agency_admin', $agency);
    $research = createPhase3Research($agency, $user, 'published');

    $response = $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/revision");

    $response
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.revision_parent_id', $research->id)
        ->assertJsonPath('data.revision_number', 2);

    $revisionId = $response->json('data.id');

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$revisionId}", [
            'title' => 'Phase 3 Research Updated Revision',
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Phase 3 Research Updated Revision');

    $this->assertDatabaseHas('audit_logs', ['event' => 'research.revision_created']);
});

test('agency research revision slug generation skips soft deleted records', function () {
    $agency = createPhase3Agency('soft-deleted-revision-slug-agency');
    $user = createPhase3User('agency_admin', $agency);
    $research = createPhase3Research($agency, $user, 'published');
    $baseSlug = str($research->title.' revision 2')->slug()->toString();

    $deletedRevision = Research::create([
        'slug' => $baseSlug,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $research->id,
        'revision_number' => 2,
        'title' => $research->title,
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);
    $deletedRevision->delete();

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/revision")
        ->assertCreated()
        ->assertJsonPath('data.slug', $baseSlug.'-1')
        ->assertJsonPath('data.revision_parent_id', $research->id);
});

test('publishing a revision supersedes the previous published version', function () {
    $agency = createPhase3Agency('revision-publish-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $published = createPhase3Research($agency, $agencyAdmin, 'published');

    $revisionId = $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$published->id}/revision")
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$revisionId}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$revisionId}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$revisionId}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', 'published');

    $this->assertDatabaseHas('research', [
        'id' => $published->id,
        'status' => 'superseded',
        'superseded_by_id' => $revisionId,
    ]);
    $this->assertDatabaseHas('research', [
        'id' => $revisionId,
        'status' => 'published',
        'revision_parent_id' => $published->id,
    ]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'research.superseded']);
});

test('agency admin can upload valid pdf and jobs are queued', function () {
    Storage::fake('local');
    Bus::fake();
    $service = app(PlatformSettingsService::class);
    $definition = $service->definition(PlatformSettingsService::AI_PROCESSING_ENABLED);

    PlatformSetting::updateOrCreate(
        ['key' => PlatformSettingsService::AI_PROCESSING_ENABLED],
        [
            'value' => 'true',
            'type' => 'boolean',
            'group' => $definition['group'] ?? 'ai',
            'label' => $definition['label'] ?? 'AI Processing Enabled',
            'is_public' => false,
            'is_encrypted' => false,
        ],
    );
    $service->forgetCache();

    $agency = createPhase3Agency('upload-agency');
    $user = createPhase3User('agency_admin', $agency);
    $research = createPhase3Research($agency, $user);

    $response = $this->actingAs($user)->postJson("/api/agency/research/{$research->id}/files", [
        'file' => testPdfUpload('study.pdf', 128),
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

    Bus::assertChained([
        new ParsePdfDocumentJob($research->id, $fileId, $agency->id, $user->id),
        new ExtractResearchMetadataJob($research->id, $fileId, $agency->id, $user->id),
        new ClassifyResearchSdgJob($research->id, $fileId, $agency->id, $user->id),
    ]);
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

    $this->actingAs($user)->postJson("/api/agency/research/{$ownResearch->id}/files", [
        'file' => testPdfUpload('oversized.pdf', 11264),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);

    $this->actingAs($user)->postJson("/api/agency/research/{$otherResearch->id}/files", [
        'file' => testPdfUpload('study.pdf', 12),
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
        'public_denial_reason' => 'Insufficient purpose.',
        'internal_notes' => 'Internal denial note.',
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

test('admin moderation endpoints enforce the official status transition matrix', function () {
    $agency = createPhase3Agency('moderation-matrix-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');

    foreach (['submitted', 'under_review'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/reject", ['notes' => 'Requires additional governance review.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');
    }

    foreach (['approved', 'rejected', 'published'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/archive", ['reason' => 'Archived after documented moderation review.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    foreach (['submitted', 'under_review'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/archive", ['reason' => 'Archive should not be permitted here.'])
            ->assertUnprocessable();

        expect($research->fresh()->status)->toBe($status);
    }

    foreach (['approved', 'rejected', 'published'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/reject", ['notes' => 'Invalid transition attempt.'])
            ->assertUnprocessable();

        expect($research->fresh()->status)->toBe($status);
    }

    foreach (['rejected', 'under_review'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/return", ['notes' => 'Return for documented agency revisions.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    foreach (['approved', 'published', 'submitted'] as $status) {
        $research = createPhase3Research($agency, $agencyAdmin, $status);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/return", ['notes' => 'Invalid transition attempt.'])
            ->assertUnprocessable();

        expect($research->fresh()->status)->toBe($status);
    }
});

test('approve and publish is one protected atomic moderation action', function () {
    $agency = createPhase3Agency('atomic-moderation-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $research = createPhase3Research($agency, $agencyAdmin, 'submitted');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve-and-publish", [
            'notes' => 'Approved for immediate public release.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'published');

    expect($research->fresh()->status)->toBe('published')
        ->and($research->fresh()->approved_at)->not->toBeNull()
        ->and($research->fresh()->published_at)->not->toBeNull()
        ->and(ResearchApproval::where('research_id', $research->id)->count())->toBe(1);

    $this->assertDatabaseHas('audit_logs', [
        'event' => 'research.approved_published',
        'auditable_id' => $research->id,
    ]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve-and-publish")
        ->assertUnprocessable();

    expect(ResearchApproval::where('research_id', $research->id)->count())->toBe(1);
});

test('admin archive moderation requires a meaningful rationale', function () {
    $agency = createPhase3Agency('archive-rationale-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $research = createPhase3Research($agency, $agencyAdmin, 'approved');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/archive")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('reason');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/archive", ['reason' => 'Too short'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('reason');

    expect($research->fresh()->status)->toBe('approved');
});

test('publishing research backfills a missing slug from title', function () {
    $agency = createPhase3Agency('missing-slug-publish-agency');
    $agencyAdmin = createPhase3User('agency_admin', $agency);
    $superAdmin = createPhase3User('super_admin');
    $research = createPhase3Research($agency, $agencyAdmin, 'approved');

    $research->update([
        'slug' => null,
        'title' => 'Legacy Imported Research',
    ]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', 'published')
        ->assertJsonPath('data.slug', 'legacy-imported-research');

    $this->assertDatabaseHas('research', [
        'id' => $research->id,
        'slug' => 'legacy-imported-research',
        'status' => 'published',
    ]);
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
