<?php

namespace App\Services;

use App\Mail\MonitoringAlertMail;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MonitoringAlertDispatcher
{
    /** @param array{status: string, checks: array<int, array<string, mixed>>, checked_at: string} $report */
    public function dispatch(array $report): array
    {
        if (! config('monitoring.alerts_enabled')) {
            return ['status' => 'disabled', 'deliveries' => []];
        }

        $state = $this->readState();
        $currentStatus = $report['status'];
        $previousStatus = is_string($state['status'] ?? null) ? $state['status'] : null;
        $fingerprint = $this->fingerprint($report);
        $isRecovery = $currentStatus === 'healthy' && in_array($previousStatus, ['warning', 'critical'], true);

        if ($currentStatus === 'healthy' && ! $isRecovery) {
            $this->writeState($currentStatus, $fingerprint);

            return ['status' => 'healthy_no_alert', 'deliveries' => []];
        }

        if ($isRecovery && ! config('monitoring.send_recovery_alerts', true)) {
            $this->writeState($currentStatus, $fingerprint);

            return ['status' => 'recovery_suppressed', 'deliveries' => []];
        }

        if (! $isRecovery && $this->withinCooldown($state, $fingerprint)) {
            return ['status' => 'cooldown_suppressed', 'deliveries' => []];
        }

        $deliveries = $this->deliver($report, $isRecovery);
        $attempted = collect($deliveries)->whereIn('status', ['sent', 'failed']);
        $successful = $attempted->isNotEmpty() && $attempted->every(fn (array $delivery): bool => $delivery['status'] === 'sent');

        if ($successful) {
            $this->writeState($currentStatus, $fingerprint);
        }

        return [
            'status' => $successful ? ($isRecovery ? 'recovery_sent' : 'alert_sent') : 'delivery_failed',
            'deliveries' => $deliveries,
        ];
    }

    /** @return array<int, array{channel: string, status: string}> */
    private function deliver(array $report, bool $isRecovery): array
    {
        $deliveries = [];
        $emails = collect(config('monitoring.alert_emails', []))
            ->filter(fn (mixed $email): bool => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false)
            ->values()
            ->all();

        if ($emails !== []) {
            try {
                $prefix = $isRecovery ? 'RECOVERED' : strtoupper($report['status']);
                Mail::to($emails)->send(new MonitoringAlertMail(
                    "[RIKMS] {$prefix} monitoring status",
                    $this->message($report, $isRecovery),
                ));
                $deliveries[] = ['channel' => 'email', 'status' => 'sent'];
            } catch (Throwable $exception) {
                Log::error('Monitoring email alert delivery failed.', ['exception_class' => $exception::class]);
                $deliveries[] = ['channel' => 'email', 'status' => 'failed'];
            }
        }

        $webhook = trim((string) config('monitoring.alert_webhook_url'));

        if ($webhook !== ''
            && filter_var($webhook, FILTER_VALIDATE_URL) !== false
            && str_starts_with($webhook, 'https://')) {
            try {
                $response = Http::timeout(max(1.0, (float) config('monitoring.alert_timeout_seconds', 5)))
                    ->asJson()
                    ->post($webhook, [
                        'event' => $isRecovery ? 'rikms.monitor.recovered' : 'rikms.monitor.alert',
                        'status' => $report['status'],
                        'checked_at' => $report['checked_at'],
                        'summary' => $this->problemChecks($report),
                    ]);

                $deliveries[] = ['channel' => 'webhook', 'status' => $response->successful() ? 'sent' : 'failed'];
            } catch (Throwable $exception) {
                Log::error('Monitoring webhook alert delivery failed.', ['exception_class' => $exception::class]);
                $deliveries[] = ['channel' => 'webhook', 'status' => 'failed'];
            }
        }

        if ($deliveries === []) {
            $deliveries[] = ['channel' => 'none', 'status' => 'failed'];
        }

        return $deliveries;
    }

    private function message(array $report, bool $isRecovery): string
    {
        $heading = $isRecovery ? 'RIKMS monitoring has recovered.' : 'RIKMS monitoring detected a problem.';
        $lines = [$heading, '', 'Status: '.$report['status'], 'Checked at: '.$report['checked_at'], '', 'Checks:'];

        foreach ($this->problemChecks($report) as $check) {
            $lines[] = sprintf('- [%s] %s: %s', strtoupper($check['status']), $check['label'], $check['message']);
        }

        $lines[] = '';
        $lines[] = 'Run php artisan rikms:monitor-check and follow docs/OPERATIONS_RUNBOOK.md.';

        return implode(PHP_EOL, $lines);
    }

    /** @return array<int, array{id: string, label: string, status: string, message: string}> */
    private function problemChecks(array $report): array
    {
        $checks = collect($report['checks'])
            ->filter(fn (array $check): bool => in_array($check['status'], ['warning', 'critical'], true));

        if ($checks->isEmpty()) {
            $checks = collect($report['checks'])->filter(fn (array $check): bool => $check['status'] === 'healthy');
        }

        return $checks->map(fn (array $check): array => [
            'id' => (string) $check['id'],
            'label' => (string) $check['label'],
            'status' => (string) $check['status'],
            'message' => (string) $check['message'],
        ])->values()->all();
    }

    private function fingerprint(array $report): string
    {
        return hash('sha256', json_encode($this->problemChecks($report), JSON_THROW_ON_ERROR));
    }

    private function withinCooldown(array $state, string $fingerprint): bool
    {
        if (($state['fingerprint'] ?? null) !== $fingerprint || ! is_string($state['last_sent_at'] ?? null)) {
            return false;
        }

        try {
            $lastSentAt = CarbonImmutable::parse($state['last_sent_at']);
            $cooldown = max(1, (int) config('monitoring.alert_cooldown_minutes', 30));

            return $lastSentAt->addMinutes($cooldown)->isFuture();
        } catch (Throwable) {
            return false;
        }
    }

    private function readState(): array
    {
        $path = (string) config('monitoring.state_path');

        try {
            if ($path === '' || ! is_file($path)) {
                return [];
            }

            $state = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

            return is_array($state) ? $state : [];
        } catch (Throwable) {
            return [];
        }
    }

    private function writeState(string $status, string $fingerprint): void
    {
        $path = (string) config('monitoring.state_path');

        try {
            $directory = dirname($path);

            if (! is_dir($directory) && ! mkdir($directory, 0750, true) && ! is_dir($directory)) {
                throw new \RuntimeException('Monitoring state directory could not be created.');
            }

            $written = file_put_contents($path, json_encode([
                'status' => $status,
                'fingerprint' => $fingerprint,
                'last_sent_at' => now()->toIso8601String(),
            ], JSON_THROW_ON_ERROR), LOCK_EX);

            if ($written === false) {
                throw new \RuntimeException('Monitoring alert state could not be written.');
            }
        } catch (Throwable $exception) {
            Log::warning('Monitoring alert state could not be persisted.', ['exception_class' => $exception::class]);
        }
    }
}
