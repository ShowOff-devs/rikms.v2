<?php

namespace App\Console\Commands;

use App\Services\InfrastructureReadinessService;
use Illuminate\Console\Command;
use Throwable;

class CheckInfrastructureReadiness extends Command
{
    protected $signature = 'rikms:infrastructure-check
        {--write : Run temporary cache and storage write/read/delete probes}
        {--json : Output machine-readable JSON}';

    protected $description = 'Validate externally operated database, MongoDB, Redis, queue, and storage dependencies';

    public function handle(InfrastructureReadinessService $readiness): int
    {
        try {
            $report = $readiness->report((bool) $this->option('write'));
        } catch (Throwable) {
            $report = [
                'status' => 'failed',
                'checks' => [[
                    'id' => 'readiness',
                    'status' => 'failed',
                    'message' => 'Infrastructure readiness could not be evaluated.',
                ]],
                'checked_at' => now()->toIso8601String(),
            ];
        }

        if ($this->option('json')) {
            $this->line((string) json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(
                ['Check', 'Status', 'Details'],
                array_map(fn (array $check): array => [
                    $check['id'],
                    strtoupper($check['status']),
                    $check['message'],
                ], $report['checks']),
            );
            $this->line('Overall status: '.strtoupper($report['status']));
        }

        return $report['status'] === 'ready' ? self::SUCCESS : self::FAILURE;
    }
}
