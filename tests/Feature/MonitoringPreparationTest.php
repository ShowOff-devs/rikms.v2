<?php

use App\Mail\MonitoringAlertMail;
use App\Services\MonitoringAlertDispatcher;
use App\Services\MonitoringHealthService;
use App\Services\RuntimeHeartbeat;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

function monitoringTestReport(string $status, string $checkStatus): array
{
    return [
        'status' => $status,
        'checks' => [[
            'id' => 'test_check',
            'label' => 'Test check',
            'status' => $checkStatus,
            'message' => $checkStatus === 'healthy' ? 'Recovered.' : 'Controlled test failure.',
            'metrics' => [],
        ]],
        'checked_at' => now()->toIso8601String(),
    ];
}

test('unified monitor reports healthy local infrastructure with optional services skipped', function () {
    Storage::fake('upload_quarantine');
    Storage::fake('private_uploads');
    config()->set([
        'rikms.uploads.malware_scanner' => 'none',
        'monitoring.alerts_enabled' => false,
        'monitoring.require_backup_ready' => false,
    ]);
    $heartbeat = app(RuntimeHeartbeat::class);
    $heartbeat->recordScheduler();
    $heartbeat->recordWorker();

    $report = app(MonitoringHealthService::class)->report();

    expect($report['status'])->toBe('healthy')
        ->and(collect($report['checks'])->firstWhere('id', 'database')['status'])->toBe('healthy')
        ->and(collect($report['checks'])->firstWhere('id', 'scheduler_heartbeat')['status'])->toBe('healthy')
        ->and(collect($report['checks'])->firstWhere('id', 'worker_heartbeat')['status'])->toBe('healthy')
        ->and(collect($report['checks'])->firstWhere('id', 'clamav')['status'])->toBe('skipped')
        ->and(collect($report['checks'])->firstWhere('id', 'backup')['status'])->toBe('skipped')
        ->and(collect($report['checks'])->firstWhere('id', 'alert_delivery')['status'])->toBe('skipped');
});

test('unified monitor detects a critical queue backlog', function () {
    Storage::fake('upload_quarantine');
    Storage::fake('private_uploads');
    config()->set([
        'rikms.uploads.malware_scanner' => 'none',
        'monitoring.alerts_enabled' => false,
        'monitoring.thresholds.pending_jobs_warning' => 1,
        'monitoring.thresholds.pending_jobs_critical' => 1,
    ]);
    $heartbeat = app(RuntimeHeartbeat::class);
    $heartbeat->recordScheduler();
    $heartbeat->recordWorker();
    DB::table('jobs')->insert([
        'queue' => 'default',
        'payload' => '{}',
        'attempts' => 0,
        'reserved_at' => null,
        'available_at' => now()->timestamp,
        'created_at' => now()->timestamp,
    ]);

    $report = app(MonitoringHealthService::class)->report();
    $queue = collect($report['checks'])->firstWhere('id', 'queue_backlog');

    expect($report['status'])->toBe('critical')
        ->and($queue['status'])->toBe('critical')
        ->and($queue['metrics']['pending_jobs'])->toBe(1);
});

test('webhook alerts are synchronous cooldown limited and followed by recovery', function () {
    $statePath = storage_path('framework/testing/monitoring-'.Str::uuid().'.json');
    config()->set([
        'monitoring.alerts_enabled' => true,
        'monitoring.alert_emails' => [],
        'monitoring.alert_webhook_url' => 'https://alerts.example.test/rikms-secret',
        'monitoring.alert_timeout_seconds' => 2,
        'monitoring.alert_cooldown_minutes' => 30,
        'monitoring.send_recovery_alerts' => true,
        'monitoring.state_path' => $statePath,
    ]);
    Http::fake(['alerts.example.test/*' => Http::response([], 204)]);
    $dispatcher = app(MonitoringAlertDispatcher::class);

    try {
        $first = $dispatcher->dispatch(monitoringTestReport('warning', 'warning'));
        $duplicate = $dispatcher->dispatch(monitoringTestReport('warning', 'warning'));
        $recovery = $dispatcher->dispatch(monitoringTestReport('healthy', 'healthy'));

        expect($first['status'])->toBe('alert_sent')
            ->and($duplicate['status'])->toBe('cooldown_suppressed')
            ->and($recovery['status'])->toBe('recovery_sent');
        Http::assertSentCount(2);
        Http::assertSent(fn ($request): bool => $request['event'] === 'rikms.monitor.alert');
        Http::assertSent(fn ($request): bool => $request['event'] === 'rikms.monitor.recovered');
    } finally {
        @unlink($statePath);
    }
});

test('enabled alert delivery fails closed without a valid destination', function () {
    $statePath = storage_path('framework/testing/monitoring-'.Str::uuid().'.json');
    config()->set([
        'monitoring.alerts_enabled' => true,
        'monitoring.alert_emails' => [],
        'monitoring.alert_webhook_url' => '',
        'monitoring.state_path' => $statePath,
    ]);

    try {
        $result = app(MonitoringAlertDispatcher::class)->dispatch(monitoringTestReport('critical', 'critical'));

        expect($result['status'])->toBe('delivery_failed')
            ->and($result['deliveries'])->toBe([['channel' => 'none', 'status' => 'failed']]);
    } finally {
        @unlink($statePath);
    }
});

test('email alerts are sent synchronously without the monitored queue', function () {
    $statePath = storage_path('framework/testing/monitoring-'.Str::uuid().'.json');
    config()->set([
        'monitoring.alerts_enabled' => true,
        'monitoring.alert_emails' => ['operations@example.test'],
        'monitoring.alert_webhook_url' => '',
        'monitoring.state_path' => $statePath,
    ]);
    Mail::fake();

    try {
        $result = app(MonitoringAlertDispatcher::class)->dispatch(monitoringTestReport('critical', 'critical'));

        expect($result['status'])->toBe('alert_sent');
        Mail::assertSent(MonitoringAlertMail::class, function (MonitoringAlertMail $mail): bool {
            return $mail->hasTo('operations@example.test')
                && $mail->alertSubject === '[RIKMS] CRITICAL monitoring status'
                && str_contains($mail->alertBody, 'Controlled test failure.');
        });
        Mail::assertNothingQueued();
    } finally {
        @unlink($statePath);
    }
});

test('monitor command supports machine readable output and nonzero unhealthy status', function () {
    $monitoring = Mockery::mock(MonitoringHealthService::class);
    $monitoring->shouldReceive('report')->once()->andReturn(monitoringTestReport('critical', 'critical'));
    $alerts = Mockery::mock(MonitoringAlertDispatcher::class);
    $alerts->shouldNotReceive('dispatch');
    $this->app->instance(MonitoringHealthService::class, $monitoring);
    $this->app->instance(MonitoringAlertDispatcher::class, $alerts);

    expect(Artisan::call('rikms:monitor-check', ['--json' => true]))->toBe(1)
        ->and(json_decode(Artisan::output(), true)['status'])->toBe('critical');
});

test('independent monitoring systemd examples run outside the scheduler and queue', function () {
    $service = file_get_contents(base_path('deploy/systemd/rikms-monitor.service'));
    $timer = file_get_contents(base_path('deploy/systemd/rikms-monitor.timer'));
    $alloy = file_get_contents(base_path('deploy/grafana-alloy/rikms.alloy.example'));

    expect($service)
        ->toContain('rikms:monitor-check --alert --no-interaction')
        ->toContain('Type=oneshot')
        ->toContain('TimeoutStartSec=45')
        ->toContain('NoNewPrivileges=true')
        ->and($timer)
        ->toContain('OnUnitActiveSec=5min')
        ->toContain('Persistent=true')
        ->and($alloy)
        ->toContain('loki.source.journal')
        ->toContain('GRAFANA_CLOUD_LOKI_TOKEN')
        ->not->toContain('password = "');
});
