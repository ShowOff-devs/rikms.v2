<?php

use App\Http\Resources\AccessRequestResource;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AccessRequestApprovedNotification;
use App\Notifications\AccessRequestDeniedNotification;
use App\Services\AccessRequestEmailNotificationService;
use App\Support\AccessRequestEmailNotificationResult;
use App\Support\AccessRequestMailFailureAuditor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

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

test('public access request notifications respect agency admin preferences', function () {
    $agency = createPhase7Agency('phase-7-notification-preferences');
    $mutedAdmin = createPhase7User('agency_admin', $agency);
    $notifiedAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $mutedAdmin);

    $mutedAdmin->forceFill([
        'notification_preferences' => ['notifyNewAccessRequests' => false],
    ])->save();

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'preferences@example.test']),
    )->assertCreated();

    $this->assertDatabaseMissing('notifications', [
        'type' => 'access_request.submitted',
        'user_id' => $mutedAdmin->id,
    ]);
    $this->assertDatabaseHas('notifications', [
        'type' => 'access_request.submitted',
        'user_id' => $notifiedAdmin->id,
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

test('public access request duplicate checks normalize requester email', function () {
    $agency = createPhase7Agency('phase-7-normalized-duplicate-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => ' Public.Researcher@Example.Test ']),
    )->assertCreated();

    $this->assertDatabaseHas('access_requests', [
        'research_id' => $research->id,
        'requester_email' => 'public.researcher@example.test',
        'status' => 'pending',
    ]);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'public.researcher@example.test']),
    )
        ->assertStatus(409)
        ->assertJsonPath('errors.code', 'ACCESS_REQUEST_ALREADY_PENDING');
});

test('denied public access request may be resubmitted when no active duplicate exists', function () {
    $agency = createPhase7Agency('phase-7-resubmit-denied-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Denied Researcher',
        'requester_email' => 'retry@example.test',
        'purpose' => 'Earlier denied access request',
        'status' => 'denied',
        'requested_at' => now(),
    ]);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'retry@example.test']),
    )->assertCreated();

    expect(AccessRequest::query()
        ->where('research_id', $research->id)
        ->where('requester_email', 'retry@example.test')
        ->count())->toBe(2);
});

test('database duplicate-key races return conflict without duplicate notifications', function () {
    $agency = createPhase7Agency('phase-7-race-conflict-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $duplicateKey = AccessRequest::activeDuplicateKey($research->id, 'race@example.test');

    $existing = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Race Existing',
        'requester_email' => 'other-race@example.test',
        'purpose' => 'Artificial duplicate-key race fixture',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    DB::table('access_requests')
        ->where('id', $existing->id)
        ->update(['active_duplicate_key' => $duplicateKey]);

    expect(DB::table('access_requests')->where('id', $existing->id)->value('active_duplicate_key'))
        ->toBe($duplicateKey);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'race@example.test']),
    )->assertStatus(409);

    expect(AccessRequest::query()
        ->where('research_id', $research->id)
        ->where('requester_email', 'race@example.test')
        ->exists())->toBeFalse();
    expect(Notification::query()->where('type', 'access_request.submitted')->count())->toBe(0);
});

test('honeypot submissions are rejected without records audit logs or notifications', function () {
    $agency = createPhase7Agency('phase-7-honeypot-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload([
            'requester_email' => 'honeypot@example.test',
            'website' => 'https://spam.example.test',
        ]),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['website']);

    expect(AccessRequest::query()->where('requester_email', 'honeypot@example.test')->exists())->toBeFalse();
    expect(AuditLog::query()->where('event', 'access_request.submitted')->exists())->toBeFalse();
    expect(Notification::query()->where('type', 'access_request.submitted')->exists())->toBeFalse();
});

test('captcha is optional by default and enforced when enabled', function () {
    $agency = createPhase7Agency('phase-7-captcha-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'captcha-disabled@example.test']),
    )->assertCreated();

    config([
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret',
    ]);

    Http::fakeSequence()
        ->push(['success' => false], 200)
        ->push(['success' => true], 200);

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload([
            'requester_email' => 'captcha-invalid@example.test',
            'captcha_token' => 'invalid-token',
        ]),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['captcha_token']);

    expect(AccessRequest::query()->where('requester_email', 'captcha-invalid@example.test')->exists())->toBeFalse();

    $this->postJson(
        "/api/public/research/{$research->slug}/access-requests",
        phase7PublicPayload([
            'requester_email' => 'captcha-valid@example.test',
            'captcha_token' => 'valid-token',
        ]),
    )->assertCreated();

    Http::assertSent(function ($request): bool {
        $body = $request->data();

        return ($body['secret'] ?? null) === 'test-secret'
            && ($body['response'] ?? null) === 'valid-token';
    });
});

test('public access request throttling limits repeated IP and email submissions', function () {
    config([
        'rikms.public_access_requests.limits.per_minute' => 2,
        'rikms.public_access_requests.limits.per_hour' => 100,
        'rikms.public_access_requests.limits.email_per_hour' => 100,
    ]);
    RateLimiter::clear('public-access-request:ip-minute:'.hash('sha256', '127.0.0.1'));
    RateLimiter::clear('public-access-request:ip-hour:'.hash('sha256', '127.0.0.1'));

    $agency = createPhase7Agency('phase-7-ip-throttle-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $researchA = createPhase7Research($agency, $agencyAdmin);
    $researchB = createPhase7Research($agency, $agencyAdmin);
    $researchC = createPhase7Research($agency, $agencyAdmin);

    $this->postJson(
        "/api/public/research/{$researchA->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'ip-one@example.test']),
    )->assertCreated();
    $this->postJson(
        "/api/public/research/{$researchB->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'ip-two@example.test']),
    )->assertCreated();
    $this->postJson(
        "/api/public/research/{$researchC->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'ip-three@example.test']),
    )->assertTooManyRequests();

    expect(AccessRequest::query()->where('requester_email', 'ip-three@example.test')->exists())->toBeFalse();

    config([
        'rikms.public_access_requests.limits.per_minute' => 100,
        'rikms.public_access_requests.limits.per_hour' => 100,
        'rikms.public_access_requests.limits.email_per_hour' => 2,
    ]);
    RateLimiter::clear('public-access-request:email-hour:'.hash('sha256', 'email-throttle@example.test'));

    $researchD = createPhase7Research($agency, $agencyAdmin);
    $researchE = createPhase7Research($agency, $agencyAdmin);
    $researchF = createPhase7Research($agency, $agencyAdmin);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])->postJson(
        "/api/public/research/{$researchD->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'email-throttle@example.test']),
    )->assertCreated();
    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])->postJson(
        "/api/public/research/{$researchE->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'email-throttle@example.test']),
    )->assertCreated();
    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.3'])->postJson(
        "/api/public/research/{$researchF->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'email-throttle@example.test']),
    )->assertTooManyRequests();
});

test('public access requests are rejected for public archived deleted or private research', function () {
    $agency = createPhase7Agency('phase-7-rejected-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $publicResearch = createPhase7Research($agency, $agencyAdmin, 'public');
    $archivedResearch = createPhase7Research($agency, $agencyAdmin);
    $deletedResearch = createPhase7Research($agency, $agencyAdmin);
    $privateResearch = createPhase7Research($agency, $agencyAdmin, 'private');

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

    $this->postJson(
        "/api/public/research/{$privateResearch->slug}/access-requests",
        phase7PublicPayload(['requester_email' => 'private@example.test']),
    )->assertUnprocessable();
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
            'public_denial_reason' => 'Should be forbidden.',
        ])
        ->assertForbidden();

    expect(AuditLog::where('event', 'access_request.approved')->count())->toBe(1);
    expect(Notification::where('type', 'access_request.approved')->count())->toBe(1);
});

test('agency access approval queues requester email notification after status update', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-approval-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Email Approval Researcher',
        'requester_email' => 'approval@example.test',
        'purpose' => 'Email notification approval test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.access_expires_at', null)
        ->assertJsonPath('meta.email_notification', 'queued');

    expect($accessRequest->fresh()->status)->toBe('approved');

    NotificationFacade::assertSentOnDemand(
        AccessRequestApprovedNotification::class,
        function (AccessRequestApprovedNotification $notification, array $channels, object $notifiable) use ($research, $accessRequest): bool {
            $mail = $notification->toMail($notifiable);
            $approvedUrl = (string) ($notification->data['access_url'] ?? '');

            return $channels === ['mail']
                && $notifiable->routeNotificationFor('mail') === 'approval@example.test'
                && $notification instanceof ShouldQueue
                && $notification->data['research_title'] === $research->title
                && $notification->data['status'] === 'Approved'
                && $notification->data['request_reference'] !== null
                && str_contains($approvedUrl, '/approved-access/')
                && ! str_contains($approvedUrl, '/browse-research/'.$research->slug)
                && $accessRequest->fresh()->access_token_hash === hash('sha256', basename(parse_url($approvedUrl, PHP_URL_PATH)))
                && $mail->attachments === []
                && $mail->rawAttachments === [];
        },
    );
});

test('approved access token opens landing page and downloads only its restricted research pdf', function () {
    Storage::fake('local');

    $agency = createPhase7Agency('phase-7-token-download-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    Storage::disk('local')->put("research/{$research->id}/approved.pdf", 'Approved PDF contents');
    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'approved-research.pdf',
        'stored_name' => 'approved.pdf',
        'disk' => 'local',
        'path' => "research/{$research->id}/approved.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 21,
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);
    $token = str()->random(64);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Approved Token Researcher',
        'requester_email' => 'approved-token@example.test',
        'purpose' => 'Approved token download test',
        'status' => 'approved',
        'requested_at' => now(),
        'access_token_hash' => hash('sha256', $token),
        'access_token_generated_at' => now(),
        'access_expires_at' => now()->addDay(),
    ]);

    $this->get("/approved-access/{$token}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('approved-access')
            ->where('state', 'valid')
            ->where('researchTitle', $research->title)
            ->where('downloadUrl', route('approved-access.download', ['token' => $token])));

    $this->get("/api/public/research/{$research->slug}/download")->assertForbidden();

    $this->get("/approved-access/{$token}/download")
        ->assertOk()
        ->assertDownload('approved-research.pdf');

    expect($accessRequest->fresh()->access_token_last_used_at)->not->toBeNull();
    $audit = AuditLog::query()->where('event', 'access_request.approved_file_downloaded')->firstOrFail();
    expect($audit->metadata['file_id'])->toBe($file->id)
        ->and($audit->metadata['research_id'])->toBe($research->id)
        ->and(json_encode($audit->toArray()))->not->toContain($token);
});

test('approved access tokens fail closed for invalid request states', function (string $state, callable $mutate) {
    Storage::fake('local');

    $agency = createPhase7Agency('phase-7-token-state-'.str()->random(6));
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    Storage::disk('local')->put("research/{$research->id}/protected.pdf", 'Protected PDF');
    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'protected.pdf',
        'stored_name' => 'protected.pdf',
        'disk' => 'local',
        'path' => "research/{$research->id}/protected.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 13,
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);
    $token = str()->random(64);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Invalid State Researcher',
        'requester_email' => 'invalid-state@example.test',
        'purpose' => 'Invalid token state test',
        'status' => 'approved',
        'requested_at' => now(),
        'access_token_hash' => hash('sha256', $token),
        'access_token_generated_at' => now(),
        'access_expires_at' => now()->addDay(),
    ]);

    $mutate($accessRequest, $research, $file);

    $this->get("/approved-access/{$token}")->assertForbidden();
    $this->get("/approved-access/{$token}/download")->assertForbidden();

    $audit = AuditLog::query()->where('event', 'access_request.approved_access_denied')->latest('created_at')->firstOrFail();
    expect($audit->metadata['result'])->toBe($state)
        ->and(json_encode($audit->toArray()))->not->toContain($token);
})->with([
    'pending request' => ['invalid', fn (AccessRequest $request) => $request->update(['status' => 'pending'])],
    'denied request' => ['invalid', fn (AccessRequest $request) => $request->update(['status' => 'denied'])],
    'expired approval' => ['expired', fn (AccessRequest $request) => $request->update(['access_expires_at' => now()->subMinute()])],
    'revoked approval' => ['revoked', fn (AccessRequest $request) => $request->update(['access_revoked_at' => now()])],
    'archived access request' => ['revoked', fn (AccessRequest $request) => $request->update(['archived_at' => now()])],
    'invalid requester email' => ['invalid', fn (AccessRequest $request) => $request->update(['requester_email' => 'invalid'])],
    'archived file' => ['invalid', fn (AccessRequest $request, Research $research, ResearchFile $file) => $file->update(['status' => 'archived', 'archived_at' => now()])],
    'archived research' => ['invalid', fn (AccessRequest $request, Research $research) => $research->update(['status' => 'archived', 'archived_at' => now()])],
    'superseded research' => ['invalid', function (AccessRequest $request, Research $research): void {
        $replacement = $research->replicate(['slug']);
        $replacement->slug = $research->slug.'-replacement';
        $replacement->save();
        $research->update(['status' => 'superseded', 'superseded_by_id' => $replacement->id]);
    }],
]);

test('malformed approved access token returns a safe error without exposing records', function () {
    $this->get('/approved-access/not-a-valid-token')->assertForbidden();
    $this->get('/approved-access/not-a-valid-token/download')
        ->assertForbidden()
        ->assertDontSee('research');
});

test('agency access denial queues requester email notification with public reason only', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-denial-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Email Denial Researcher',
        'requester_email' => 'denial@example.test',
        'purpose' => 'Email notification denial test',
        'message' => 'Do not include this request message as an internal note.',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/deny", [
            'public_denial_reason' => 'Please provide a clearer research purpose.',
            'internal_notes' => 'INTERNAL_ONLY_DO_NOT_EMAIL',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'denied')
        ->assertJsonPath('data.public_denial_reason', 'Please provide a clearer research purpose.')
        ->assertJsonPath('data.internal_review_notes', 'INTERNAL_ONLY_DO_NOT_EMAIL')
        ->assertJsonPath('data.access_expires_at', null)
        ->assertJsonPath('meta.email_notification', 'queued');

    expect($accessRequest->fresh()->public_denial_reason)->toBe('Please provide a clearer research purpose.')
        ->and($accessRequest->fresh()->internal_review_notes)->toBe('INTERNAL_ONLY_DO_NOT_EMAIL');

    NotificationFacade::assertSentOnDemand(
        AccessRequestDeniedNotification::class,
        function (AccessRequestDeniedNotification $notification, array $channels, object $notifiable) use ($research): bool {
            $mail = $notification->toMail($notifiable);

            return $channels === ['mail']
                && $notifiable->routeNotificationFor('mail') === 'denial@example.test'
                && $notification instanceof ShouldQueue
                && $notification->data['research_title'] === $research->title
                && $notification->data['status'] === 'Denied'
                && $notification->data['denial_reason'] === 'Please provide a clearer research purpose.'
                && ! str($mail->viewData['data']['denial_reason'] ?? '')->contains('INTERNAL_ONLY_DO_NOT_EMAIL');
        },
    );

    $publicResource = (new AccessRequestResource(
        $accessRequest->fresh()->load(['research.agency', 'requester', 'reviewer']),
    ))->resolve(HttpRequest::create('/'));

    expect($publicResource)->not->toHaveKey('internal_review_notes')
        ->and($publicResource)->not->toHaveKey('review_notes')
        ->and($publicResource['public_denial_reason'])->toBe('Please provide a clearer research purpose.');
});

test('denying access requires a public denial reason', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-required-public-reason-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Required Reason Researcher',
        'requester_email' => 'required-reason@example.test',
        'purpose' => 'Required public reason test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/deny", [
            'internal_notes' => 'Internal notes are not enough.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['public_denial_reason']);

    expect($accessRequest->fresh()->status)->toBe('pending');
    NotificationFacade::assertNothingSent();
});

test('duplicate finalized access decision does not send a duplicate requester email', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-duplicate-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Duplicate Email Researcher',
        'requester_email' => 'duplicate@example.test',
        'purpose' => 'Duplicate email notification test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertOk();

    $tokenHash = $accessRequest->fresh()->access_token_hash;

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertStatus(409);

    expect($tokenHash)->not->toBeNull()
        ->and($accessRequest->fresh()->access_token_hash)->toBe($tokenHash);
    NotificationFacade::assertSentOnDemandTimes(AccessRequestApprovedNotification::class, 1);
});

test('finalized access decisions cannot be reversed or repeated with new emails', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-finalized-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $approveThenDeny = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Approve Then Deny',
        'requester_email' => 'approve-deny@example.test',
        'purpose' => 'Finalized decision test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);
    $denyThenApprove = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Deny Then Approve',
        'requester_email' => 'deny-approve@example.test',
        'purpose' => 'Finalized decision test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$approveThenDeny->id}/approve")
        ->assertOk();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$approveThenDeny->id}/deny", [
            'public_denial_reason' => 'Too late to deny.',
        ])
        ->assertStatus(409);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$denyThenApprove->id}/deny", [
            'public_denial_reason' => 'Request is incomplete.',
        ])
        ->assertOk();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$denyThenApprove->id}/deny", [
            'public_denial_reason' => 'Second denial attempt.',
        ])
        ->assertStatus(409);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$denyThenApprove->id}/approve")
        ->assertStatus(409);

    NotificationFacade::assertSentOnDemandTimes(AccessRequestApprovedNotification::class, 1);
    NotificationFacade::assertSentOnDemandTimes(AccessRequestDeniedNotification::class, 1);
});

test('missing requester email skips email notification without blocking decision', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-missing-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Missing Email Researcher',
        'requester_email' => null,
        'purpose' => 'Missing email notification test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('meta.email_notification', 'skipped');

    expect($accessRequest->fresh()->status)->toBe('approved');
    NotificationFacade::assertNothingSent();
});

test('email notification dispatch failure does not roll back access decision', function () {
    $agency = createPhase7Agency('phase-7-email-failure-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Failure Email Researcher',
        'requester_email' => 'failure@example.test',
        'purpose' => 'Email failure notification test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->app->bind(
        AccessRequestEmailNotificationService::class,
        fn () => new class extends AccessRequestEmailNotificationService
        {
            protected function dispatchNotification(string $email, object $notification): void
            {
                throw new RuntimeException('SMTP transport unavailable');
            }
        },
    );

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('meta.email_notification', 'failed_to_queue');

    expect($accessRequest->fresh()->status)->toBe('approved');
    $this->assertDatabaseHas('audit_logs', [
        'event' => 'access_request.email_notification_failed',
        'auditable_id' => $accessRequest->id,
    ]);
});

test('decision rollback does not dispatch requester email notification', function () {
    NotificationFacade::fake();

    $agency = createPhase7Agency('phase-7-rollback-email-agency');
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Rollback Email Researcher',
        'requester_email' => 'rollback@example.test',
        'purpose' => 'Rollback email notification test',
        'status' => 'pending',
        'requested_at' => now(),
    ]);

    $this->app->bind(
        AccessRequestEmailNotificationService::class,
        fn () => new class extends AccessRequestEmailNotificationService
        {
            public function queueDecisionNotificationAfterCommit(AccessRequest $accessRequest, string $status, ?string $accessToken = null): AccessRequestEmailNotificationResult
            {
                throw new RuntimeException('Forced rollback after decision update');
            }
        },
    );

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/access-requests/{$accessRequest->id}/approve")
        ->assertServerError();

    expect($accessRequest->fresh()->status)->toBe('pending');
    NotificationFacade::assertNothingSent();
});

test('queued notification failure writes sanitized audit entries', function (string $notificationClass, string $decisionStatus) {
    $agency = createPhase7Agency('phase-7-mail-failure-'.$decisionStatus);
    $agencyAdmin = createPhase7User('agency_admin', $agency);
    $research = createPhase7Research($agency, $agencyAdmin);
    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Failure Audit Researcher',
        'requester_email' => 'failure-audit@example.test',
        'purpose' => 'Failure audit test',
        'status' => $decisionStatus,
        'requested_at' => now(),
    ]);
    $sensitiveMessage = 'SMTP password secret and raw server response';
    $notification = new $notificationClass([
        'access_request_id' => $accessRequest->id,
        'agency_id' => $agency->id,
        'notification_type' => 'access_request.'.$decisionStatus.'.email',
        'decision_status' => $decisionStatus,
        'requester_email_domain' => 'example.test',
        'queue' => 'default',
    ]);

    $notification->failed(new RuntimeException($sensitiveMessage));

    $audit = AuditLog::query()
        ->where('event', 'access_request.email_notification_failed')
        ->where('auditable_id', $accessRequest->id)
        ->firstOrFail();

    expect($audit->metadata['notification_type'])->toBe('access_request.'.$decisionStatus.'.email')
        ->and($audit->metadata['decision_status'])->toBe($decisionStatus)
        ->and($audit->metadata['failure_category'])->toBe('notification_job_failure')
        ->and($audit->metadata['exception_class'])->toBe(RuntimeException::class)
        ->and(json_encode($audit->metadata))->not->toContain($sensitiveMessage);
})->with([
    [AccessRequestApprovedNotification::class, 'approved'],
    [AccessRequestDeniedNotification::class, 'denied'],
]);

test('queued notification failure audit fallback does not throw', function () {
    $this->app->bind(
        AccessRequestMailFailureAuditor::class,
        fn () => new class extends AccessRequestMailFailureAuditor
        {
            public function record(array $data, Throwable $exception, ?string $category = null): void
            {
                throw new RuntimeException('Audit writer unavailable with secret response');
            }
        },
    );

    $notification = new AccessRequestApprovedNotification([
        'access_request_id' => 987,
        'agency_id' => 654,
        'notification_type' => 'access_request.approved.email',
        'decision_status' => 'approved',
    ]);

    $notification->failed(new RuntimeException('Sensitive SMTP response'));

    expect(true)->toBeTrue();
});
