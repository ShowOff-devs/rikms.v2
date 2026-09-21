<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Jobs\RecordQueueWorkerHeartbeat;
use App\Notifications\AccessRequestApprovedNotification;
use App\Notifications\AccessRequestDeniedNotification;
use App\Services\RuntimeHeartbeat;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

test('database queue reservation exceeds every configured job timeout', function () {
    $jobs = [
        new ParsePdfDocumentJob(1, 1, 1, 1),
        new ExtractResearchMetadataJob(1, 1, 1, 1),
        new ClassifyResearchSdgJob(1, 1, 1, 1),
    ];
    $retryAfter = (int) config('queue.connections.database.retry_after');

    expect($retryAfter)->toBeGreaterThan(max(array_map(fn (object $job): int => $job->timeout, $jobs)))
        ->and(config('queue.failed.driver'))->toBe('database-uuids')
        ->and(config('queue.failed.table'))->toBe('failed_jobs');
});

test('retryable jobs and notifications have bounded attempts timeouts and backoff', function () {
    $retryable = [
        new ExtractResearchMetadataJob(1, 1, 1, 1),
        new ClassifyResearchSdgJob(1, 1, 1, 1),
        new AccessRequestApprovedNotification([]),
        new AccessRequestDeniedNotification([]),
    ];

    foreach ($retryable as $job) {
        expect($job->tries)->toBe(3)
            ->and($job->timeout)->toBeLessThan(180)
            ->and($job->backoff)->toBe([10, 30, 60]);
    }

    expect((new ParsePdfDocumentJob(1, 1, 1, 1))->tries)->toBe(1);
});

test('scheduler monitors queue depth every minute without overlap', function () {
    $queueConnection = (string) config('queue.default');
    $events = collect(app(Schedule::class)->events());
    $event = $events
        ->first(fn ($event): bool => str_contains($event->command ?? '', "queue:monitor {$queueConnection}:health,{$queueConnection}:default --max=100"));
    $schedulerHeartbeat = $events->firstWhere('description', 'rikms:scheduler-heartbeat');
    $workerHeartbeat = $events->firstWhere('description', 'rikms:queue-worker-heartbeat');
    $cspPrune = $events->first(fn ($event): bool => str_contains($event->command ?? '', 'csp:prune-reports'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('* * * * *')
        ->and($event->withoutOverlapping)->toBeTrue()
        ->and($schedulerHeartbeat)->not->toBeNull()
        ->and($schedulerHeartbeat->expression)->toBe('* * * * *')
        ->and($schedulerHeartbeat->withoutOverlapping)->toBeTrue()
        ->and($workerHeartbeat)->not->toBeNull()
        ->and($workerHeartbeat->expression)->toBe('* * * * *')
        ->and($workerHeartbeat->withoutOverlapping)->toBeTrue()
        ->and($cspPrune)->not->toBeNull()
        ->and($cspPrune->expression)->toBe('15 2 * * *')
        ->and($cspPrune->withoutOverlapping)->toBeTrue();
});

test('runtime check proves fresh scheduler and worker heartbeats', function () {
    config()->set('queue.default', 'database');
    Cache::flush();
    $heartbeat = app(RuntimeHeartbeat::class);
    $heartbeat->recordScheduler();
    (new RecordQueueWorkerHeartbeat)->handle($heartbeat);

    expect($heartbeat->status())
        ->scheduler->healthy->toBeTrue()
        ->worker->healthy->toBeTrue()
        ->and(Artisan::call('rikms:runtime-check'))->toBe(0)
        ->and(Artisan::output())->toContain('RIKMS queue and scheduler are healthy.');
});

test('runtime check fails safely when heartbeat storage is unavailable', function () {
    config()->set('queue.default', 'database');

    $heartbeat = Mockery::mock(RuntimeHeartbeat::class);
    $heartbeat->shouldReceive('status')
        ->once()
        ->andThrow(new RuntimeException('cache credentials must not be displayed'));
    app()->instance(RuntimeHeartbeat::class, $heartbeat);

    expect(Artisan::call('rikms:runtime-check'))->toBe(1)
        ->and(Artisan::output())->toContain('RIKMS queue/scheduler runtime check failed.')
        ->not->toContain('cache credentials must not be displayed');
});

test('ubuntu worker and scheduler examples preserve graceful operational boundaries', function () {
    $queueUnit = file_get_contents(base_path('deploy/systemd/rikms-queue.service'));
    $schedulerUnit = file_get_contents(base_path('deploy/systemd/rikms-scheduler.service'));
    $schedulerTimer = file_get_contents(base_path('deploy/systemd/rikms-scheduler.timer'));

    expect($queueUnit)
        ->toContain('queue:work --queue=health,default')
        ->toContain('EnvironmentFile=-/etc/rikms/rikms.env')
        ->toContain('--tries=3')
        ->toContain('--timeout=120')
        ->toContain('ExecReload=/usr/bin/php artisan queue:restart')
        ->toContain('KillSignal=SIGTERM')
        ->toContain('TimeoutStopSec=130')
        ->toContain('UMask=0027')
        ->toContain('NoNewPrivileges=true')
        ->toContain('ReadWritePaths=/var/www/rikms/storage /var/www/rikms/bootstrap/cache')
        ->and($schedulerUnit)->toContain('artisan schedule:run --no-interaction')
        ->toContain('EnvironmentFile=-/etc/rikms/rikms.env')
        ->toContain('UMask=0027')
        ->toContain('NoNewPrivileges=true')
        ->and($schedulerTimer)->toContain('OnCalendar=*-*-* *:*:00')
        ->toContain('Persistent=true');
});

test('backup execution remains unavailable instead of exposing an unsafe helper', function () {
    $backupRoutes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route): bool => str_contains($route->uri(), 'backup'));
    $component = file_get_contents(resource_path('js/components/admin/platform-settings/BackupRecoverySettings.tsx'));

    expect($backupRoutes)->toHaveCount(1)
        ->and($backupRoutes->first()->uri())->toBe('api/admin/platform-settings/backup-readiness')
        ->and($backupRoutes->first()->methods())->toBe(['GET', 'HEAD'])
        ->and($component)->toContain('Check Backup Readiness')
        ->toContain('Backup execution and automatic deletion remain disabled.');
});
