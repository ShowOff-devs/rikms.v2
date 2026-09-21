<?php

use App\Exceptions\ResearchModerationTransitionException;
use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\User;
use App\Services\ResearchModerationTransitionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

function transitionTestAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->headline()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function transitionTestUser(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    if ($role === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('transition-test-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['transition-recovery-code'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

    return $user;
}

function transitionTestResearch(Agency $agency, User $uploader, string $status): Research
{
    return Research::create([
        'slug' => 'transition-'.$status.'-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => str($status)->headline()->append(' Transition Research')->toString(),
        'abstract' => 'Moderation transition regression record.',
        'authors' => ['Transition Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['moderation'],
        'status' => $status,
        'access_level' => 'public',
        'submitted_at' => in_array($status, ['submitted', 'under_review', 'approved', 'published'], true) ? now() : null,
        'approved_at' => in_array($status, ['approved', 'published'], true) ? now() : null,
        'published_at' => $status === 'published' ? now() : null,
    ]);
}

function transitionServiceRequest(User $user, array $input = []): Request
{
    $request = Request::create('/moderation-test', 'POST', $input);
    $request->setUserResolver(fn (): User => $user);

    return $request;
}

dataset('legal research moderation transitions', [
    'submitted can be approved' => ['submitted', 'approve', 'approved', 'research.approved', []],
    'under review can be approved' => ['under_review', 'approve', 'approved', 'research.approved', []],
    'submitted can be rejected' => ['submitted', 'reject', 'rejected', 'research.rejected', ['notes' => 'Return this record for documented metadata revisions.']],
    'under review can be rejected' => ['under_review', 'reject', 'rejected', 'research.rejected', ['notes' => 'Return this record for documented metadata revisions.']],
    'submitted can be approved and published' => ['submitted', 'approve-and-publish', 'published', 'research.approved_published', []],
    'under review can be approved and published' => ['under_review', 'approve-and-publish', 'published', 'research.approved_published', []],
    'approved can be published' => ['approved', 'publish', 'published', 'research.published', []],
    'rejected can be returned' => ['rejected', 'return', 'draft', 'research.returned', []],
    'under review can be returned' => ['under_review', 'return', 'draft', 'research.returned', []],
    'approved can be archived' => ['approved', 'archive', 'archived', 'research.archived', ['reason' => 'Archived after a completed documented moderation review.']],
    'rejected can be archived' => ['rejected', 'archive', 'archived', 'research.archived', ['reason' => 'Archived after a completed documented moderation review.']],
    'published can be archived' => ['published', 'archive', 'archived', 'research.archived', ['reason' => 'Archived after a completed documented moderation review.']],
]);

test('every legal research moderation transition still commits its related side effects', function (
    string $startingStatus,
    string $endpoint,
    string $expectedStatus,
    string $auditEvent,
    array $payload,
) {
    $agency = transitionTestAgency('legal-'.$startingStatus.'-'.str()->random(5));
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, $startingStatus);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/{$endpoint}", $payload)
        ->assertOk()
        ->assertJsonPath('data.status', $expectedStatus);

    expect($research->fresh()->status)->toBe($expectedStatus)
        ->and(AuditLog::query()->where('event', $auditEvent)->where('auditable_id', $research->id)->count())->toBe(1)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(1);

    if (in_array($endpoint, ['approve', 'approve-and-publish', 'reject', 'publish', 'return'], true)) {
        expect(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(1);
    } else {
        expect(ArchiveRecord::query()->where('archivable_id', $research->id)->count())->toBe(1);
    }
})->with('legal research moderation transitions');

test('a moderation transition stores authoritative audit context and matching notification identity', function () {
    $agency = transitionTestAgency('authoritative-audit');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve", [
            'notes' => 'Approved after authoritative audit verification.',
        ])
        ->assertOk();

    $decision = ResearchApproval::query()->where('research_id', $research->id)->sole();
    $audit = AuditLog::query()->where('event', 'research.approved')->where('auditable_id', $research->id)->sole();
    $notification = Notification::query()->where('agency_id', $agency->id)->sole();

    expect(Str::isUuid($audit->transition_id))->toBeTrue()
        ->and($notification->transition_id)->toBe($audit->transition_id)
        ->and($notification->data['transition_id'])->toBe($audit->transition_id)
        ->and($audit->user_id)->toBe($superAdmin->id)
        ->and($audit->auditable_type)->toBe($research->getMorphClass())
        ->and($audit->auditable_id)->toBe($research->id)
        ->and($audit->old_values['status'])->toBe('submitted')
        ->and($audit->new_values['status'])->toBe('approved')
        ->and($audit->metadata['transition_id'])->toBe($audit->transition_id)
        ->and($audit->metadata['moderation_action'])->toBe(ResearchModerationTransitionService::APPROVE)
        ->and($audit->metadata['decision_id'])->toBe($decision->id)
        ->and($audit->metadata['notes'])->toBe('Approved after authoritative audit verification.');
});

test('archived research can be restored to its recorded previous status', function () {
    $agency = transitionTestAgency('legal-restore');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'archived');
    $research->update([
        'archived_at' => now(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'Archived before restoration regression coverage.',
    ]);
    $archive = ArchiveRecord::create([
        'archivable_type' => $research->getMorphClass(),
        'archivable_id' => $research->id,
        'archived_by' => $superAdmin->id,
        'reason' => 'Archived before restoration regression coverage.',
        'metadata' => ['previous_status' => 'approved'],
        'archived_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    expect($research->fresh()->archived_at)->toBeNull()
        ->and($archive->fresh()->restored_at)->not->toBeNull()
        ->and(AuditLog::query()->where('event', 'research.restored')->where('auditable_id', $research->id)->count())->toBe(1)
        ->and(Notification::query()->where('agency_id', $agency->id)->where('type', 'research.restored')->count())->toBe(1);
});

test('illegal and repeated moderation actions do not duplicate decisions audits or notifications', function () {
    $agency = transitionTestAgency('duplicate-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve")
        ->assertOk();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve")
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'RESEARCH_MODERATION_TRANSITION_INVALID')
        ->assertJsonPath('errors.current_status.0', 'approved');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/reject", [
            'notes' => 'This transition is no longer legally available.',
        ])
        ->assertUnprocessable();

    expect($research->fresh()->status)->toBe('approved')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(1)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(1)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(1);
});

test('a stale locked state produces a conflict and no losing side effects', function () {
    $agency = transitionTestAgency('stale-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $staleResearch = $research->fresh();
    $research->update(['status' => 'rejected']);

    try {
        app(ResearchModerationTransitionService::class)->transition(
            transitionServiceRequest($superAdmin),
            $staleResearch,
            ResearchModerationTransitionService::APPROVE,
        );
        $this->fail('Expected a stale moderation conflict.');
    } catch (ResearchModerationTransitionException $exception) {
        expect($exception->stale)->toBeTrue()
            ->and($exception->statusCode())->toBe(409)
            ->and($exception->currentStatus)->toBe('rejected');
    }

    expect(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});

test('the moderation API exposes a frontend compatible stale conflict response', function () {
    $agency = transitionTestAgency('api-stale-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $exception = new ResearchModerationTransitionException(
        'This research was changed by another moderation request. Refresh the record before trying again.',
        'rejected',
        true,
    );
    $service = Mockery::mock(ResearchModerationTransitionService::class);
    $service->shouldReceive('transition')->once()->andThrow($exception);
    $this->app->instance(ResearchModerationTransitionService::class, $service);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve")
        ->assertConflict()
        ->assertJsonPath('errors.research.0', $exception->getMessage())
        ->assertJsonPath('errors.code.0', 'RESEARCH_MODERATION_CONFLICT')
        ->assertJsonPath('errors.current_status.0', 'rejected')
        ->assertJsonPath('errors.refresh_url.0', "/api/admin/research/{$research->id}");
});

test('a rolled back moderation transition commits no decision audit or success notification', function () {
    $agency = transitionTestAgency('rollback-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $event = 'eloquent.created: '.ResearchApproval::class;

    Event::listen($event, function (): never {
        throw new RuntimeException('Forced failure after decision insert.');
    });

    try {
        app(ResearchModerationTransitionService::class)->transition(
            transitionServiceRequest($superAdmin),
            $research->fresh(),
            ResearchModerationTransitionService::APPROVE,
        );
        $this->fail('Expected the forced transition failure.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Forced failure after decision insert.');
    } finally {
        Event::forget($event);
    }

    expect($research->fresh()->status)->toBe('submitted')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});

test('a forced authoritative audit insertion failure rolls back the moderation decision', function () {
    $agency = transitionTestAgency('audit-failure-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $event = 'eloquent.creating: '.AuditLog::class;

    Event::listen($event, function (): never {
        throw new RuntimeException('Forced authoritative moderation audit failure.');
    });

    try {
        app(ResearchModerationTransitionService::class)->transition(
            transitionServiceRequest($superAdmin),
            $research->fresh(),
            ResearchModerationTransitionService::APPROVE,
        );
        $this->fail('Expected the authoritative audit insertion failure.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Forced authoritative moderation audit failure.');
    } finally {
        Event::forget($event);
    }

    expect($research->fresh()->status)->toBe('submitted')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});

test('the moderation API does not report success when authoritative audit insertion fails', function () {
    $agency = transitionTestAgency('api-audit-failure-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $event = 'eloquent.creating: '.AuditLog::class;

    Event::listen($event, function (): never {
        throw new RuntimeException('Forced API moderation audit failure.');
    });

    try {
        $this->actingAs($superAdmin)
            ->postJson("/api/admin/research/{$research->id}/approve")
            ->assertServerError();
    } finally {
        Event::forget($event);
    }

    expect($research->fresh()->status)->toBe('submitted')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});

test('a forced notification insertion failure rolls back decision and authoritative audit', function () {
    $agency = transitionTestAgency('notification-failure-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $superAdmin = transitionTestUser('super_admin');
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');
    $event = 'eloquent.creating: '.Notification::class;

    Event::listen($event, function (): never {
        throw new RuntimeException('Forced moderation notification insertion failure.');
    });

    try {
        app(ResearchModerationTransitionService::class)->transition(
            transitionServiceRequest($superAdmin),
            $research->fresh(),
            ResearchModerationTransitionService::APPROVE,
        );
        $this->fail('Expected the moderation notification insertion failure.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Forced moderation notification insertion failure.');
    } finally {
        Event::forget($event);
    }

    expect($research->fresh()->status)->toBe('submitted')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});

test('existing moderation authorization and agency boundaries remain enforced', function () {
    $agency = transitionTestAgency('authorization-transition');
    $agencyAdmin = transitionTestUser('agency_admin', $agency);
    $otherAgency = transitionTestAgency('authorization-transition-other');
    $otherAgencyAdmin = transitionTestUser('agency_admin', $otherAgency);
    $research = transitionTestResearch($agency, $agencyAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/admin/research/{$research->id}/approve")
        ->assertForbidden();

    $this->actingAs($otherAgencyAdmin)
        ->postJson("/api/admin/research/{$research->id}/reject", [
            'notes' => 'An unauthorized cross-agency moderation attempt.',
        ])
        ->assertForbidden();

    expect($research->fresh()->status)->toBe('submitted')
        ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(0)
        ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(0);
});
