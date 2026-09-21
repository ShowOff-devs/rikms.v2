<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\ResearchReportHighlight;
use App\Models\User;
use App\Services\ResearchUploadCommitService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

function phase2ProtectionContext(string $suffix, string $status = 'draft'): array
{
    $agency = Agency::create([
        'slug' => "phase2-protection-{$suffix}",
        'name' => "Phase 2 Protection {$suffix}",
        'short_name' => 'P2P'.mb_strtoupper(mb_substr($suffix, 0, 5)),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $research = Research::create([
        'slug' => "phase2-protection-{$suffix}-research",
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => "Phase 2 protection {$suffix}",
        'status' => $status,
        'access_level' => 'restricted',
        'published_at' => $status === 'published' ? now() : null,
    ]);

    return [$agency, $user, $research];
}

function phase2ProtectionFile(Research $research, User $user, string $name, string $checksum, array $extra = []): ResearchFile
{
    return ResearchFile::create(array_merge([
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'uploaded_by' => $user->id,
        'original_name' => "{$name}.pdf",
        'stored_name' => "{$name}.pdf",
        'disk' => 'local',
        'path' => "research/testing/{$name}.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => $checksum,
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ], $extra));
}

test('active revision identity is unique and released when the prior revision is archived', function () {
    [, $user, $published] = phase2ProtectionContext('revisions', 'published');
    $revision = Research::create([
        'slug' => 'phase2-protection-revision-two',
        'agency_id' => $published->agency_id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $published->id,
        'revision_number' => 2,
        'title' => $published->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    expect(fn () => Research::create([
        'slug' => 'phase2-protection-revision-race',
        'agency_id' => $published->agency_id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $published->id,
        'revision_number' => 2,
        'title' => $published->title,
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]))->toThrow(QueryException::class);

    $revision->update(['status' => 'archived', 'archived_at' => now()]);
    $replacement = Research::create([
        'slug' => 'phase2-protection-revision-replacement',
        'agency_id' => $published->agency_id,
        'uploaded_by' => $user->id,
        'revision_parent_id' => $published->id,
        'revision_number' => 2,
        'title' => $published->title,
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    expect($revision->fresh()->active_revision_parent_id)->toBeNull()
        ->and($replacement->active_revision_parent_id)->toBe($published->id);
});

test('archived supporting files do not consume an active file-count slot', function () {
    [, $user, $research] = phase2ProtectionContext('supporting-lifecycle');
    $highlight = ResearchReportHighlight::create([
        'research_id' => $research->id,
        'title' => 'Supporting lifecycle',
        'description' => 'Archived supporting files are retained without consuming an active slot.',
        'sort_order' => 0,
    ]);

    foreach (range(1, 5) as $index) {
        phase2ProtectionFile($research, $user, "archived-support-{$index}", hash('sha256', "archived-support-{$index}"), [
            'report_highlight_id' => $highlight->id,
            'file_type' => 'report-highlight-supporting',
            'status' => 'archived',
            'archived_at' => now(),
        ]);
    }

    $request = Request::create('/phase2-protection', 'POST');
    $request->setUserResolver(fn (): User => $user);
    $file = app(ResearchUploadCommitService::class)->commitSupporting(
        $request,
        (int) $research->id,
        (int) $highlight->id,
        5,
        [
            'original_name' => 'new-support.pdf',
            'stored_name' => 'new-support.pdf',
            'disk' => 'local',
            'path' => 'research/testing/new-support.pdf',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 1024,
            'checksum' => hash('sha256', 'new-support'),
            'file_type' => 'report-highlight-supporting',
            'visibility' => 'private',
            'access_level' => 'restricted',
            'status' => 'active',
            'uploaded_at' => now(),
        ],
    );

    expect($file)->toBeInstanceOf(ResearchFile::class)
        ->and($highlight->files()->where('status', 'active')->whereNull('archived_at')->count())->toBe(1);
});
