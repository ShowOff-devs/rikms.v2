<?php

namespace App\Console\Commands;

use App\Support\Module01\Module01QaReportBuilder;
use App\Support\Module01\ReadOnlyInfrastructureAudit;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use Throwable;

class RunModule01Qa extends Command
{
    protected $signature = 'rikms:module01-qa
        {--live : Run explicitly enabled live deployment tests}
        {--infrastructure : Run explicitly enabled read-only host checks}
        {--post-reboot : Run post-reboot host and HTTP smoke checks}
        {--output-dir= : Store reports in this directory}
        {--enforce-go : Return failure unless all P0 deployment checks allow GO}';

    protected $description = 'Run Module 01 application tests and generate sanitized QA reports';

    public function handle(Module01QaReportBuilder $builder, ReadOnlyInfrastructureAudit $audit): int
    {
        $generatedAt = now()->utc()->toIso8601String();
        $directory = $this->reportDirectory();

        if (! is_dir($directory) && ! mkdir($directory, 0770, true) && ! is_dir($directory)) {
            $this->error('Unable to create the private Module 01 report directory.');

            return self::FAILURE;
        }

        $suiteDefinitions = [
            'application' => ['group' => 'module01-app', 'enabled' => true],
            'live_deployment' => ['group' => 'module01-live', 'enabled' => (bool) $this->option('live')],
        ];
        $junitResults = [];
        $suiteExitCodes = [];

        foreach ($suiteDefinitions as $layer => $definition) {
            if (! $definition['enabled']) {
                $junitResults[$layer] = [];

                continue;
            }

            $executedAt = now()->utc()->toIso8601String();
            $junitPath = $directory.DIRECTORY_SEPARATOR.$layer.'-junit.xml';
            $process = new Process([
                PHP_BINARY,
                base_path('artisan'),
                'test',
                '--group='.$definition['group'],
                '--log-junit='.$junitPath,
            ], base_path());
            $process->setTimeout(900);

            try {
                $exitCode = $process->run();
            } catch (Throwable) {
                $exitCode = self::FAILURE;
            }

            $suiteExitCodes[$layer] = $exitCode;
            $junitResults[$layer] = $builder->parseJUnit($junitPath, $layer, $executedAt);
            $this->line(ucfirst(str_replace('_', ' ', $layer)).' suite: '.($exitCode === 0 ? 'finished' : 'failed').'.');
        }

        $infrastructureCases = [];

        if ($this->option('infrastructure')) {
            if (filter_var(getenv('RIKMS_QA_INFRA_ENABLED') ?: false, FILTER_VALIDATE_BOOL)) {
                $started = microtime(true);
                $infrastructure = $audit->run();
                $duration = microtime(true) - $started;
                foreach ($infrastructure['cases'] as $id => $result) {
                    $result['execution_time'] = $infrastructure['checked_at'] ?? now()->utc()->toIso8601String();
                    $result['duration_seconds'] = round($duration, 3);
                    $infrastructureCases[$id] = $result;
                }
            } else {
                $message = 'Infrastructure checks were not run because RIKMS_QA_INFRA_ENABLED was not true.';
                foreach (['01-04', '01-07', '01-08'] as $id) {
                    $infrastructureCases[$id] = [
                        'status' => 'blocked',
                        'summary' => $message,
                        'evidence' => [],
                        'failure_reason' => $message,
                        'corrective_action' => 'Set RIKMS_QA_INFRA_ENABLED=true and run on the deployed Ubuntu host.',
                    ];
                }
            }
        }

        $postReboot = null;

        if ($this->option('post-reboot')) {
            $started = microtime(true);
            $postReboot = $audit->postReboot();
            $postReboot['execution_time'] = now()->utc()->toIso8601String();
            $postReboot['duration_seconds'] = round(microtime(true) - $started, 3);
        }

        $report = $builder->build($junitResults, $infrastructureCases, $postReboot, $generatedAt);
        $paths = $builder->writeReports($report, $directory);

        $this->newLine();
        $this->line('Module 01 result: '.$report['overall_result']);
        $this->line('Markdown report: '.$paths['markdown']);
        $this->line('JSON report: '.$paths['json']);
        $this->line('JUnit report: '.$paths['junit']);

        $suiteFailed = array_filter($suiteExitCodes, static fn (int $exitCode): bool => $exitCode !== self::SUCCESS) !== [];
        $requiredGoFailed = (bool) $this->option('enforce-go') && $report['overall_result'] !== 'GO';

        return $suiteFailed || $requiredGoFailed ? self::FAILURE : self::SUCCESS;
    }

    private function reportDirectory(): string
    {
        $configured = trim((string) $this->option('output-dir'));

        if ($configured === '') {
            return storage_path('logs/module01-qa/'.now()->utc()->format('Ymd\THis\Z'));
        }

        $windowsAbsolute = strlen($configured) >= 3
            && ctype_alpha($configured[0])
            && $configured[1] === ':'
            && in_array($configured[2], ['\\', '/'], true);

        return (str_starts_with($configured, DIRECTORY_SEPARATOR) || $windowsAbsolute)
            ? $configured
            : base_path($configured);
    }
}
