<?php

use App\Support\Module01\Module01QaReportBuilder;
use Tests\TestCase;

uses(TestCase::class);

function module01ReadinessEvidence(string $postRebootStatus, string $generatedAt): array
{
    $allIds = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08'];
    $junitResults = [];

    foreach (['application' => $allIds, 'live_deployment' => array_slice($allIds, 0, 7)] as $layer => $ids) {
        foreach ($ids as $id) {
            $junitResults[$layer][] = [
                'test_id' => $id,
                'layer' => $layer,
                'name' => "TEST {$id} P0: controlled evidence",
                'status' => 'n_a',
                'execution_time' => $generatedAt,
                'duration_seconds' => 0.0,
                'evidence' => ['Approved verification procedure reference: QA-2026-01.'],
                'failure_reason' => '',
                'corrective_action' => '',
                'justification' => 'Approved controlled verification reference QA-2026-01.',
            ];
        }
    }

    $infrastructureCases = [];
    foreach (['01-04', '01-07', '01-08'] as $id) {
        $infrastructureCases[$id] = [
            'status' => 'n_a',
            'summary' => 'N/A: approved controlled verification reference is documented.',
            'evidence' => ['Approved verification procedure reference: QA-2026-01.'],
            'justification' => 'Approved controlled verification reference QA-2026-01.',
        ];
    }

    $postReboot = [
        'status' => $postRebootStatus,
        'summary' => $postRebootStatus === 'pass'
            ? 'A separately authorized reboot and post-reboot smoke test passed.'
            : 'N/A: reboot recovery is documented as a controlled operation.',
        'evidence' => ['Approved verification procedure reference: QA-2026-01.'],
        'justification' => 'Approved controlled verification reference QA-2026-01.',
    ];

    return [$junitResults, $infrastructureCases, $postReboot];
}

test('Module 01 readiness is NO-GO when P0 evidence has not been collected', function () {
    $report = app(Module01QaReportBuilder::class)->build([], [], null, '2026-10-27T00:00:00Z');

    expect($report['overall_result'])->toBe('NO-GO')
        ->and($report['cases'])->toHaveCount(8)
        ->and(collect($report['cases'])->every(fn (array $case): bool => $case['status'] === 'Blocked'))->toBeTrue();
})->group('module01', 'module01-app');

test('justified N/A evidence is acceptable when post-reboot recovery also passed', function () {
    $generatedAt = '2026-10-27T00:00:00Z';
    [$junitResults, $infrastructureCases, $postReboot] = module01ReadinessEvidence('pass', $generatedAt);
    $report = app(Module01QaReportBuilder::class)->build($junitResults, $infrastructureCases, $postReboot, $generatedAt);

    expect($report['overall_result'])->toBe('GO')
        ->and(collect($report['cases'])->every(fn (array $case): bool => in_array($case['status'], ['Pass', 'N/A'], true)))->toBeTrue()
        ->and($report['cases'][7]['status'])->toBe('Pass');
})->group('module01', 'module01-app');

test('post-reboot recovery cannot be treated as N/A for an unconditional GO', function () {
    $generatedAt = '2026-10-27T00:00:00Z';
    [$junitResults, $infrastructureCases, $postReboot] = module01ReadinessEvidence('n_a', $generatedAt);
    $report = app(Module01QaReportBuilder::class)->build($junitResults, $infrastructureCases, $postReboot, $generatedAt);

    expect($report['overall_result'])->toBe('NO-GO')
        ->and($report['cases'][7]['status'])->toBe('Blocked')
        ->and($report['cases'][7]['failure_reason'])->toContain('N/A cannot verify recovery');
})->group('module01', 'module01-app');
