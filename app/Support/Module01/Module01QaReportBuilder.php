<?php

namespace App\Support\Module01;

use DOMDocument;
use DOMXPath;
use Symfony\Component\Process\Process;
use Throwable;

final class Module01QaReportBuilder
{
    private const CASES = [
        '01-01' => [
            'name' => 'Server IP access',
            'expected' => 'The landing page responds through the assigned IP without redirects to localhost, development addresses, or unrelated hosts.',
            'layers' => ['application', 'live_deployment'],
        ],
        '01-02' => [
            'name' => 'HTTPS security or restricted access',
            'expected' => 'The IP certificate is trusted, valid, and matches the IP, or documented restricted test-only access is evidenced.',
            'layers' => ['application', 'live_deployment'],
        ],
        '01-03' => [
            'name' => 'HTTP redirect or restriction',
            'expected' => 'HTTP redirects to the intended HTTPS IP destination or is restricted under the approved network policy.',
            'layers' => ['application', 'live_deployment'],
        ],
        '01-04' => [
            'name' => 'Apache, rewrite rules, and assets',
            'expected' => 'Apache serves the Laravel public root, rewrite routing works, Vite assets load, and internal paths are denied.',
            'layers' => ['application', 'live_deployment', 'infrastructure'],
        ],
        '01-05' => [
            'name' => 'Application URL, session, cookies, and CSRF',
            'expected' => 'IP-based URL generation is consistent; host-only secure cookies and session continuity work; invalid CSRF requests are rejected.',
            'layers' => ['application', 'live_deployment'],
        ],
        '01-06' => [
            'name' => 'Production debug and secret protection',
            'expected' => 'Debug output and sensitive configuration, source, backup, and log files are inaccessible to public requests.',
            'layers' => ['application', 'live_deployment'],
        ],
        '01-07' => [
            'name' => 'Database, Redis, and administrative service exposure',
            'expected' => 'Required configured services are reachable on approved paths and bounded external probes cannot reach restricted service ports.',
            'layers' => ['application', 'live_deployment', 'infrastructure'],
        ],
        '01-08' => [
            'name' => 'Firewall, access restrictions, logs, and reboot recovery',
            'expected' => 'Approved inbound access is enforced, services start and remain healthy, logs show no critical deployment errors, and post-reboot smoke checks pass.',
            'layers' => ['application', 'infrastructure', 'post_reboot'],
        ],
    ];

    /** @return array<int, array<string, mixed>> */
    public function parseJUnit(string $file, string $layer, string $executedAt): array
    {
        if (! is_file($file)) {
            return [];
        }

        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);

        try {
            $loaded = $document->load($file, LIBXML_NONET | LIBXML_NOBLANKS);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        if (! $loaded) {
            return [];
        }

        $xpath = new DOMXPath($document);
        $suiteTimestamp = $xpath->query('//testsuite[@timestamp]')->item(0)?->attributes?->getNamedItem('timestamp')?->nodeValue;
        $executionTime = is_string($suiteTimestamp) && $suiteTimestamp !== '' ? $suiteTimestamp : $executedAt;
        $tests = [];

        foreach ($xpath->query('//testcase') ?: [] as $testCase) {
            $name = (string) $testCase->attributes?->getNamedItem('name')?->nodeValue;

            if (! preg_match('/TEST\s+(01-0[1-8])/i', $name, $matches)) {
                continue;
            }

            $id = $matches[1];
            $problem = null;
            $skipped = null;

            foreach ($testCase->childNodes as $child) {
                if ($child->nodeName === 'failure' || $child->nodeName === 'error') {
                    $problem = $child;
                    break;
                }

                if ($child->nodeName === 'skipped') {
                    $skipped = $child;
                }
            }

            if ($problem !== null) {
                $message = (string) ($problem->attributes?->getNamedItem('message')?->nodeValue ?: $problem->textContent);
                $message = preg_replace('/^'.preg_quote($name, '/').'\s*/', '', $message) ?? $message;
                $status = $problem->nodeName === 'error'
                    && preg_match('/could not find driver|no such driver|could not load (?:the )?.*extension/i', $message) === 1
                    ? 'blocked'
                    : 'fail';
            } elseif ($skipped !== null) {
                $message = (string) ($skipped->attributes?->getNamedItem('message')?->nodeValue ?: $skipped->textContent);
                $status = str_starts_with(strtoupper(trim($message)), 'N/A:') ? 'n_a' : 'blocked';
            } else {
                $status = 'pass';
                $message = '';
            }

            $tests[] = [
                'test_id' => $id,
                'layer' => $layer,
                'name' => $name,
                'status' => $status,
                'execution_time' => $executionTime,
                'duration_seconds' => (float) ($testCase->attributes?->getNamedItem('time')?->nodeValue ?? 0),
                'evidence' => $status === 'pass'
                    ? ["JUnit test {$name} passed."]
                    : [],
                'failure_reason' => in_array($status, ['fail', 'blocked'], true) ? $this->sanitize($message) : '',
                'corrective_action' => in_array($status, ['fail', 'blocked'], true)
                    ? 'Review the sanitized test diagnostic and run the layer against its intended target.'
                    : '',
                'justification' => $status === 'n_a' ? $this->sanitize($message) : '',
            ];
        }

        return $tests;
    }

    /** @param array<string, array<int, array<string, mixed>>> $junitResults */
    public function build(array $junitResults, array $infrastructureCases, ?array $postReboot, string $generatedAt): array
    {
        $allTests = [];

        foreach ($junitResults as $tests) {
            foreach ($tests as $test) {
                $allTests[$test['layer']][$test['test_id']][] = $test;
            }
        }

        $cases = [];

        foreach (self::CASES as $id => $definition) {
            $layerResults = [];

            foreach ($definition['layers'] as $layer) {
                if ($layer === 'infrastructure' && isset($infrastructureCases[$id])) {
                    $layerResults[$layer] = $this->normalizeAuditResult($infrastructureCases[$id], $layer, $generatedAt);

                    continue;
                }

                if ($layer === 'post_reboot' && $id === '01-08' && $postReboot !== null) {
                    $layerResults[$layer] = $this->normalizeAuditResult($postReboot, $layer, $generatedAt);

                    continue;
                }

                $layerResults[$layer] = $this->combineTests($allTests[$layer][$id] ?? [], $layer, $generatedAt);
            }

            if ($id === '01-08' && $layerResults['post_reboot']['status'] === 'n_a') {
                $layerResults['post_reboot']['status'] = 'blocked';
                $layerResults['post_reboot']['failure_reason'] = 'Post-reboot recovery requires a completed, separately authorized reboot and passing smoke test; N/A cannot verify recovery.';
                $layerResults['post_reboot']['corrective_action'] = 'After the separately authorized reboot, provide the pre-reboot boot ID and run the post-reboot smoke check.';
                $layerResults['post_reboot']['justification'] = '';
            }

            $status = $this->caseStatus($layerResults);
            $evidence = [];
            $failureReasons = [];
            $correctiveActions = [];
            $executionTimes = [];
            $duration = 0.0;

            foreach ($layerResults as $layer => $result) {
                foreach ($result['evidence'] as $line) {
                    $evidence[] = $layer.': '.$line;
                }

                if ($result['failure_reason'] !== '') {
                    $failureReasons[] = $layer.': '.$result['failure_reason'];
                }

                if ($result['corrective_action'] !== '') {
                    $correctiveActions[] = $result['corrective_action'];
                }

                if ($result['execution_time'] !== null) {
                    $executionTimes[] = $result['execution_time'];
                }

                $duration += $result['duration_seconds'];
            }

            $actual = $this->actualResult($layerResults);
            $cases[] = [
                'test_id' => 'TEST '.$id,
                'module' => 'Server, IP Access & Deployment',
                'priority' => 'P0',
                'test_name' => $definition['name'],
                'expected_result' => $definition['expected'],
                'actual_result' => $actual,
                'status' => $this->titleStatus($status),
                'execution_time' => $executionTimes === [] ? null : max($executionTimes),
                'duration_seconds' => round($duration, 3),
                'evidence' => array_values(array_unique($evidence)),
                'failure_reason' => implode(' ', array_unique($failureReasons)),
                'corrective_action' => implode(' ', array_unique($correctiveActions)),
                'coverage' => array_map(fn (string $layer, array $result): array => [
                    'layer' => $layer,
                    'status' => $result['status'],
                ], array_keys($layerResults), array_values($layerResults)),
                'layer_results' => $layerResults,
            ];
        }

        $blockers = [];
        foreach ($cases as $case) {
            if (! in_array($case['status'], ['Pass', 'N/A'], true)) {
                $blockers[] = $case['test_id'].' '.$case['status'].': '.$case['failure_reason'];
            }
        }

        $ready = $blockers === [];

        return [
            'module' => 'Server, IP Access & Deployment',
            'generated_at' => $generatedAt,
            'build_identifier' => $this->buildIdentifier(),
            'environment' => [
                'application_environment' => (string) config('app.env'),
                'application_test_environment' => 'testing (forced by phpunit.xml)',
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'operating_system' => PHP_OS_FAMILY,
            ],
            'overall_result' => $ready ? 'GO' : 'NO-GO',
            'readiness_reasons' => $ready
                ? ['Every applicable P0 check has passing evidence or a justified N/A result.']
                : $blockers,
            'cases' => $cases,
        ];
    }

    public function writeReports(array $report, string $directory): array
    {
        if (! is_dir($directory) && ! mkdir($directory, 0770, true) && ! is_dir($directory)) {
            throw new \RuntimeException('Unable to create the private Module 01 report directory.');
        }

        $jsonPath = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'module01-report.json';
        $markdownPath = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'module01-report.md';
        $junitPath = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'module01-junit.xml';

        file_put_contents($jsonPath, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL, LOCK_EX);
        file_put_contents($markdownPath, $this->markdown($report), LOCK_EX);
        file_put_contents($junitPath, $this->junit($report), LOCK_EX);

        return ['json' => $jsonPath, 'markdown' => $markdownPath, 'junit' => $junitPath];
    }

    private function combineTests(array $tests, string $layer, string $generatedAt): array
    {
        if ($tests === []) {
            return [
                'status' => 'not_run',
                'execution_time' => null,
                'duration_seconds' => 0.0,
                'evidence' => [],
                'failure_reason' => "The {$layer} check was not executed or produced no JUnit test result.",
                'corrective_action' => $layer === 'application'
                    ? 'Run php artisan test --group=module01-app.'
                    : 'Run the explicitly enabled deployment check from its authorized target.',
                'justification' => '',
            ];
        }

        $statuses = array_column($tests, 'status');
        $status = in_array('fail', $statuses, true)
            ? 'fail'
            : (in_array('blocked', $statuses, true) ? 'blocked' : (in_array('n_a', $statuses, true) ? 'n_a' : 'pass'));
        $reasons = array_filter(array_column($tests, 'failure_reason'));
        $justifications = array_filter(array_column($tests, 'justification'));

        return [
            'status' => $status,
            'execution_time' => max(array_column($tests, 'execution_time')) ?: $generatedAt,
            'duration_seconds' => round(array_sum(array_column($tests, 'duration_seconds')), 3),
            'evidence' => array_values(array_unique(array_merge(...array_column($tests, 'evidence')))),
            'failure_reason' => implode(' ', array_unique($reasons)),
            'corrective_action' => implode(' ', array_unique(array_filter(array_column($tests, 'corrective_action')))),
            'justification' => implode(' ', array_unique($justifications)),
        ];
    }

    private function normalizeAuditResult(array $result, string $layer, string $generatedAt): array
    {
        return [
            'status' => strtolower((string) ($result['status'] ?? 'blocked')),
            'execution_time' => $result['execution_time'] ?? $generatedAt,
            'duration_seconds' => (float) ($result['duration_seconds'] ?? 0),
            'evidence' => array_values(array_filter(array_map(fn ($line): string => $this->sanitize((string) $line), $result['evidence'] ?? []))),
            'failure_reason' => $this->sanitize((string) ($result['failure_reason'] ?? (($result['status'] ?? '') === 'fail' ? $result['summary'] ?? '' : ''))),
            'corrective_action' => $this->sanitize((string) ($result['corrective_action'] ?? '')),
            'justification' => $this->sanitize((string) ($result['justification'] ?? '')),
        ];
    }

    private function caseStatus(array $layerResults): string
    {
        foreach ($layerResults as $result) {
            if ($result['status'] === 'n_a' && trim((string) ($result['justification'] ?? '')) === '') {
                return 'blocked';
            }
        }

        $statuses = array_column($layerResults, 'status');

        if (in_array('fail', $statuses, true)) {
            return 'fail';
        }

        if (in_array('blocked', $statuses, true) || in_array('not_run', $statuses, true)) {
            return 'blocked';
        }

        if (array_diff($statuses, ['pass', 'n_a']) !== []) {
            return 'blocked';
        }

        return in_array('pass', $statuses, true) ? 'pass' : 'n_a';
    }

    private function actualResult(array $layerResults): string
    {
        $parts = [];
        foreach ($layerResults as $layer => $result) {
            $parts[] = ucfirst(str_replace('_', ' ', $layer)).' '.$this->titleStatus($result['status']).'.';
        }

        return implode(' ', $parts);
    }

    private function buildIdentifier(): string
    {
        $sha = trim((string) getenv('GITHUB_SHA'));
        if ($sha !== '') {
            return substr($sha, 0, 12);
        }

        try {
            $process = new Process(['git', 'rev-parse', '--short=12', 'HEAD'], base_path());
            $process->setTimeout(2);
            if ($process->run() === 0) {
                return trim($process->getOutput());
            }
        } catch (Throwable) {
            // Report an unavailable identifier without exposing command output.
        }

        return 'unavailable';
    }

    private function titleStatus(string $status): string
    {
        return match ($status) {
            'pass' => 'Pass',
            'fail' => 'Fail',
            'blocked' => 'Blocked',
            'n_a' => 'N/A',
            default => 'Not Run',
        };
    }

    private function sanitize(string $value): string
    {
        $value = preg_replace('/\R(?:[ \t]*at[ \t]+|[ \t]*#\d+[ \t]*|Stack trace:).*/s', '', $value) ?? '';
        $value = preg_replace('~(?i)(["\']?\b(?:APP_KEY|DB_PASSWORD|MONGODB_URI|REDIS_PASSWORD|OPENAI_API_KEY|CAPTCHA_SECRET_KEY)\b["\']?\s*[:=]\s*["\']?)[^"\'\s,;]+~', '$1[REDACTED]', $value) ?? '';
        $value = preg_replace('/(\b[a-z][a-z0-9+.-]*:\/\/[^:\/\s@]+:)[^@\s]+@/i', '$1[REDACTED]@', $value) ?? '';
        $value = preg_replace('/(?i)(set-cookie\s*:\s*)[^\r\n]+/', '$1[REDACTED]', $value) ?? '';
        $value = preg_replace('/(?i)(\bcookie\s*:\s*)[^\r\n]+/', '$1[REDACTED]', $value) ?? '';
        $value = preg_replace('/(?i)(\b(?:laravel_session|rikms[-_a-z0-9]*session|xsrf-token|csrf-token)\b\s*[=:]\s*)[^\s,;]+/', '$1[REDACTED]', $value) ?? '';
        $value = preg_replace('~(?i)(["\']?\b(?:password|secret|token)\b["\']?[\s:=]+["\']?)[^"\'\s,;]+~', '$1[REDACTED]', $value) ?? '';
        $value = preg_replace('~(?:[A-Za-z]:\\\\|/(?:home|var|srv|mnt|app|workspace|tmp|etc)/)[^\s:]+~', '[LOCAL_PATH]', $value) ?? '';
        $value = preg_replace('/[A-Za-z]:\\\\[^\s:]+/', '[LOCAL_PATH]', $value) ?? '';

        return mb_substr(trim($value), 0, 1200);
    }

    private function markdown(array $report): string
    {
        $lines = [
            '# Module 01 QA Report',
            '',
            '- Module: '.$report['module'],
            '- Overall result: **'.$report['overall_result'].'**',
            '- Generated: '.$report['generated_at'],
            '- Build/commit: '.$report['build_identifier'],
            '- Environment: '.$report['environment']['application_environment'].'; application tests: '.$report['environment']['application_test_environment'].'; PHP '.$report['environment']['php_version'].'; Laravel '.$report['environment']['laravel_version'].'; '.$report['environment']['operating_system'],
            '',
            '## Readiness reasons',
            '',
        ];

        foreach ($report['readiness_reasons'] as $reason) {
            $lines[] = '- '.$reason;
        }

        $lines[] = '';
        $lines[] = '| Test ID | Priority | Test name | Expected result | Actual result | Status | Execution time | Duration (s) | Evidence | Failure reason | Corrective action |';
        $lines[] = '|---|---|---|---|---|---|---|---:|---|---|---|';

        foreach ($report['cases'] as $case) {
            $values = [
                $case['test_id'],
                $case['priority'],
                $case['test_name'],
                $case['expected_result'],
                $case['actual_result'],
                $case['status'],
                $case['execution_time'] ?? 'Not run',
                number_format($case['duration_seconds'], 3, '.', ''),
                implode('; ', $case['evidence']),
                $case['failure_reason'],
                $case['corrective_action'],
            ];
            $lines[] = '| '.implode(' | ', array_map(fn (string $value): string => $this->escapeCell($value), $values)).' |';
        }

        $lines[] = '';
        $lines[] = '## Evidence coverage';
        $lines[] = '';
        foreach ($report['cases'] as $case) {
            $coverage = array_map(fn (array $entry): string => $entry['layer'].'='.$this->titleStatus($entry['status']), $case['coverage']);
            $lines[] = '- '.$case['test_id'].': '.implode(', ', $coverage).'.';
        }
        $lines[] = '';

        return implode("\n", $lines);
    }

    private function escapeCell(string $value): string
    {
        return str_replace(["\r", "\n", '|'], ['', ' ', '\\|'], $value);
    }

    private function junit(array $report): string
    {
        $testCount = 0;
        $failures = 0;
        $skipped = 0;
        $duration = 0.0;
        $suites = [];
        $suiteCounts = [];

        foreach ($report['cases'] as $case) {
            foreach ($case['layer_results'] as $layer => $result) {
                $testCount++;
                $duration += (float) $result['duration_seconds'];
                $suiteCounts[$layer]['tests'] = ($suiteCounts[$layer]['tests'] ?? 0) + 1;
                $suiteCounts[$layer]['time'] = ($suiteCounts[$layer]['time'] ?? 0.0) + (float) $result['duration_seconds'];
                $name = $case['test_id'].' P0: '.$case['test_name'].' ['.$layer.']';
                $attributes = ' classname="Module01" name="'.htmlspecialchars($name, ENT_XML1 | ENT_QUOTES, 'UTF-8').'" time="'.number_format((float) $result['duration_seconds'], 3, '.', '').'"';

                if ($result['status'] === 'fail') {
                    $failures++;
                    $suiteCounts[$layer]['failures'] = ($suiteCounts[$layer]['failures'] ?? 0) + 1;
                    $message = htmlspecialchars($result['failure_reason'] ?: 'P0 check failed.', ENT_XML1 | ENT_QUOTES, 'UTF-8');
                    $suites[$layer][] = '<testcase'.$attributes.'><failure message="'.$message.'">'.$message.'</failure></testcase>';
                } elseif (in_array($result['status'], ['blocked', 'n_a', 'not_run'], true)) {
                    $skipped++;
                    $suiteCounts[$layer]['skipped'] = ($suiteCounts[$layer]['skipped'] ?? 0) + 1;
                    $message = $result['status'] === 'n_a'
                        ? 'N/A: '.($result['justification'] ?: 'Documented justification is required.')
                        : ($result['failure_reason'] ?: 'Layer evidence was not run.');
                    $suites[$layer][] = '<testcase'.$attributes.'><skipped message="'.htmlspecialchars($message, ENT_XML1 | ENT_QUOTES, 'UTF-8').'"/></testcase>';
                } else {
                    $suites[$layer][] = '<testcase'.$attributes.'/>';
                }
            }
        }

        $suiteXml = '';
        foreach ($suites as $name => $testCases) {
            $counts = $suiteCounts[$name];
            $suiteXml .= '<testsuite name="'.htmlspecialchars((string) $name, ENT_XML1 | ENT_QUOTES, 'UTF-8').'" tests="'.$counts['tests'].'" failures="'.($counts['failures'] ?? 0).'" errors="0" skipped="'.($counts['skipped'] ?? 0).'" time="'.number_format($counts['time'], 3, '.', '').'">'.implode('', $testCases).'</testsuite>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'.
            '<testsuites name="Module 01" tests="'.$testCount.'" failures="'.$failures.'" errors="0" skipped="'.$skipped.'" time="'.number_format($duration, 3, '.', '').'">'.$suiteXml.'</testsuites>'.PHP_EOL;
    }
}
