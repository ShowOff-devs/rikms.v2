<?php

use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;

function createPhase5Agency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase5Role(string $slug): Role
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

function createPhase5User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase5Role($role)->id => ['assigned_at' => now()],
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

function createPhase5Research(Agency $agency, User $uploader, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => 'phase-5-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 5 Research',
        'abstract' => 'A Phase 5 integration record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 5'],
        'status' => $status,
        'access_level' => 'request_required',
    ]);
}

function createPhase5ResearchFile(Research $research, Agency $agency, User $uploader, array $metadata): ResearchFile
{
    return ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'original_name' => 'phase5.pdf',
        'stored_name' => 'phase5.pdf',
        'disk' => 'local',
        'path' => 'research/'.$research->id.'/phase5.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', 'phase5'),
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'metadata' => $metadata,
        'uploaded_at' => now(),
    ]);
}

test('agency and admin AI result endpoints enforce scope and return graceful empty states', function () {
    $ownAgency = createPhase5Agency('phase-five-ai-own');
    $otherAgency = createPhase5Agency('phase-five-ai-other');
    $agencyAdmin = createPhase5User('agency_admin', $ownAgency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $superAdmin = createPhase5User('super_admin');
    $ownResearch = createPhase5Research($ownAgency, $agencyAdmin, 'submitted');
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$ownResearch->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.research_id', $ownResearch->id)
        ->assertJsonPath('data.ai_metadata.status', 'not_available')
        ->assertJsonPath('data.pdf_parsing_result.status', 'not_available')
        ->assertJsonPath('data.sdg_classification.status', 'not_available')
        ->assertJsonMissingPath('data.ai_metadata.raw_payload');

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$otherResearch->id}/ai-results")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/research/{$otherResearch->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.research_id', $otherResearch->id);
});

test('agency AI results expose queued relational pipeline status before mongo results exist', function () {
    $agency = createPhase5Agency('phase-five-ai-queued');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');

    createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'ai_processing' => 'queued',
    ]);

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$research->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.pdf_parsing_result.status', 'queued')
        ->assertJsonPath('data.ai_metadata.status', 'queued')
        ->assertJsonPath('data.sdg_classification.status', 'queued')
        ->assertJsonPath('data.ai_metadata.message', 'AI metadata extraction is queued.');
});

test('agency AI results expose skipped relational pipeline status when mongodb is unavailable', function () {
    $agency = createPhase5Agency('phase-five-ai-skipped');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');

    createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'ai_processing' => [
            'pdf_parsing' => [
                'status' => 'skipped',
                'message' => 'MONGODB_URI is not configured.',
            ],
            'ai_metadata' => [
                'status' => 'skipped',
                'message' => 'MONGODB_URI is not configured.',
            ],
            'sdg_classification' => [
                'status' => 'skipped',
                'message' => 'MONGODB_URI is not configured.',
            ],
        ],
    ]);

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$research->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.pdf_parsing_result.status', 'skipped')
        ->assertJsonPath('data.ai_metadata.status', 'skipped')
        ->assertJsonPath('data.sdg_classification.status', 'skipped')
        ->assertJsonPath('data.ai_metadata.message', 'MONGODB_URI is not configured.');
});

test('agency AI results expose failed relational pipeline status with processing error message', function () {
    $agency = createPhase5Agency('phase-five-ai-failed');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');
    $message = 'No extracted PDF text is available for metadata extraction.';

    createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'ai_processing' => [
            'pdf_parsing' => [
                'status' => 'completed',
            ],
            'ai_metadata' => [
                'status' => 'failed',
                'message' => $message,
            ],
        ],
    ]);

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$research->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.pdf_parsing_result.status', 'completed')
        ->assertJsonPath('data.ai_metadata.status', 'failed')
        ->assertJsonPath('data.ai_metadata.message', $message)
        ->assertJsonPath('data.ai_metadata.processing_errors.0', $message)
        ->assertJsonPath('data.sdg_classification.status', 'queued');
});

test('agency AI process endpoint rejects research records without uploaded files', function () {
    $agency = createPhase5Agency('phase-five-ai-process-no-file');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/ai-results/process")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Upload a PDF research document before running AI analysis.');
});

test('agency AI process endpoint enforces agency scope', function () {
    $ownAgency = createPhase5Agency('phase-five-ai-process-own');
    $otherAgency = createPhase5Agency('phase-five-ai-process-other');
    $agencyAdmin = createPhase5User('agency_admin', $ownAgency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');

    createPhase5ResearchFile($otherResearch, $otherAgency, $otherAdmin, [
        'ai_processing' => 'queued',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$otherResearch->id}/ai-results/process")
        ->assertForbidden();
});

test('agency AI process endpoint runs latest file pipeline synchronously when mongodb is unavailable', function () {
    config(['database.connections.mongodb.dsn' => null]);

    $agency = createPhase5Agency('phase-five-ai-process-skipped');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');
    $olderFile = createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'ai_processing' => 'queued',
    ]);
    $olderFile->forceFill(['uploaded_at' => now()->subMinutes(5)])->save();
    $latestFile = createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'ai_processing' => 'queued',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/ai-results/process")
        ->assertOk()
        ->assertJsonPath('data.pdf_parsing_result.file_id', $latestFile->id)
        ->assertJsonPath('data.pdf_parsing_result.status', 'skipped')
        ->assertJsonPath('data.ai_metadata.status', 'skipped')
        ->assertJsonPath('data.sdg_classification.status', 'skipped');

    expect($latestFile->refresh()->metadata['ai_processing']['pdf_parsing']['status'])->toBe('skipped')
        ->and($latestFile->metadata['ai_processing']['ai_metadata']['status'])->toBe('skipped')
        ->and($latestFile->metadata['ai_processing']['sdg_classification']['status'])->toBe('skipped')
        ->and($olderFile->refresh()->metadata['ai_processing'])->toBe('queued');
});

test('agency admin can archive list and restore own non published research only', function () {
    $agency = createPhase5Agency('phase-five-archive-agency');
    $otherAgency = createPhase5Agency('phase-five-archive-other');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');
    $publishedResearch = createPhase5Research($agency, $agencyAdmin, 'published');
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$publishedResearch->id}/archive", [
            'reason' => 'Agency tried to archive published record.',
        ])
        ->assertUnprocessable();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$otherResearch->id}/archive", [
            'reason' => 'Cross agency archive attempt.',
        ])
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/archive", [
            'reason' => 'Superseded draft.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    $this->assertDatabaseHas('audit_logs', ['event' => 'agency.research.archived']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'agency.research.restored']);
});

test('agency admin can delete own archived research from archive', function () {
    $agency = createPhase5Agency('phase-five-archive-delete-agency');
    $otherAgency = createPhase5Agency('phase-five-archive-delete-other');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');
    $activeResearch = createPhase5Research($agency, $agencyAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->deleteJson("/api/agency/research/{$activeResearch->id}/archive")
        ->assertUnprocessable();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/archive", [
            'reason' => 'No longer needed in agency archive.',
        ])
        ->assertOk();

    $this->actingAs($otherAdmin)
        ->postJson("/api/agency/research/{$otherResearch->id}/archive", [
            'reason' => 'Other agency archive.',
        ])
        ->assertOk();

    $this->actingAs($agencyAdmin)
        ->deleteJson("/api/agency/research/{$otherResearch->id}/archive")
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->deleteJson("/api/agency/research/{$research->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.id', $research->id);

    $this->assertSoftDeleted('research', ['id' => $research->id]);

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    $this->assertDatabaseHas('audit_logs', ['event' => 'agency.research.deleted']);
});

test('admin can list archived research and restore records', function () {
    $agency = createPhase5Agency('phase-five-admin-archive');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $superAdmin = createPhase5User('super_admin');
    $research = createPhase5Research($agency, $agencyAdmin, 'archived');

    $research->update([
        'archived_at' => now(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'Admin archive listing test.',
    ]);

    ArchiveRecord::create([
        'archivable_type' => $research->getMorphClass(),
        'archivable_id' => $research->id,
        'archived_by' => $superAdmin->id,
        'reason' => 'Admin archive listing test.',
        'metadata' => ['previous_status' => 'published'],
        'archived_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.archive_reason', 'Admin archive listing test.');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'published');
});

test('admin can delete archived research from archive', function () {
    $agency = createPhase5Agency('phase-five-admin-archive-delete');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $superAdmin = createPhase5User('super_admin');
    $research = createPhase5Research($agency, $agencyAdmin, 'archived');
    $activeResearch = createPhase5Research($agency, $agencyAdmin, 'published');

    $research->update([
        'archived_at' => now(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'Admin archive delete test.',
    ]);

    ArchiveRecord::create([
        'archivable_type' => $research->getMorphClass(),
        'archivable_id' => $research->id,
        'archived_by' => $superAdmin->id,
        'reason' => 'Admin archive delete test.',
        'metadata' => ['previous_status' => 'published'],
        'archived_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/research/{$activeResearch->id}/archive")
        ->assertUnprocessable();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/research/{$research->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.id', $research->id);

    $this->assertSoftDeleted('research', ['id' => $research->id]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 0);

    $this->assertDatabaseHas('audit_logs', ['event' => 'admin.research.deleted']);
});

test('admin can list archived agencies users and files and export them', function () {
    $agency = createPhase5Agency('phase-five-admin-archive-connected');
    $archivedAgency = createPhase5Agency('phase-five-admin-archive-agency-list');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $archivedUser = createPhase5User('agency_admin', $agency);
    $superAdmin = createPhase5User('super_admin');
    $research = createPhase5Research($agency, $agencyAdmin, 'published');
    $file = createPhase5ResearchFile($research, $agency, $agencyAdmin, []);

    $archivedAgency->forceFill([
        'status' => 'archived',
        'archived_at' => now()->subDays(2),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'Agency archive list test.',
    ])->save();

    $archivedUser->forceFill([
        'status' => 'inactive',
        'archived_at' => now()->subDay(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'User archive list test.',
    ])->save();

    $file->forceFill([
        'status' => 'archived',
        'archived_at' => now(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'File archive list test.',
    ])->save();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/agencies')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.archive_reason', 'Agency archive list test.');

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/users')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.archive_reason', 'User archive list test.');

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/files')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.archive_reason', 'File archive list test.');

    $content = $this->actingAs($superAdmin)
        ->get('/api/admin/archive/export?include_research=false&include_files=true&include_agencies=true&include_users=true')
        ->assertOk()
        ->streamedContent();

    expect($content)
        ->toContain('File')
        ->toContain('phase5.pdf')
        ->toContain('Agency')
        ->toContain($archivedAgency->name)
        ->toContain('User')
        ->toContain($archivedUser->name);
});

test('admin can restore and delete archived agencies users and files', function () {
    $agency = createPhase5Agency('phase-five-admin-archive-actions');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $superAdmin = createPhase5User('super_admin');
    $research = createPhase5Research($agency, $agencyAdmin, 'published');
    $file = createPhase5ResearchFile($research, $agency, $agencyAdmin, []);
    $archivedAgency = createPhase5Agency('phase-five-admin-archive-restore-agency');
    $deletedAgency = createPhase5Agency('phase-five-admin-archive-delete-agency');
    $archivedUser = createPhase5User('agency_admin', $agency);
    $deletedUser = createPhase5User('agency_admin', $agency);
    $deletedFile = createPhase5ResearchFile($research, $agency, $agencyAdmin, [
        'variant' => 'delete',
    ]);

    foreach ([$file, $deletedFile] as $archivedFile) {
        $archivedFile->forceFill([
            'status' => 'archived',
            'archived_at' => now(),
            'archived_by' => $superAdmin->id,
            'archive_reason' => 'File archive action test.',
        ])->save();
    }

    foreach ([$archivedAgency, $deletedAgency] as $agencyRecord) {
        $agencyRecord->forceFill([
            'status' => 'archived',
            'archived_at' => now(),
            'archived_by' => $superAdmin->id,
            'archive_reason' => 'Agency archive action test.',
        ])->save();
    }

    foreach ([$archivedUser, $deletedUser] as $userRecord) {
        $userRecord->forceFill([
            'agency_id' => null,
            'status' => 'inactive',
            'archived_at' => now(),
            'archived_by' => $superAdmin->id,
            'archive_reason' => 'User archive action test.',
        ])->save();

        AuditLog::create([
            'user_id' => $superAdmin->id,
            'event' => 'agency_admin_user.removed',
            'auditable_type' => $userRecord->getMorphClass(),
            'auditable_id' => $userRecord->id,
            'old_values' => ['agency_id' => $agency->id],
            'new_values' => ['agency_id' => null],
            'created_at' => now(),
        ]);
    }

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research-files/{$file->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/agencies/{$archivedAgency->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/users/{$archivedUser->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.agency.short_name', $agency->short_name);

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/research-files/{$deletedFile->id}/archive")
        ->assertOk();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/agencies/{$deletedAgency->id}/archive")
        ->assertOk();

    $this->actingAs($superAdmin)
        ->deleteJson("/api/admin/users/{$deletedUser->id}/archive")
        ->assertOk();

    $this->assertSoftDeleted('research_files', ['id' => $deletedFile->id]);
    $this->assertSoftDeleted('agencies', ['id' => $deletedAgency->id]);
    $this->assertSoftDeleted('users', ['id' => $deletedUser->id]);
    $this->assertDatabaseHas('audit_logs', ['event' => 'admin.file.restored']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'admin.agency.restored']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'admin.user.restored']);
});

test('notification mark read endpoints only update notifications in scope', function () {
    $agency = createPhase5Agency('phase-five-notifications');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $otherUser = createPhase5User('public_user');
    $superAdmin = createPhase5User('super_admin');
    $ownNotification = Notification::create([
        'user_id' => $agencyAdmin->id,
        'type' => 'research.submitted',
        'title' => 'Own notification',
        'message' => 'A notification for the agency admin.',
        'status' => 'unread',
    ]);
    $agencyNotification = Notification::create([
        'agency_id' => $agency->id,
        'type' => 'research.archived',
        'title' => 'Agency notification',
        'message' => 'A notification for the agency.',
        'status' => 'unread',
    ]);
    $otherNotification = Notification::create([
        'user_id' => $otherUser->id,
        'type' => 'private',
        'title' => 'Other notification',
        'message' => 'A notification for another user.',
        'status' => 'unread',
    ]);
    $systemNotification = Notification::create([
        'type' => 'system',
        'title' => 'System notification',
        'message' => 'A notification for admins.',
        'status' => 'unread',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$ownNotification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'read');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$otherNotification->id}/read")
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->postJson('/api/agency/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 0);

    $this->assertDatabaseHas('notifications', [
        'id' => $agencyNotification->id,
        'status' => 'read',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$ownNotification->id}/unread")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'unread')
        ->assertJsonPath('data.notification.read_at', null)
        ->assertJsonPath('data.unread_count', 1);

    $this->assertDatabaseHas('notifications', [
        'id' => $ownNotification->id,
        'status' => 'unread',
        'read_at' => null,
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$otherNotification->id}/unread")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/notifications/{$systemNotification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'read');
});
