<?php

namespace App\Services;

use App\Models\SecurityEvent;
use App\Services\MalwareScanner\ClamAvReadinessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class MonitoringHealthService
{
    public function __construct(
        private readonly RuntimeHeartbeat $heartbeat,
        private readonly ClamAvReadinessService $clamAv,
        private readonly BackupReadinessService $backup,
        private readonly QueueHealthService $queueHealth,
    ) {}

    /** @return array{status: string, checks: array<int, array<string, mixed>>, checked_at: string} */
    public function report(): array
    {
        $checks = [];
        $databaseReady = $this->databaseCheck($checks);

        if ($databaseReady) {
            $this->queueChecks($checks);
            $this->securityEventCheck($checks);
        }

        $this->runtimeChecks($checks);
        $this->storageChecks($checks);
        $this->clamAvCheck($checks);
        $this->backupCheck($checks);
        $this->alertDeliveryCheck($checks);

        return [
            'status' => $this->overallStatus($checks),
            'checks' => $checks,
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function databaseCheck(array &$checks): bool
    {
        try {
            DB::connection()->getPdo();
            $this->add($checks, 'database', 'Database connectivity', 'healthy', 'Database connection succeeded.');

            return true;
        } catch (Throwable) {
            $this->add($checks, 'database', 'Database connectivity', 'critical', 'Database connection failed.');

            return false;
        }
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function queueChecks(array &$checks): void
    {
        try {
            $snapshot = $this->queueHealth->snapshot();
        } catch (Throwable) {
            $this->add($checks, 'queue_storage', 'Queue storage', 'critical', 'Queue backend or failed-job storage is unavailable.');

            return;
        }

        $pending = $snapshot['pending_jobs'];
        $failed = $snapshot['failed_jobs'];
        $oldestMinutes = $snapshot['oldest_pending_job_age_minutes'];
        $pendingWarning = max(1, (int) config('monitoring.thresholds.pending_jobs_warning', 100));
        $pendingCritical = max($pendingWarning, (int) config('monitoring.thresholds.pending_jobs_critical', 500));
        $oldestWarning = max(1, (int) config('monitoring.thresholds.oldest_job_warning_minutes', 5));
        $oldestCritical = max($oldestWarning, (int) config('monitoring.thresholds.oldest_job_critical_minutes', 60));

        $queueStatus = match (true) {
            $pending >= $pendingCritical || ($oldestMinutes !== null && $oldestMinutes >= $oldestCritical) => 'critical',
            $pending >= $pendingWarning || ($oldestMinutes !== null && $oldestMinutes >= $oldestWarning) => 'warning',
            default => 'healthy',
        };

        $this->add(
            $checks,
            'queue_backlog',
            'Queue backlog',
            $queueStatus,
            $oldestMinutes === null
                ? "{$pending} pending; oldest age is not exposed by this queue driver."
                : "{$pending} pending; oldest {$oldestMinutes} minute(s).",
            ['pending_jobs' => $pending, 'oldest_job_age_minutes' => $oldestMinutes],
        );

        $failedCritical = max(1, (int) config('monitoring.thresholds.failed_jobs_critical', 5));
        $failedStatus = match (true) {
            $failed >= $failedCritical => 'critical',
            $failed > 0 => 'warning',
            default => 'healthy',
        };
        $this->add(
            $checks,
            'failed_jobs',
            'Failed jobs',
            $failedStatus,
            "{$failed} failed job(s) require review.",
            ['failed_jobs' => $failed],
        );
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function runtimeChecks(array &$checks): void
    {
        try {
            $runtime = $this->heartbeat->status();

            foreach (['scheduler', 'worker'] as $component) {
                $status = $runtime[$component];
                $healthy = $status['healthy'] === true;
                $age = $status['age_seconds'];
                $this->add(
                    $checks,
                    $component.'_heartbeat',
                    ucfirst($component).' heartbeat',
                    $healthy ? 'healthy' : 'critical',
                    $healthy ? "Last seen {$age} second(s) ago." : 'Heartbeat is missing or stale.',
                    ['age_seconds' => $age, 'last_seen_at' => $status['last_seen_at']],
                );
            }
        } catch (Throwable) {
            $this->add($checks, 'runtime_heartbeat', 'Runtime heartbeats', 'critical', 'Heartbeat state could not be read.');
        }
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function storageChecks(array &$checks): void
    {
        $disks = array_unique([
            (string) config('rikms.uploads.quarantine_disk'),
            (string) config('rikms.uploads.storage_disk'),
        ]);

        foreach ($disks as $disk) {
            $configuration = config("filesystems.disks.{$disk}");

            if (! is_array($configuration)) {
                $this->add($checks, 'storage_'.$disk, "Storage disk {$disk}", 'critical', 'Disk configuration is missing.');

                continue;
            }

            if (($configuration['driver'] ?? null) !== 'local') {
                $this->add($checks, 'storage_'.$disk, "Storage disk {$disk}", 'healthy', 'Non-local disk is configured; provider monitoring is required.');

                continue;
            }

            $root = (string) ($configuration['root'] ?? '');
            $available = $root !== '' && is_dir($root) && is_readable($root) && is_writable($root);

            if (! $available) {
                $this->add($checks, 'storage_'.$disk, "Storage disk {$disk}", 'critical', 'Local disk is missing or inaccessible.');

                continue;
            }

            $usedPercent = $this->diskUsedPercent($root);
            $warning = max(1, (int) config('monitoring.thresholds.disk_warning_percent', 80));
            $critical = max($warning, (int) config('monitoring.thresholds.disk_critical_percent', 90));
            $status = match (true) {
                $usedPercent === null => 'warning',
                $usedPercent >= $critical => 'critical',
                $usedPercent >= $warning => 'warning',
                default => 'healthy',
            };
            $message = $usedPercent === null ? 'Disk usage could not be determined.' : "Disk usage is {$usedPercent}%.";
            $this->add($checks, 'storage_'.$disk, "Storage disk {$disk}", $status, $message, ['used_percent' => $usedPercent]);
        }
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function securityEventCheck(array &$checks): void
    {
        if (! Schema::hasTable('security_events')) {
            $this->add($checks, 'security_events', 'Security events', 'critical', 'Security event storage is missing.');

            return;
        }

        $lookback = max(1, (int) config('monitoring.thresholds.security_lookback_minutes', 15));
        $query = SecurityEvent::query()->whereNull('resolved_at')->where('created_at', '>=', now()->subMinutes($lookback));
        $critical = (clone $query)->where('severity', 'critical')->count();
        $high = (clone $query)->where('severity', 'high')->count();
        $status = match (true) {
            $critical > 0 => 'critical',
            $high > 0 => 'warning',
            default => 'healthy',
        };

        $this->add(
            $checks,
            'security_events',
            'Recent security events',
            $status,
            "{$critical} critical and {$high} high event(s) in the last {$lookback} minute(s).",
            ['critical' => $critical, 'high' => $high, 'lookback_minutes' => $lookback],
        );
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function clamAvCheck(array &$checks): void
    {
        if (config('rikms.uploads.malware_scanner') !== 'clamav') {
            $this->add($checks, 'clamav', 'ClamAV', 'skipped', 'Scanner is disabled in this environment.');

            return;
        }

        try {
            $status = $this->clamAv->status();
            $this->add(
                $checks,
                'clamav',
                'ClamAV',
                $status['healthy'] ? 'healthy' : 'critical',
                $status['healthy'] ? 'Daemon responded and stream limits are compatible.' : 'ClamAV readiness failed: '.$status['reason'].'.',
            );
        } catch (Throwable) {
            $this->add($checks, 'clamav', 'ClamAV', 'critical', 'ClamAV readiness could not be checked.');
        }
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function backupCheck(array &$checks): void
    {
        $required = (bool) config('monitoring.require_backup_ready') || (bool) config('backup.execution_enabled');

        if (! $required) {
            $this->add($checks, 'backup', 'Backup destination', 'skipped', 'Backup readiness alerting is not enabled yet.');

            return;
        }

        try {
            $status = $this->backup->inspect();
            $ready = $status['ready_for_test_backup'] === true;
            $this->add(
                $checks,
                'backup',
                'Backup destination',
                $ready ? 'healthy' : 'critical',
                $ready ? 'Destination is ready for a controlled test backup.' : 'Backup readiness failed: '.$status['status'].'.',
            );
        } catch (Throwable) {
            $this->add($checks, 'backup', 'Backup destination', 'critical', 'Backup readiness could not be checked.');
        }
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function alertDeliveryCheck(array &$checks): void
    {
        if (! config('monitoring.alerts_enabled')) {
            $this->add($checks, 'alert_delivery', 'Alert delivery', 'skipped', 'Alert delivery is disabled.');

            return;
        }

        $emails = config('monitoring.alert_emails', []);
        $validEmails = is_array($emails)
            && $emails !== []
            && collect($emails)->every(fn (mixed $email): bool => is_string($email)
                && filter_var($email, FILTER_VALIDATE_EMAIL) !== false);
        $webhook = trim((string) config('monitoring.alert_webhook_url'));
        $validWebhook = $webhook !== ''
            && filter_var($webhook, FILTER_VALIDATE_URL) !== false
            && str_starts_with($webhook, 'https://');
        $configured = $validEmails || $validWebhook;
        $this->add(
            $checks,
            'alert_delivery',
            'Alert delivery',
            $configured ? 'healthy' : 'critical',
            $configured ? 'At least one alert destination is configured.' : 'No valid email or webhook destination is configured.',
        );
    }

    private function diskUsedPercent(string $path): ?int
    {
        try {
            $total = disk_total_space($path);
            $free = disk_free_space($path);

            if ($total === false || $free === false || $total <= 0) {
                return null;
            }

            return max(0, min(100, (int) round((($total - $free) / $total) * 100)));
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $checks
     * @param  array<string, mixed>  $metrics
     */
    private function add(array &$checks, string $id, string $label, string $status, string $message, array $metrics = []): void
    {
        $checks[] = compact('id', 'label', 'status', 'message', 'metrics');
    }

    /** @param array<int, array<string, mixed>> $checks */
    private function overallStatus(array $checks): string
    {
        if (collect($checks)->contains(fn (array $check): bool => $check['status'] === 'critical')) {
            return 'critical';
        }

        if (collect($checks)->contains(fn (array $check): bool => $check['status'] === 'warning')) {
            return 'warning';
        }

        return 'healthy';
    }
}
