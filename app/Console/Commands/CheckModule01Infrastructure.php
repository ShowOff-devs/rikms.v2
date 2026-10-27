<?php

namespace App\Console\Commands;

use App\Support\Module01\ReadOnlyInfrastructureAudit;
use Illuminate\Console\Command;

class CheckModule01Infrastructure extends Command
{
    protected $signature = 'rikms:module01-infrastructure-check {--json : Output machine-readable evidence}';

    protected $description = 'Run explicitly enabled, read-only Module 01 host and service checks';

    public function handle(ReadOnlyInfrastructureAudit $audit): int
    {
        if (! filter_var(getenv('RIKMS_QA_INFRA_ENABLED') ?: false, FILTER_VALIDATE_BOOL)) {
            $report = [
                'checked_at' => now()->utc()->toIso8601String(),
                'cases' => [
                    '01-04' => $this->blocked('Infrastructure checks were not explicitly enabled.'),
                    '01-07' => $this->blocked('Infrastructure checks were not explicitly enabled.'),
                    '01-08' => $this->blocked('Infrastructure checks were not explicitly enabled.'),
                ],
            ];
        } else {
            $report = $audit->run();
        }

        if ($this->option('json')) {
            $this->line((string) json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(
                ['Test ID', 'Status', 'Actual result', 'Evidence'],
                array_map(fn (string $id, array $result): array => [
                    'TEST '.$id,
                    strtoupper((string) $result['status']),
                    $result['summary'],
                    implode('; ', $result['evidence']),
                ], array_keys($report['cases']), array_values($report['cases'])),
            );
        }

        foreach ($report['cases'] as $result) {
            if (in_array($result['status'], ['fail', 'blocked'], true)) {
                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }

    private function blocked(string $message): array
    {
        return [
            'status' => 'blocked',
            'summary' => $message,
            'evidence' => [],
            'failure_reason' => $message,
            'corrective_action' => 'Set RIKMS_QA_INFRA_ENABLED=true and run on the deployed Ubuntu host using an authorized operations account.',
            'justification' => '',
        ];
    }
}
