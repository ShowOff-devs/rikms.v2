<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\ResearchReportHighlight;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

test('draft revision duplicate quota and supporting limits are concurrency safe on mysql', function () {
    if (DB::connection()->getDriverName() !== 'mysql') {
        $this->markTestSkipped('Requires the isolated MySQL integration database for genuine row-lock concurrency.');
    }

    expect((string) DB::connection()->getDatabaseName())->toMatch('/(?:^|_)test(?:_|$)/i');
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);

    [$draftAgency, $draftUser, $draft] = phase2ConcurrencyContext('draft', 'draft');
    $draft->update(['category' => 'Terminal Report']);
    $draft->reportDetail()->create(['draft_version' => 0]);
    $draftTrigger = 'phase2_draft_concurrency_delay';

    try {
        DB::unprepared("DROP TRIGGER IF EXISTS {$draftTrigger}");
        DB::unprepared("CREATE TRIGGER {$draftTrigger} BEFORE UPDATE ON research FOR EACH ROW DO SLEEP(1)");
        $draftResults = phase2RunPair('draft_save', $draftUser, [
            ['research_id' => $draft->id, 'title' => 'Concurrent Draft A', 'expected_draft_version' => 0],
            ['research_id' => $draft->id, 'title' => 'Concurrent Draft B', 'expected_draft_version' => 0],
        ]);
    } finally {
        DB::unprepared("DROP TRIGGER IF EXISTS {$draftTrigger}");
    }

    expect($draftResults->pluck('http_status')->sort()->values()->all())->toBe([200, 409])
        ->and($draft->fresh()->title)->toBeIn(['Concurrent Draft A', 'Concurrent Draft B'])
        ->and($draft->fresh()->reportDetail->draft_version)->toBe(1);

    [, $revisionUser, $published] = phase2ConcurrencyContext('revision', 'published');
    $revisionResults = phase2RunPair('create_revision', $revisionUser, [
        ['research_id' => $published->id],
        ['research_id' => $published->id],
    ]);

    expect($revisionResults->pluck('http_status')->sort()->values()->all())->toBe([200, 201])
        ->and($revisionResults->pluck('research_id')->unique()->count())->toBe(1)
        ->and(Research::query()->where('active_revision_parent_id', $published->id)->count())->toBe(1);

    [, $duplicateUser, $duplicateResearch] = phase2ConcurrencyContext('duplicate', 'draft');
    $duplicateChecksum = hash('sha256', 'same-concurrent-upload');
    $duplicateResults = phase2RunPair('commit_main', $duplicateUser, [
        phase2UploadPayload($duplicateResearch, 'duplicate-a', $duplicateChecksum, 10_000),
        phase2UploadPayload($duplicateResearch, 'duplicate-b', $duplicateChecksum, 10_000),
    ]);

    expect($duplicateResults->pluck('outcome')->sort()->values()->all())->toBe(['rejected', 'success'])
        ->and(ResearchFile::query()->where('research_id', $duplicateResearch->id)->count())->toBe(1);

    [$quotaAgency, $quotaUser, $quotaResearch] = phase2ConcurrencyContext('quota', 'draft');
    config()->set('rikms.uploads.agency_quota_mb', 1);
    ResearchFile::create(array_merge(
        phase2StoredFileAttributes($quotaResearch, 'quota-existing', hash('sha256', 'quota-existing'), 1_000_000),
        ['uploaded_by' => $quotaUser->id],
    ));
    $quotaResults = phase2RunPair('commit_main', $quotaUser, [
        phase2UploadPayload($quotaResearch, 'quota-a', hash('sha256', 'quota-a'), 30_000, 1),
        phase2UploadPayload($quotaResearch, 'quota-b', hash('sha256', 'quota-b'), 30_000, 1),
    ]);

    expect($quotaResults->pluck('outcome')->sort()->values()->all())->toBe(['rejected', 'success'])
        ->and((int) ResearchFile::query()->where('agency_id', $quotaAgency->id)->sum('size_bytes'))->toBe(1_030_000);

    [, $supportUser, $supportResearch] = phase2ConcurrencyContext('support', 'draft');
    $highlight = ResearchReportHighlight::create([
        'research_id' => $supportResearch->id,
        'title' => 'Concurrent supporting files',
        'description' => 'Supporting-file count concurrency verification.',
        'sort_order' => 0,
    ]);

    foreach (range(1, 4) as $index) {
        ResearchFile::create(array_merge(
            phase2StoredFileAttributes($supportResearch, "support-existing-{$index}", hash('sha256', "support-existing-{$index}"), 1_000),
            [
                'uploaded_by' => $supportUser->id,
                'report_highlight_id' => $highlight->id,
                'file_type' => 'report-highlight-supporting',
            ],
        ));
    }

    $supportResults = phase2RunPair('commit_supporting', $supportUser, [
        array_merge(phase2UploadPayload($supportResearch, 'support-a', hash('sha256', 'support-a'), 1_000), [
            'highlight_id' => $highlight->id,
            'maximum_files' => 5,
        ]),
        array_merge(phase2UploadPayload($supportResearch, 'support-b', hash('sha256', 'support-b'), 1_000), [
            'highlight_id' => $highlight->id,
            'maximum_files' => 5,
        ]),
    ]);

    expect($supportResults->pluck('outcome')->sort()->values()->all())->toBe(['rejected', 'success'])
        ->and(ResearchFile::query()
            ->where('report_highlight_id', $highlight->id)
            ->where('status', 'active')
            ->whereNull('archived_at')
            ->count())->toBe(5);
});

/** @return array{Agency, User, Research} */
function phase2ConcurrencyContext(string $suffix, string $status): array
{
    $agency = Agency::create([
        'slug' => "phase2-concurrency-{$suffix}",
        'name' => "Phase 2 Concurrency {$suffix}",
        'short_name' => 'P2'.mb_strtoupper(mb_substr($suffix, 0, 6)),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $research = Research::create([
        'slug' => "phase2-concurrency-{$suffix}-research",
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => "Phase 2 {$suffix} research",
        'abstract' => 'Independent-process Phase 2 concurrency verification.',
        'authors' => ['Concurrency Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'status' => $status,
        'access_level' => 'restricted',
        'published_at' => $status === 'published' ? now() : null,
    ]);

    return [$agency, $user, $research];
}

function phase2UploadPayload(Research $research, string $name, string $checksum, int $size, int $quotaMb = 10240): array
{
    return [
        'research_id' => $research->id,
        'original_name' => "{$name}.pdf",
        'stored_name' => "{$name}.pdf",
        'path' => "research/testing/{$name}.pdf",
        'checksum' => $checksum,
        'size_bytes' => $size,
        'quota_mb' => $quotaMb,
    ];
}

function phase2StoredFileAttributes(Research $research, string $name, string $checksum, int $size): array
{
    return [
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'original_name' => "{$name}.pdf",
        'stored_name' => "{$name}.pdf",
        'disk' => 'local',
        'path' => "research/testing/{$name}.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => $size,
        'checksum' => $checksum,
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ];
}

function phase2RunPair(string $operation, User $user, array $payloads)
{
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rikms-phase2-'.Str::uuid();
    mkdir($directory, 0700, true);
    $goPath = $directory.DIRECTORY_SEPARATOR.'go';
    $processes = [];

    try {
        foreach ($payloads as $index => $payload) {
            $readyPath = $directory.DIRECTORY_SEPARATOR."ready-{$index}";
            $resultPath = $directory.DIRECTORY_SEPARATOR."result-{$index}.json";
            $process = new Process([
                PHP_BINARY,
                base_path('tests/Support/run_research_write_operation.php'),
                $operation,
                base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)),
                (string) $user->id,
                $readyPath,
                $goPath,
                $resultPath,
            ], base_path(), timeout: 40);
            $process->start();
            $processes[] = compact('process', 'readyPath', 'resultPath');
        }

        $deadline = microtime(true) + 15;

        while (! collect($processes)->every(fn (array $item): bool => file_exists($item['readyPath']))) {
            if (microtime(true) >= $deadline) {
                throw new RuntimeException('Concurrent Phase 2 workers did not reach the start barrier.');
            }

            usleep(10_000);
            clearstatcache();
        }

        file_put_contents($goPath, 'go');

        foreach ($processes as $item) {
            $item['process']->wait();

            if (! $item['process']->isSuccessful()) {
                throw new RuntimeException($item['process']->getErrorOutput());
            }
        }

        $results = collect($processes)->map(
            fn (array $item): array => json_decode(file_get_contents($item['resultPath']), true, flags: JSON_THROW_ON_ERROR),
        );

        if ($results->contains(fn (array $result): bool => $result['outcome'] === 'error')) {
            throw new RuntimeException('Concurrent Phase 2 worker failed: '.json_encode($results->all(), JSON_THROW_ON_ERROR));
        }

        return $results;
    } finally {
        foreach ($processes as $item) {
            if ($item['process']->isRunning()) {
                $item['process']->stop();
            }
        }

        foreach (glob($directory.DIRECTORY_SEPARATOR.'*') ?: [] as $path) {
            unlink($path);
        }

        rmdir($directory);
    }
}
