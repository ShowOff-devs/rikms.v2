<?php

use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\AiPipelineDispatcher;
use App\Services\PlatformSettingsService;
use App\Support\AuditLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

function phase2FollowUpAgency(string $suffix): Agency
{
    return Agency::create([
        'slug' => "phase2-follow-up-{$suffix}",
        'name' => "Phase 2 Follow Up {$suffix}",
        'short_name' => 'P2F'.mb_strtoupper(mb_substr($suffix, 0, 5)),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function phase2FollowUpUser(Agency $agency): User
{
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $role = Role::updateOrCreate(
        ['slug' => 'agency_admin'],
        [
            'name' => 'Agency Admin',
            'display_name' => 'Agency Admin',
            'is_system' => true,
            'is_active' => true,
        ],
    );
    $user->roles()->syncWithoutDetaching([
        $role->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function phase2FollowUpSuperAdmin(): User
{
    $user = User::factory()->create([
        'agency_id' => null,
        'role' => 'super_admin',
        'status' => 'active',
    ]);
    $role = Role::updateOrCreate(
        ['slug' => 'super_admin'],
        [
            'name' => 'Super Admin',
            'display_name' => 'Super Admin',
            'is_system' => true,
            'is_active' => true,
        ],
    );
    $user->roles()->syncWithoutDetaching([
        $role->id => ['assigned_at' => now()],
    ]);
    $user->forceFill([
        'two_factor_secret' => encrypt('phase2-follow-up-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['phase2-follow-up-recovery'])),
        'two_factor_confirmed_at' => now(),
    ])->save();

    return $user;
}

function phase2FollowUpResearch(Agency $agency, User $user, string $suffix, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => "phase2-follow-up-{$suffix}-research",
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => "Phase 2 follow up {$suffix}",
        'abstract' => 'Focused Phase 2 verification fixture.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'status' => $status,
        'access_level' => 'restricted',
        'published_at' => $status === 'published' ? now() : null,
    ]);
}

function phase2FollowUpSetAi(bool $enabled): void
{
    $settings = app(PlatformSettingsService::class);
    $definition = $settings->definition(PlatformSettingsService::AI_PROCESSING_ENABLED);

    PlatformSetting::updateOrCreate(
        ['key' => PlatformSettingsService::AI_PROCESSING_ENABLED],
        [
            'value' => $enabled ? 'true' : 'false',
            'type' => 'boolean',
            'group' => $definition['group'] ?? 'ai',
            'label' => $definition['label'] ?? 'AI Processing Enabled',
            'is_public' => false,
            'is_encrypted' => false,
        ],
    );
    $settings->forgetCache();
}

test('the general audit logger suppresses insertion failures and is not authoritative', function () {
    Storage::fake('local');
    $agency = phase2FollowUpAgency('general-audit');
    $user = phase2FollowUpUser($agency);
    $research = phase2FollowUpResearch($agency, $user, 'general-audit');
    $path = "research/{$research->id}/general-audit.pdf";
    Storage::disk('local')->put($path, 'promoted object');
    $request = Request::create('/phase2-follow-up', 'POST');
    $request->setUserResolver(fn (): User => $user);
    $event = 'eloquent.creating: '.AuditLog::class;

    Event::listen($event, fn (): never => throw new RuntimeException('Forced general audit insertion failure.'));

    try {
        DB::transaction(function () use ($agency, $path, $request, $research, $user): void {
            $file = ResearchFile::create([
                'research_id' => $research->id,
                'agency_id' => $agency->id,
                'uploaded_by' => $user->id,
                'original_name' => 'general-audit.pdf',
                'stored_name' => 'general-audit.pdf',
                'disk' => 'local',
                'path' => $path,
                'mime_type' => 'application/pdf',
                'extension' => 'pdf',
                'size_bytes' => 15,
                'checksum' => hash('sha256', 'promoted object'),
                'file_type' => 'research_document',
                'visibility' => 'private',
                'access_level' => 'restricted',
                'status' => 'active',
                'uploaded_at' => now(),
            ]);
            AuditLogger::record($request, 'phase2.general_audit_failure', $file);
        });
    } finally {
        Event::forget($event);
    }

    expect(ResearchFile::query()->where('research_id', $research->id)->exists())->toBeTrue()
        ->and(Storage::disk('local')->exists($path))->toBeTrue()
        ->and(AuditLog::query()->where('event', 'phase2.general_audit_failure')->exists())->toBeFalse();
});

test('upload audit insertion failure rolls back metadata and removes only the attempted object', function () {
    Storage::fake('local');
    phase2FollowUpSetAi(false);
    $agency = phase2FollowUpAgency('upload-audit');
    $user = phase2FollowUpUser($agency);
    $research = phase2FollowUpResearch($agency, $user, 'upload-audit');
    $existingPath = "research/{$research->id}/existing.pdf";
    Storage::disk('local')->put($existingPath, 'existing valid object');
    $event = 'eloquent.creating: '.AuditLog::class;

    Event::listen($event, fn (): never => throw new RuntimeException('Forced upload audit insertion failure.'));

    try {
        $this->actingAs($user)
            ->postJson("/api/agency/research/{$research->id}/files", [
                'file' => testPdfUpload('audit-failure.pdf', 64),
            ])
            ->assertServerError();
    } finally {
        Event::forget($event);
    }

    expect(ResearchFile::query()->where('research_id', $research->id)->exists())->toBeFalse()
        ->and(Storage::disk('local')->exists($existingPath))->toBeTrue()
        ->and(Storage::disk('local')->allFiles("research/{$research->id}"))->toBe([$existingPath])
        ->and(AuditLog::query()->where('event', 'research_file.uploaded')->exists())->toBeFalse();
});

test('AI dispatch failure after commit retains the committed upload and its audit', function () {
    Storage::fake('local');
    phase2FollowUpSetAi(true);
    $agency = phase2FollowUpAgency('ai-dispatch');
    $user = phase2FollowUpUser($agency);
    $research = phase2FollowUpResearch($agency, $user, 'ai-dispatch');
    $this->app->instance(AiPipelineDispatcher::class, new class extends AiPipelineDispatcher
    {
        public function dispatch(ResearchFile $file): void
        {
            throw new RuntimeException('Forced AI dispatch failure after commit.');
        }
    });

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('ai-dispatch-failure.pdf', 64),
        ])
        ->assertCreated()
        ->assertJsonPath('message', 'Research file uploaded, but AI processing could not be queued. An administrator may retry it.');

    $file = ResearchFile::query()->where('research_id', $research->id)->firstOrFail();

    expect(Storage::disk($file->disk)->exists($file->path))->toBeTrue()
        ->and($file->metadata['ai_processing']['pdf_parsing']['status'])->toBe('failed')
        ->and(AuditLog::query()
            ->where('event', 'research_file.uploaded')
            ->where('auditable_id', $file->id)
            ->exists())->toBeTrue();
});

test('active revision identity follows active publication archive restore and deletion lifecycle', function () {
    $agency = phase2FollowUpAgency('revision-lifecycle');
    $user = phase2FollowUpUser($agency);
    $parent = phase2FollowUpResearch($agency, $user, 'revision-parent', 'published');
    $revision = Research::create([
        'slug' => 'phase2-follow-up-revision-lifecycle-one',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $parent->id,
        'revision_number' => 2,
        'title' => $parent->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    foreach (['draft', 'submitted', 'under_review', 'approved', 'rejected'] as $status) {
        $revision->update(['status' => $status]);
        expect($revision->fresh()->active_revision_parent_id)->toBe($parent->id);
    }

    $revision->update(['status' => 'published', 'published_at' => now()]);
    expect($revision->fresh()->active_revision_parent_id)->toBeNull();

    $archived = Research::create([
        'slug' => 'phase2-follow-up-revision-lifecycle-archived',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $parent->id,
        'revision_number' => 2,
        'title' => $parent->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);
    $archived->update(['status' => 'archived', 'archived_at' => now()]);
    $replacement = Research::create([
        'slug' => 'phase2-follow-up-revision-lifecycle-replacement',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $parent->id,
        'revision_number' => 2,
        'title' => $parent->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    expect($archived->fresh()->active_revision_parent_id)->toBeNull()
        ->and($replacement->fresh()->active_revision_parent_id)->toBe($parent->id)
        ->and(fn () => $archived->update(['status' => 'draft', 'archived_at' => null]))
        ->toThrow(QueryException::class);

    $replacement->update(['status' => 'archived', 'archived_at' => now()]);
    $replacement->delete();
    $archived->refresh()->update(['status' => 'draft', 'archived_at' => null]);

    expect($replacement->fresh()->active_revision_parent_id)->toBeNull()
        ->and($archived->fresh()->active_revision_parent_id)->toBe($parent->id);

    $archived->delete();
    expect(Research::withTrashed()->findOrFail($archived->id)->active_revision_parent_id)->toBeNull();
});

test('cross agency revision requests cannot obtain the existing revision idempotently', function () {
    $ownerAgency = phase2FollowUpAgency('revision-owner');
    $otherAgency = phase2FollowUpAgency('revision-other');
    $owner = phase2FollowUpUser($ownerAgency);
    $outsider = phase2FollowUpUser($otherAgency);
    $published = phase2FollowUpResearch($ownerAgency, $owner, 'revision-scope', 'published');

    $created = $this->actingAs($owner)
        ->postJson("/api/agency/research/{$published->id}/revision")
        ->assertCreated();
    $revisionId = $created->json('data.id');

    $response = $this->actingAs($outsider)
        ->postJson("/api/agency/research/{$published->id}/revision")
        ->assertForbidden();

    expect($response->json('data'))->toBeNull()
        ->and($response->getContent())->not->toContain((string) $revisionId)
        ->and(Research::query()->where('revision_parent_id', $published->id)->count())->toBe(1);
});

test('agency and admin restore paths return conflicts when a replacement revision is active', function () {
    $agency = phase2FollowUpAgency('restore-conflict');
    $owner = phase2FollowUpUser($agency);
    $superAdmin = phase2FollowUpSuperAdmin();
    $parent = phase2FollowUpResearch($agency, $owner, 'restore-conflict-parent', 'published');

    $archived = Research::create([
        'slug' => 'phase2-follow-up-restore-conflict-archived',
        'agency_id' => $agency->id,
        'uploaded_by' => $owner->id,
        'revision_parent_id' => $parent->id,
        'revision_number' => 2,
        'title' => $parent->title,
        'status' => 'archived',
        'access_level' => 'restricted',
        'archived_at' => now(),
        'archived_by' => $owner->id,
        'archive_reason' => 'Lifecycle conflict verification.',
    ]);
    ArchiveRecord::create([
        'archivable_type' => $archived->getMorphClass(),
        'archivable_id' => $archived->id,
        'archived_by' => $owner->id,
        'reason' => 'Lifecycle conflict verification.',
        'metadata' => ['previous_status' => 'draft', 'scope' => 'agency'],
        'archived_at' => now(),
    ]);
    $replacement = Research::create([
        'slug' => 'phase2-follow-up-restore-conflict-replacement',
        'agency_id' => $agency->id,
        'uploaded_by' => $owner->id,
        'revision_parent_id' => $parent->id,
        'revision_number' => 2,
        'title' => $parent->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    $this->actingAs($owner)
        ->postJson("/api/agency/research/{$archived->id}/restore")
        ->assertConflict();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$archived->id}/restore")
        ->assertConflict()
        ->assertJsonPath('errors.code.0', 'RESEARCH_MODERATION_CONFLICT');

    expect($archived->fresh()->status)->toBe('archived')
        ->and($archived->fresh()->active_revision_parent_id)->toBeNull()
        ->and($replacement->fresh()->active_revision_parent_id)->toBe($parent->id);
});
