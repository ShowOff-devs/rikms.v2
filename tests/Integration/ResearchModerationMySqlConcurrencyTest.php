<?php

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\User;
use App\Services\ResearchModerationTransitionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

test('conflicting moderation decisions cannot both commit on mysql', function () {
    if (DB::connection()->getDriverName() !== 'mysql') {
        $this->markTestSkipped('Requires the isolated MySQL integration database for genuine row-lock concurrency.');
    }

    expect((string) DB::connection()->getDatabaseName())->toMatch('/(?:^|_)test(?:_|$)/i');
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);

    $agency = Agency::create([
        'slug' => 'mysql-moderation-concurrency',
        'name' => 'MySQL Moderation Concurrency',
        'short_name' => 'MMC',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $agencyAdmin = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $superAdmin = User::factory()->create([
        'agency_id' => null,
        'role' => 'super_admin',
        'status' => 'active',
    ]);
    $research = Research::create([
        'slug' => 'mysql-moderation-concurrency-record',
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'title' => 'MySQL Moderation Concurrency Record',
        'abstract' => 'A genuine independent-process concurrency regression record.',
        'authors' => ['Concurrency Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['concurrency'],
        'status' => 'submitted',
        'access_level' => 'public',
        'submitted_at' => now(),
    ]);
    $trigger = 'research_moderation_concurrency_delay';
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rikms-moderation-'.Str::uuid();
    mkdir($directory, 0700, true);
    $goPath = $directory.DIRECTORY_SEPARATOR.'go';
    $processes = [];

    try {
        DB::unprepared("DROP TRIGGER IF EXISTS {$trigger}");
        DB::unprepared("CREATE TRIGGER {$trigger} BEFORE UPDATE ON research FOR EACH ROW DO SLEEP(1)");

        foreach ([ResearchModerationTransitionService::APPROVE, ResearchModerationTransitionService::REJECT] as $index => $action) {
            $readyPath = $directory.DIRECTORY_SEPARATOR."ready-{$index}";
            $resultPath = $directory.DIRECTORY_SEPARATOR."result-{$index}.json";
            $process = new Process([
                PHP_BINARY,
                base_path('tests/Support/run_research_moderation_transition.php'),
                (string) $research->id,
                (string) $superAdmin->id,
                $action,
                $readyPath,
                $goPath,
                $resultPath,
            ], base_path(), timeout: 30);
            $process->start();
            $processes[] = compact('process', 'readyPath', 'resultPath');
        }

        $deadline = microtime(true) + 10;

        while (! collect($processes)->every(fn (array $item): bool => file_exists($item['readyPath']))) {
            if (microtime(true) >= $deadline) {
                $this->fail('Concurrent moderation workers did not reach the start barrier.');
            }

            usleep(10_000);
            clearstatcache();
        }

        file_put_contents($goPath, 'go');

        foreach ($processes as $item) {
            $item['process']->wait();
            expect($item['process']->isSuccessful())->toBeTrue($item['process']->getErrorOutput());
        }

        $results = collect($processes)
            ->map(fn (array $item): array => json_decode(file_get_contents($item['resultPath']), true, flags: JSON_THROW_ON_ERROR));

        $audit = AuditLog::query()->where('auditable_id', $research->id)->sole();
        $notification = Notification::query()->where('agency_id', $agency->id)->sole();

        expect($results->pluck('outcome')->sort()->values()->all())->toBe(['conflict', 'success'])
            ->and($results->firstWhere('outcome', 'conflict')['http_status'])->toBe(409)
            ->and($research->fresh()->status)->toBeIn(['approved', 'rejected'])
            ->and(ResearchApproval::query()->where('research_id', $research->id)->count())->toBe(1)
            ->and(AuditLog::query()->where('auditable_id', $research->id)->count())->toBe(1)
            ->and(Notification::query()->where('agency_id', $agency->id)->count())->toBe(1)
            ->and(Str::isUuid($audit->transition_id))->toBeTrue()
            ->and($notification->transition_id)->toBe($audit->transition_id);
    } finally {
        foreach ($processes as $item) {
            if ($item['process']->isRunning()) {
                $item['process']->stop();
            }
        }

        DB::unprepared("DROP TRIGGER IF EXISTS {$trigger}");

        foreach (glob($directory.DIRECTORY_SEPARATOR.'*') ?: [] as $path) {
            unlink($path);
        }

        rmdir($directory);
    }
});
