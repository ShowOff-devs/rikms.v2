<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\Analytics\BudgetUtilizationService;
use App\Services\Analytics\ProjectAccomplishmentService;
use App\Services\Analytics\ReportAnalyticsAssembler;
use App\Services\Analytics\ReportCompletenessService;
use Illuminate\Support\Facades\DB;

function reportAnalyticsAgency(string $slug = 'report-analytics'): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function reportAnalyticsUser(?Agency $agency = null, string $role = 'agency_admin'): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $roleRecord = Role::updateOrCreate(
        ['slug' => $role],
        [
            'name' => str($role)->replace('_', ' ')->title()->toString(),
            'display_name' => str($role)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );

    $user->roles()->syncWithoutDetaching([
        $roleRecord->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function reportAnalyticsResearch(array $overrides = [], ?array $detail = [], ?array $items = null, bool $withFile = true): Research
{
    $agency = $overrides['agency'] ?? reportAnalyticsAgency();
    $user = $overrides['user'] ?? reportAnalyticsUser($agency);
    unset($overrides['agency'], $overrides['user']);

    $research = Research::create(array_replace([
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Analytics Ready Terminal Report',
        'abstract' => 'A complete analytics-ready report.',
        'authors' => ['Analytics Tester'],
        'publication_year' => 2026,
        'category' => 'Terminal Report',
        'sdgs' => ['SDG 9'],
        'keywords' => ['analytics'],
        'public_metadata_fields' => ['title', 'abstract'],
        'status' => 'draft',
        'access_level' => 'request_required',
    ], $overrides));

    if ($withFile) {
        ResearchFile::create([
            'research_id' => $research->id,
            'agency_id' => $agency->id,
            'uploaded_by' => $user->id,
            'original_name' => 'report.pdf',
            'stored_name' => 'report.pdf',
            'disk' => 'local',
            'path' => 'research/report.pdf',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 1024,
            'checksum' => sha1((string) $research->id),
            'file_type' => str_contains(strtolower((string) $research->category), 'project accomplishment')
                ? 'project-accomplishment'
                : 'terminal-report',
            'visibility' => 'private',
            'access_level' => 'restricted',
            'status' => 'active',
            'uploaded_at' => now(),
        ]);
    }

    if ($detail !== null) {
        $research->reportDetail()->create(array_replace([
            'reporting_period' => 'Q2',
            'project_start_date' => '2026-01-01',
            'project_end_date' => '2026-06-30',
            'allotted_budget' => '1000000.00',
            'released_amount' => '900000.00',
            'obligated_amount' => '800000.00',
            'utilized_amount' => '750000.00',
            'physical_accomplishment_percent' => '72.50',
            'financial_as_of_date' => '2026-06-30',
        ], $detail));
    }

    $items ??= [[
        'project_name' => 'Prototype deployment',
        'target_value' => '10 prototypes',
        'actual_value' => '7 prototypes',
        'accomplishment_percentage' => '70.00',
        'project_status' => 'in-progress',
        'remarks' => 'Reported row.',
        'sort_order' => 0,
    ]];

    foreach ($items as $index => $item) {
        $research->performanceItems()->create(array_replace([
            'project_name' => 'Performance row '.$index,
            'target_value' => null,
            'actual_value' => null,
            'accomplishment_percentage' => null,
            'project_status' => 'not-started',
            'remarks' => null,
            'sort_order' => $index,
        ], $item));
    }

    return $research->refresh();
}

test('ReportCompleteness marks a fully complete Terminal Report complete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch());

    expect($result['percentage'])->toBe(100.0)
        ->and($result['completed_sections'])->toBe(6)
        ->and($result['total_sections'])->toBe(6)
        ->and($result['classification'])->toBe('complete')
        ->and($result['is_complete'])->toBeTrue();
});

test('ReportCompleteness marks an incomplete Terminal Report incomplete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'abstract' => null,
        'public_metadata_fields' => [],
        'sdgs' => [],
    ], [
        'allotted_budget' => null,
        'financial_as_of_date' => null,
    ], [], false));

    expect($result['classification'])->toBe('incomplete')
        ->and($result['is_complete'])->toBeFalse()
        ->and($result['sections']['document']['missing_fields'])->toContain('document')
        ->and($result['sections']['metadata']['missing_fields'])->toContain('abstract', 'public_metadata_fields')
        ->and($result['sections']['financials']['missing_fields'])->toContain('allotted_budget', 'financial_as_of_date');
});

test('ReportCompleteness marks a fully complete Project Accomplishment Report complete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'title' => 'Project Accomplishment Report',
        'category' => 'Project Accomplishment Report',
    ]));

    expect($result['percentage'])->toBe(100.0)
        ->and($result['classification'])->toBe('complete');
});

test('ReportCompleteness marks an incomplete Project Accomplishment Report incomplete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'title' => 'Project Accomplishment Report',
        'category' => 'Project Accomplishment Report',
    ], null, [], true));

    expect($result['classification'])->toBe('incomplete')
        ->and($result['sections']['project_details']['missing_fields'])->toContain('reporting_period')
        ->and($result['sections']['financials']['missing_fields'])->toContain('allotted_budget');
});

test('ReportCompleteness treats explicit zero as supplied', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => 0,
        'released_amount' => 0,
        'obligated_amount' => 0,
        'utilized_amount' => 0,
        'physical_accomplishment_percent' => 0,
    ], [[
        'project_name' => 'Zero baseline',
        'target_value' => '0 beneficiaries',
        'actual_value' => '0 beneficiaries',
        'accomplishment_percentage' => 0,
    ]]));

    expect($result['sections']['financials']['complete'])->toBeTrue()
        ->and($result['sections']['performance']['complete'])->toBeTrue();
});

test('ReportCompleteness treats null as missing', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([], [
        'reporting_period' => null,
        'project_start_date' => null,
        'project_end_date' => null,
    ]));

    expect($result['sections']['project_details']['missing_fields'])->toBe([
        'reporting_period',
        'project_start_date',
        'project_end_date',
    ]);
});

test('ReportCompleteness submitted incomplete report remains incomplete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'status' => 'submitted',
    ], null, [], false));

    expect($result['classification'])->toBe('incomplete')
        ->and($result['is_complete'])->toBeFalse();
});

test('ReportCompleteness approved incomplete report remains incomplete', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'status' => 'approved',
        'approved_at' => now(),
    ], null, [], false));

    expect($result['classification'])->toBe('incomplete')
        ->and($result['is_complete'])->toBeFalse();
});

test('ReportCompleteness legacy report without detail row does not throw', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([], null, [], true));

    expect($result['classification'])->toBe('incomplete')
        ->and($result['sections']['project_details']['complete'])->toBeFalse();
});

test('ReportCompleteness normal Research Study is not applicable', function () {
    $result = app(ReportCompletenessService::class)->calculate(reportAnalyticsResearch([
        'category' => 'Research Study',
    ], null, [], false));

    expect($result['data_status'])->toBe('not_applicable')
        ->and($result['classification'])->toBe('not_applicable');
});

test('BudgetUtilization returns not reported when no financial data exists', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], null, [], false));

    expect($result['data_status'])->toBe('not_reported')
        ->and($result['classification'])->toBe('not_reported')
        ->and($result['utilization_percentage'])->toBeNull();
});

test('BudgetUtilization handles allotted budget only', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'released_amount' => null,
        'obligated_amount' => null,
        'utilized_amount' => null,
        'financial_as_of_date' => null,
    ], []));

    expect($result['data_status'])->toBe('reported')
        ->and($result['remaining_balance'])->toBeNull()
        ->and($result['utilization_percentage'])->toBeNull()
        ->and($result['classification'])->toBe('not_reported')
        ->and($result['warnings'])->toContain('missing_financial_as_of_date');
});

test('BudgetUtilization protects zero allotted and zero utilized from division by zero', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => 0,
        'utilized_amount' => 0,
    ], []));

    expect($result['remaining_balance'])->toBe('0.00')
        ->and($result['utilization_percentage'])->toBeNull()
        ->and($result['classification'])->toBe('not_utilized');
});

test('BudgetUtilization classifies threshold percentages', function (string $utilized, string $classification, ?float $percentage) {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => '100.00',
        'released_amount' => '100.00',
        'obligated_amount' => '100.00',
        'utilized_amount' => $utilized,
    ], []));

    expect($result['utilization_percentage'])->toBe($percentage)
        ->and($result['classification'])->toBe($classification);
})->with([
    '25 percent' => ['25.00', 'low', 25.0],
    '50 percent' => ['50.00', 'moderate', 50.0],
    '79.99 percent' => ['79.99', 'moderate', 79.99],
    '80 percent' => ['80.00', 'high', 80.0],
    '99.99 percent' => ['99.99', 'high', 99.99],
    '100 percent' => ['100.00', 'fully_utilized', 100.0],
    'above 100 percent' => ['125.00', 'overutilized', 125.0],
]);

test('BudgetUtilization returns financial warnings without rejecting data', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => '100.00',
        'released_amount' => '90.00',
        'obligated_amount' => '95.00',
        'utilized_amount' => '110.00',
        'financial_as_of_date' => null,
    ], []));

    expect($result['warnings'])->toContain(
        'utilized_exceeds_allotted',
        'utilized_exceeds_released',
        'obligated_exceeds_released',
        'missing_financial_as_of_date',
    );
});

test('BudgetUtilization warns when released and obligated exceed allotted', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => '100.00',
        'released_amount' => '120.00',
        'obligated_amount' => '110.00',
        'utilized_amount' => '90.00',
    ], []));

    expect($result['warnings'])->toContain('released_exceeds_allotted', 'obligated_exceeds_allotted');
});

test('BudgetUtilization preserves decimal precision and negative remaining balance', function () {
    $result = app(BudgetUtilizationService::class)->calculate(reportAnalyticsResearch([], [
        'allotted_budget' => '1000.10',
        'released_amount' => '1000.10',
        'obligated_amount' => '1200.20',
        'utilized_amount' => '1200.20',
    ], []));

    expect($result['remaining_balance'])->toBe('-200.10')
        ->and($result['utilization_percentage'])->toBe(120.0)
        ->and($result['classification'])->toBe('overutilized');
});

test('ProjectAccomplishment uses official physical accomplishment when supplied', function () {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => '72.50',
    ], [[
        'accomplishment_percentage' => '10.00',
    ]]));

    expect($result['physical_accomplishment_percentage'])->toBe(72.5)
        ->and($result['official_value_source'])->toBe('report_detail');
});

test('ProjectAccomplishment classifies official percentages', function (string $percent, string $classification) {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => $percent,
    ], []));

    expect($result['classification'])->toBe($classification);
})->with([
    'zero' => ['0.00', 'not_started'],
    'fifty' => ['50.00', 'in_progress'],
    'seventy nine point ninety nine' => ['79.99', 'in_progress'],
    'eighty' => ['80.00', 'substantially_complete'],
    'ninety' => ['90.00', 'substantially_complete'],
    'one hundred' => ['100.00', 'complete'],
]);

test('ProjectAccomplishment official value takes precedence over row average', function () {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => '50.00',
    ], [
        ['accomplishment_percentage' => '100.00'],
        ['accomplishment_percentage' => '80.00'],
    ]));

    expect($result['physical_accomplishment_percentage'])->toBe(50.0)
        ->and($result['calculated_item_average'])->toBe(90.0)
        ->and($result['official_value_source'])->toBe('report_detail');
});

test('ProjectAccomplishment derives average from explicit row percentages only', function () {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => null,
    ], [
        ['accomplishment_percentage' => '50.00'],
        ['accomplishment_percentage' => null],
        ['accomplishment_percentage' => '100.00'],
    ]));

    expect($result['physical_accomplishment_percentage'])->toBe(75.0)
        ->and($result['performance_items_total'])->toBe(3)
        ->and($result['performance_items_with_percentage'])->toBe(2)
        ->and($result['official_value_source'])->toBe('performance_items_average');
});

test('ProjectAccomplishment textual target actual values do not produce unreliable calculations', function () {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => null,
    ], [[
        'target_value' => '10 prototypes',
        'actual_value' => '5 prototypes',
        'accomplishment_percentage' => null,
    ]]));

    expect($result['data_status'])->toBe('not_reported')
        ->and($result['physical_accomplishment_percentage'])->toBeNull()
        ->and($result['calculated_item_average'])->toBeNull();
});

test('ProjectAccomplishment reports no accomplishment data', function () {
    $result = app(ProjectAccomplishmentService::class)->calculate(reportAnalyticsResearch([], [
        'physical_accomplishment_percent' => null,
    ], []));

    expect($result['data_status'])->toBe('not_reported')
        ->and($result['classification'])->toBe('not_reported');
});

test('ReportAnalytics assembler returns combined DTO without extra queries when relations are loaded', function () {
    $research = reportAnalyticsResearch()->load(['reportDetail', 'performanceItems', 'files']);

    DB::enableQueryLog();
    DB::flushQueryLog();

    $result = app(ReportAnalyticsAssembler::class)->assemble($research);

    expect(DB::getQueryLog())->toBe([])
        ->and($result['research_id'])->toBe($research->id)
        ->and($result['report_type'])->toBe('terminal-report')
        ->and($result['workflow_status'])->toBe('draft')
        ->and($result['completeness']['classification'])->toBe('complete')
        ->and($result['budget']['classification'])->toBe('moderate')
        ->and($result['accomplishment']['official_value_source'])->toBe('report_detail');
});

test('ReportAnalytics assembler returns not applicable for normal Research Study', function () {
    $result = app(ReportAnalyticsAssembler::class)->assemble(reportAnalyticsResearch([
        'category' => 'Research Study',
    ], null, [], false));

    expect($result['report_type'])->toBe('not_applicable')
        ->and($result['budget']['data_status'])->toBe('not_applicable')
        ->and($result['accomplishment']['data_status'])->toBe('not_applicable');
});

test('ReportCompleteness implementation does not expose analytics through public research resource', function () {
    $research = reportAnalyticsResearch([
        'status' => 'published',
        'access_level' => 'public',
        'published_at' => now(),
    ]);

    app(ReportAnalyticsAssembler::class)->assemble($research);

    $this->getJson("/api/public/research/{$research->id}")
        ->assertOk()
        ->assertJsonMissingPath('report_detail')
        ->assertJsonMissingPath('performance_items')
        ->assertJsonMissing(['budget', 'completeness', 'accomplishment', 'allotted_budget']);
});
