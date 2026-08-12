<?php

namespace App\Console\Commands;

use App\Services\MonitoringAlertDispatcher;
use App\Services\MonitoringHealthService;
use Illuminate\Console\Command;

class CheckMonitoringHealth extends Command
{
    protected $signature = 'rikms:monitor-check {--alert : Deliver a deduplicated alert or recovery notification} {--json : Output machine-readable JSON}';

    protected $description = 'Check database, runtime, queues, storage, security events, ClamAV, backups, and alert delivery';

    public function handle(MonitoringHealthService $monitoring, MonitoringAlertDispatcher $alerts): int
    {
        $report = $monitoring->report();
        $delivery = $this->option('alert') ? $alerts->dispatch($report) : null;

        if ($this->option('json')) {
            $this->line((string) json_encode([
                ...$report,
                'alert_delivery_result' => $delivery,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(
                ['Check', 'Status', 'Details'],
                array_map(fn (array $check): array => [
                    $check['label'],
                    strtoupper($check['status']),
                    $check['message'],
                ], $report['checks']),
            );
            $this->line('Overall status: '.strtoupper($report['status']));

            if ($delivery !== null) {
                $this->line('Alert delivery: '.$delivery['status']);
            }
        }

        return $report['status'] === 'healthy' ? self::SUCCESS : self::FAILURE;
    }
}
