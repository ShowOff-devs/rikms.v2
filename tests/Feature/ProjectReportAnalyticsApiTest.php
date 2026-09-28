<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\Analytics\ProjectReportAnalyticsService;
use Illuminate\Support\Facades\DB;

function phase4ReportAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function phase4ReportUser(string $role, ?Agency $agency = null, bool $withMfa = false): User
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

    if ($withMfa) {
        $user->forceFill([
            'two_factor_secret' => encrypt('phase-four-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['phase-four-code'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

    return $user->refresh();
}

function phase4ReportRecord(
    Agency $agency,
    User $user,
    string $reportType = 'terminal-report',
    array $research = [],
    ?array $detail = [],
    array $items = [],
): Research {
    $category = $reportType === 'project-accomplishment'
        ? 'Project Accomplishment Report'
        : 'Terminal Report';

    $record = Research::create(array_replace([
        'slug' => str($category)->slug().'-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => $category.' Analytics Fixture',
        'abstract' => 'Analytics fixture abstract.',
        'authors' => ['Analytics Tester'],
        'document_path' => 'reports/'.$reportType.'.pdf',
        'publication_year' => 2026,
        'category' => $category,
        'sdgs' => ['SDG 9'],
        'keywords' => ['analytics'],
        'public_metadata' => [[
            'key' => 'funding_source',
            'label' => 'Funding Source',
            'value' => 'GAA',
        ]],
        'public_metadata_fields' => ['title', 'abstract'],
        'status' => 'submitted',
        'access_level' => 'restricted',
        'submitted_at' => now(),
    ], $research));

    ResearchFile::create([
        'research_id' => $record->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'original_name' => 'report.pdf',
        'stored_name' => 'private-report.pdf',
        'disk' => 'local',
        'path' => 'private/path/report.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => sha1((string) $record->id),
        'file_type' => $reportType,
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    if ($detail !== null) {
        $record->reportDetail()->create(array_replace([
            'reporting_period' => $reportType === 'project-accomplishment' ? 'Q2' : 'Final',
            'project_start_date' => '2026-01-01',
            'project_end_date' => '2026-12-31',
            'allotted_budget' => '1000.00',
            'released_amount' => '900.00',
            'obligated_amount' => '800.00',
            'utilized_amount' => '750.00',
            'physical_accomplishment_percent' => '85.00',
            'financial_as_of_date' => '2026-06-30',
        ], $detail));
    }

    $items = $items ?: [[
        'project_name' => 'Pilot output',
        'target_value' => '10 sessions',
        'actual_value' => '8 sessions',
        'accomplishment_percentage' => '80.00',
        'project_status' => 'in-progress',
        'sort_order' => 0,
    ]];

    foreach ($items as $index => $item) {
        $record->performanceItems()->create(array_replace([
            'project_name' => 'Output '.$index,
            'sort_order' => $index,
        ], $item));
    }

    return $record->refresh();
}

test('AgencyAnalytics project report summary sees only scoped report records and ignores agency override', function () {
    $agency = phase4ReportAgency('phase-four-agency');
    $otherAgency = phase4ReportAgency('phase-four-other');
    $admin = phase4ReportUser('agency_admin', $agency);
    $otherAdmin = phase4ReportUser('agency_admin', $otherAgency);

    phase4ReportRecord($agency, $admin, detail: ['allotted_budget' => '1000.00', 'utilized_amount' => '500.00']);
    phase4ReportRecord($agency, $admin, 'project-accomplishment', detail: ['allotted_budget' => '2000.00', 'utilized_amount' => '1000.00']);
    phase4ReportRecord($otherAgency, $otherAdmin, detail: ['allotted_budget' => '9999.00', 'utilized_amount' => '9999.00']);
    Research::create([
        'slug' => 'normal-research-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $admin->id,
        'title' => 'Normal Research Study',
        'abstract' => 'Excluded from report analytics.',
        'authors' => ['Researcher'],
        'publication_year' => 2026,
        'category' => 'Research Study',
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]);
    phase4ReportRecord($agency, $admin, research: ['archived_at' => now()]);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary?agency_id='.$otherAgency->id)
        ->assertOk()
        ->assertJsonPath('data.total_reports', 2)
        ->assertJsonPath('data.terminal_reports', 1)
        ->assertJsonPath('data.project_accomplishment_reports', 1)
        ->assertJsonPath('data.total_allotted_budget', '3000.00')
        ->assertJsonPath('data.total_utilized_amount', '1500.00')
        ->assertJsonPath('data.overall_utilization_percentage', 50);
});

test('AgencyAnalytics project report filters and records pagination use assembled DTOs without private fields', function () {
    $agency = phase4ReportAgency('phase-four-records');
    $admin = phase4ReportUser('agency_admin', $agency);
    $terminal = phase4ReportRecord($agency, $admin, detail: ['reporting_period' => 'Final']);
    phase4ReportRecord($agency, $admin, 'project-accomplishment', detail: ['reporting_period' => 'Q2']);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?report_type=terminal-report&reporting_period=Final&per_page=1')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.research_id', $terminal->id)
        ->assertJsonPath('data.0.report_type', 'terminal-report')
        ->assertJsonPath('data.0.completeness.classification', 'complete')
        ->assertJsonPath('data.0.budget.classification', 'moderate')
        ->assertJsonPath('data.0.accomplishment.classification', 'substantially_complete')
        ->assertJsonMissingPath('data.0.files')
        ->assertJsonMissingPath('data.0.path')
        ->assertJsonMissing(['private/path/report.pdf']);
});

test('AgencyAnalytics project report filters use persisted classifications and creation dates', function () {
    $agency = phase4ReportAgency('phase-four-filter-coverage');
    $admin = phase4ReportUser('agency_admin', $agency);
    $matching = phase4ReportRecord($agency, $admin, research: [
        'title' => 'Filter Target Report',
        'publication_year' => 2025,
        'status' => 'draft',
        'created_at' => '2026-01-10 12:00:00',
        'updated_at' => '2026-01-10 12:00:00',
    ], detail: [
        'allotted_budget' => '100.00',
        'utilized_amount' => '150.00',
        'physical_accomplishment_percent' => '100.00',
        'financial_as_of_date' => null,
    ]);
    phase4ReportRecord($agency, $admin, research: [
        'title' => 'Other Report',
        'created_at' => '2026-02-10 12:00:00',
        'updated_at' => '2026-02-10 12:00:00',
    ]);
    DB::table('research')->where('id', $matching->id)->update([
        'created_at' => '2026-01-10 12:00:00',
    ]);

    foreach ([
        'publication year' => 'publication_year=2025',
        'workflow status' => 'workflow_status=draft',
        'completeness' => 'completeness=incomplete',
        'budget classification' => 'budget_classification=overutilized',
        'accomplishment classification' => 'accomplishment_classification=complete',
        'record creation date' => 'date_from=2026-01-10&date_to=2026-01-10',
    ] as $filter => $query) {
        $response = $this->actingAs($admin)
            ->getJson('/api/agency/analytics/project-reports/records?'.$query)
            ->assertOk();

        $this->assertSame(1, $response->json('meta.pagination.total'), $filter);
        $this->assertSame($matching->id, $response->json('data.0.research_id'), $filter);
    }
});

test('AgencyAnalytics records honor sorting and out-of-range pagination', function () {
    $agency = phase4ReportAgency('phase-four-sort-coverage');
    $admin = phase4ReportUser('agency_admin', $agency);
    $alpha = phase4ReportRecord($agency, $admin, research: [
        'title' => 'Alpha Report',
        'publication_year' => 2024,
        'status' => 'draft',
        'created_at' => '2026-01-01 12:00:00',
        'updated_at' => '2026-01-01 12:00:00',
    ], detail: [
        'reporting_period' => 'Q1',
        'project_start_date' => '2026-01-01',
        'project_end_date' => '2026-03-31',
        'allotted_budget' => '100.00',
        'utilized_amount' => '10.00',
    ]);
    $bravo = phase4ReportRecord($agency, $admin, research: [
        'title' => 'Bravo Report',
        'publication_year' => 2025,
        'status' => 'submitted',
        'created_at' => '2026-02-01 12:00:00',
        'updated_at' => '2026-02-01 12:00:00',
    ], detail: [
        'reporting_period' => 'Q2',
        'project_start_date' => '2026-04-01',
        'project_end_date' => '2026-06-30',
        'allotted_budget' => '200.00',
        'utilized_amount' => '20.00',
    ]);
    $charlie = phase4ReportRecord($agency, $admin, research: [
        'title' => 'Charlie Report',
        'publication_year' => 2026,
        'status' => 'published',
        'created_at' => '2026-03-01 12:00:00',
        'updated_at' => '2026-03-01 12:00:00',
    ], detail: [
        'reporting_period' => 'Q3',
        'project_start_date' => '2026-07-01',
        'project_end_date' => '2026-09-30',
        'allotted_budget' => '300.00',
        'utilized_amount' => '30.00',
    ]);
    DB::table('research')->where('id', $alpha->id)->update(['created_at' => '2026-01-01 12:00:00']);
    DB::table('research')->where('id', $bravo->id)->update(['created_at' => '2026-02-01 12:00:00']);
    DB::table('research')->where('id', $charlie->id)->update(['created_at' => '2026-03-01 12:00:00']);

    foreach (ProjectReportAnalyticsService::SORTS as $sort) {
        $this->actingAs($admin)
            ->getJson('/api/agency/analytics/project-reports/records?sort='.$sort.'&direction=asc&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.0.research_id', $alpha->id)
            ->assertJsonPath('meta.pagination.total', 3)
            ->assertJsonPath('meta.pagination.last_page', 2);
    }

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?sort=title&direction=desc&per_page=2')
        ->assertOk()
        ->assertJsonPath('data.0.research_id', $charlie->id);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?per_page=2&page=99')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.pagination.current_page', 99)
        ->assertJsonPath('meta.pagination.last_page', 2);
});

test('project report funding source filter matches normalized metadata entries', function () {
    $agency = phase4ReportAgency('phase-four-funding-filter');
    $admin = phase4ReportUser('agency_admin', $agency);
    $matching = phase4ReportRecord($agency, $admin, research: [
        'title' => 'GAA Funded Report',
    ]);
    phase4ReportRecord($agency, $admin, research: [
        'title' => 'Externally Funded Report',
        'public_metadata' => [[
            'key' => 'funding_source',
            'label' => 'Funding Source',
            'value' => 'External Grant',
        ]],
    ]);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?funding_source=GAA')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.research_id', $matching->id);
});

test('project report analytics ignore inactive and archived classifier files', function (string $status, bool $archived) {
    $agency = phase4ReportAgency('phase-four-inactive-files');
    $admin = phase4ReportUser('agency_admin', $agency);
    $report = phase4ReportRecord($agency, $admin, research: [
        'category' => 'Research Study',
        'document_path' => null,
    ]);

    $report->files()->update([
        'status' => $status,
        'archived_at' => $archived ? now() : null,
    ]);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.total_reports', 0);

    $this->actingAs($admin)
        ->getJson("/api/agency/analytics/project-reports/{$report->id}")
        ->assertNotFound();
})->with([
    'inactive file' => ['inactive', false],
    'archived file' => ['archived', true],
]);

test('AgencyAnalytics detail shows own Terminal Report analytics without raw file data', function () {
    $agency = phase4ReportAgency('phase-five-detail-terminal');
    $admin = phase4ReportUser('agency_admin', $agency);
    $terminal = phase4ReportRecord($agency, $admin, detail: [
        'reporting_period' => 'Final',
        'allotted_budget' => '1000.00',
        'utilized_amount' => '750.00',
    ]);

    $this->actingAs($admin)
        ->getJson("/api/agency/analytics/project-reports/{$terminal->id}")
        ->assertOk()
        ->assertJsonPath('data.research_id', $terminal->id)
        ->assertJsonPath('data.title', 'Terminal Report Analytics Fixture')
        ->assertJsonPath('data.report_type', 'terminal-report')
        ->assertJsonPath('data.reporting_period', 'Final')
        ->assertJsonPath('data.project_start_date', '2026-01-01')
        ->assertJsonPath('data.project_end_date', '2026-12-31')
        ->assertJsonPath('data.financial_as_of_date', '2026-06-30')
        ->assertJsonPath('data.budget.utilization_percentage', 75)
        ->assertJsonPath('data.accomplishment.classification', 'substantially_complete')
        ->assertJsonPath('data.performance_items.0.project_name', 'Pilot output')
        ->assertJsonMissingPath('data.files')
        ->assertJsonMissing(['private/path/report.pdf']);
});

test('AgencyAnalytics detail shows own Project Accomplishment Report analytics', function () {
    $agency = phase4ReportAgency('phase-five-detail-par');
    $admin = phase4ReportUser('agency_admin', $agency);
    $report = phase4ReportRecord($agency, $admin, 'project-accomplishment', detail: [
        'reporting_period' => 'Q2',
    ]);

    $this->actingAs($admin)
        ->getJson("/api/agency/analytics/project-reports/{$report->id}")
        ->assertOk()
        ->assertJsonPath('data.research_id', $report->id)
        ->assertJsonPath('data.report_type', 'project-accomplishment')
        ->assertJsonPath('data.reporting_period', 'Q2')
        ->assertJsonPath('data.completeness.classification', 'complete')
        ->assertJsonPath('data.performance_items.0.target_value', '10 sessions');
});

test('AgencyAnalytics detail rejects cross agency normal research guests and super admins on agency route', function () {
    $agency = phase4ReportAgency('phase-five-detail-auth');
    $otherAgency = phase4ReportAgency('phase-five-detail-other');
    $admin = phase4ReportUser('agency_admin', $agency);
    $otherAdmin = phase4ReportUser('agency_admin', $otherAgency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);
    $otherReport = phase4ReportRecord($otherAgency, $otherAdmin);
    $normalResearch = Research::create([
        'slug' => 'normal-detail-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $admin->id,
        'title' => 'Normal Research Study',
        'abstract' => 'Not a project report.',
        'authors' => ['Researcher'],
        'publication_year' => 2026,
        'category' => 'Research Study',
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]);

    $this->getJson("/api/agency/analytics/project-reports/{$otherReport->id}")
        ->assertUnauthorized();

    $this->actingAs($admin)
        ->getJson("/api/agency/analytics/project-reports/{$otherReport->id}")
        ->assertForbidden();

    $this->actingAs($admin)
        ->getJson("/api/agency/analytics/project-reports/{$normalResearch->id}")
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->getJson("/api/agency/analytics/project-reports/{$otherReport->id}")
        ->assertForbidden();
});

test('AgencyAnalytics project report endpoints return valid no data responses', function () {
    $agency = phase4ReportAgency('phase-four-empty');
    $admin = phase4ReportUser('agency_admin', $agency);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.total_reports', 0)
        ->assertJsonPath('data.total_allotted_budget', '0.00')
        ->assertJsonPath('data.overall_utilization_percentage', null);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/budget')
        ->assertOk()
        ->assertJsonPath('data.totals.report_count', 0)
        ->assertJsonPath('data.totals.utilization_percentage', null);
});

test('AdminAnalytics project reports see regional totals and can filter by agency', function () {
    $agency = phase4ReportAgency('phase-four-admin-a');
    $otherAgency = phase4ReportAgency('phase-four-admin-b');
    $agencyUser = phase4ReportUser('agency_admin', $agency);
    $otherUser = phase4ReportUser('agency_admin', $otherAgency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);

    phase4ReportRecord($agency, $agencyUser, detail: ['allotted_budget' => '100.00', 'utilized_amount' => '50.00']);
    phase4ReportRecord($otherAgency, $otherUser, 'project-accomplishment', detail: ['allotted_budget' => '300.00', 'utilized_amount' => '150.00']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.total_reports', 2)
        ->assertJsonPath('data.total_allotted_budget', '400.00')
        ->assertJsonPath('data.overall_utilization_percentage', 50);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/project-reports/summary?agency_id='.$agency->id)
        ->assertOk()
        ->assertJsonPath('data.total_reports', 1)
        ->assertJsonPath('data.total_allotted_budget', '100.00');
});

test('AdminAnalytics overview returns all aggregate panels in one bounded query pass', function () {
    $agency = phase4ReportAgency('phase-four-overview');
    $agencyAdmin = phase4ReportUser('agency_admin', $agency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);

    foreach (range(1, 5) as $index) {
        phase4ReportRecord($agency, $agencyAdmin, research: ['title' => 'Overview Report '.$index]);
    }

    DB::enableQueryLog();
    DB::flushQueryLog();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/project-reports/overview')
        ->assertOk()
        ->assertJsonPath('data.summary.total_reports', 5)
        ->assertJsonPath('data.budget.totals.report_count', 5)
        ->assertJsonPath('data.agencies.0.agency_id', $agency->id)
        ->assertJsonCount(2, 'data.status.report_type');

    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(10);
});

test('AdminAnalytics project report exports support filtered PDF and CSV downloads', function () {
    $agency = phase4ReportAgency('export-agency');
    $agencyAdmin = phase4ReportUser('agency_admin', $agency);
    $superAdmin = phase4ReportUser('super_admin', null, true);
    phase4ReportRecord($agency, $agencyAdmin, 'terminal-report', [
        'title' => 'Exported Terminal Report',
    ]);

    $pdf = $this->actingAs($superAdmin)
        ->get('/api/admin/analytics/project-reports/export?format=pdf&report_type=terminal-report');
    $pdf->assertOk()
        ->assertHeader('content-type', 'application/pdf');
    expect($pdf->getContent())->toStartWith('%PDF-');

    $csv = $this->actingAs($superAdmin)
        ->get('/api/admin/analytics/project-reports/export?format=csv&report_type=terminal-report');
    $csv->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    expect($csv->streamedContent())->toContain('Exported Terminal Report');
});

test('AgencyAnalytics project report exports are filtered and agency scoped', function () {
    $agency = phase4ReportAgency('agency-export-scope');
    $otherAgency = phase4ReportAgency('agency-export-other');
    $agencyAdmin = phase4ReportUser('agency_admin', $agency);
    $otherAdmin = phase4ReportUser('agency_admin', $otherAgency);
    phase4ReportRecord($agency, $agencyAdmin, research: ['title' => 'Own Export Report']);
    phase4ReportRecord($otherAgency, $otherAdmin, research: ['title' => 'Other Agency Export Report']);

    $pdf = $this->actingAs($agencyAdmin)
        ->get('/api/agency/analytics/project-reports/export?format=pdf&report_type=terminal-report');
    $pdf->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertDownload('agency-project-report-analytics-'.now()->format('Y-m-d').'.pdf');
    expect($pdf->getContent())->toStartWith('%PDF-');

    $csv = $this->actingAs($agencyAdmin)
        ->get('/api/agency/analytics/project-reports/export?format=csv&report_type=terminal-report');
    $csv->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8')
        ->assertDownload('agency-project-report-analytics-'.now()->format('Y-m-d').'.csv');

    expect($csv->streamedContent())
        ->toContain('Own Export Report')
        ->not->toContain('Other Agency Export Report');
});

test('project report PDF renders missing financial values as not reported', function () {
    $html = view('reports.admin.project-report-analytics', [
        'records' => collect([[
            'research_id' => 1,
            'title' => 'Missing Financial Data',
            'agency' => ['name' => 'Test Agency', 'short_name' => 'TEST'],
            'report_type' => 'terminal-report',
            'reporting_period' => 'Final',
            'publication_year' => 2026,
            'workflow_status' => 'submitted',
            'completeness' => ['classification' => 'incomplete'],
            'budget' => [
                'data_status' => 'not_reported',
                'allotted_budget' => null,
                'utilized_amount' => null,
                'utilization_percentage' => null,
            ],
            'accomplishment' => ['physical_accomplishment_percentage' => null],
        ]]),
        'summary' => [
            'total_reports' => 1,
            'terminal_reports' => 1,
            'project_accomplishment_reports' => 0,
            'complete_reports' => 0,
            'overall_utilization_percentage' => null,
        ],
        'budget' => [],
        'filters' => [],
        'generatedAt' => now(),
        'isTruncated' => false,
        'recordLimit' => 500,
    ])->render();

    expect($html)
        ->toContain('Not reported</strong>Budget utilization')
        ->toContain('<td class="num">Not reported</td>')
        ->not->toContain('<strong>0.00%</strong>Budget utilization');
});

test('project report PDF record retrieval honors its configured bound', function () {
    $agency = phase4ReportAgency('phase-four-export-limit');
    $admin = phase4ReportUser('agency_admin', $agency);

    foreach (range(1, 3) as $index) {
        phase4ReportRecord($agency, $admin, research: ['title' => 'Limited Export '.$index]);
    }

    $records = app(ProjectReportAnalyticsService::class)
        ->exportRecords([], $agency->id, limit: 2);

    expect($records)->toHaveCount(2);
});

test('AdminAnalytics project report agency comparison aggregates by agency', function () {
    $agency = phase4ReportAgency('phase-four-comparison-a');
    $otherAgency = phase4ReportAgency('phase-four-comparison-b');
    $agencyUser = phase4ReportUser('agency_admin', $agency);
    $otherUser = phase4ReportUser('agency_admin', $otherAgency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);

    phase4ReportRecord($agency, $agencyUser, detail: ['allotted_budget' => '1000.00', 'utilized_amount' => '750.00']);
    phase4ReportRecord($agency, $agencyUser, detail: ['allotted_budget' => null, 'released_amount' => null, 'obligated_amount' => null, 'utilized_amount' => null, 'financial_as_of_date' => null]);
    phase4ReportRecord($otherAgency, $otherUser, detail: ['allotted_budget' => '500.00', 'utilized_amount' => '500.00']);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/analytics/project-reports/agencies')
        ->assertOk()
        ->assertJsonFragment([
            'agency_id' => $agency->id,
            'report_count' => 2,
            'allotted_budget' => '1000.00',
            'utilized_amount' => '750.00',
            'remaining_balance' => '250.00',
            'utilization_percentage' => 75.0,
            'reports_without_financial_data' => 1,
        ]);
});

test('AdminAnalytics detail shows regional project report analytics without raw file data', function () {
    $agency = phase4ReportAgency('phase-six-detail-admin');
    $agencyUser = phase4ReportUser('agency_admin', $agency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);
    $report = phase4ReportRecord($agency, $agencyUser, 'project-accomplishment', detail: [
        'reporting_period' => 'Annual',
        'allotted_budget' => '2000.00',
        'utilized_amount' => '1500.00',
    ]);

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/analytics/project-reports/{$report->id}")
        ->assertOk()
        ->assertJsonPath('data.research_id', $report->id)
        ->assertJsonPath('data.agency.id', $agency->id)
        ->assertJsonPath('data.report_type', 'project-accomplishment')
        ->assertJsonPath('data.reporting_period', 'Annual')
        ->assertJsonPath('data.budget.utilization_percentage', 75)
        ->assertJsonPath('data.performance_items.0.project_name', 'Pilot output')
        ->assertJsonMissingPath('data.files')
        ->assertJsonMissing(['private/path/report.pdf']);
});

test('AdminAnalytics detail rejects agency admins normal research and unavailable reports', function () {
    $agency = phase4ReportAgency('phase-six-detail-auth');
    $agencyUser = phase4ReportUser('agency_admin', $agency);
    $superAdmin = phase4ReportUser('super_admin', withMfa: true);
    $report = phase4ReportRecord($agency, $agencyUser);
    $normalResearch = Research::create([
        'slug' => 'normal-admin-detail-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyUser->id,
        'title' => 'Normal Research Study',
        'abstract' => 'Not a project report.',
        'authors' => ['Researcher'],
        'publication_year' => 2026,
        'category' => 'Research Study',
        'status' => 'submitted',
        'access_level' => 'restricted',
    ]);
    $archived = phase4ReportRecord($agency, $agencyUser, research: ['archived_at' => now()]);

    $this->actingAs($agencyUser)
        ->getJson("/api/admin/analytics/project-reports/{$report->id}")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/analytics/project-reports/{$normalResearch->id}")
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/analytics/project-reports/{$archived->id}")
        ->assertNotFound();
});

test('AdminAnalytics project reports enforce MFA and reject Agency Admin access', function () {
    $agency = phase4ReportAgency('phase-four-auth');
    $agencyAdmin = phase4ReportUser('agency_admin', $agency);
    $superAdminWithoutMfa = phase4ReportUser('super_admin');

    $this->getJson('/api/admin/analytics/project-reports/summary')->assertUnauthorized();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/analytics/project-reports/summary')
        ->assertForbidden();

    $this->actingAs($superAdminWithoutMfa)
        ->getJson('/api/admin/analytics/project-reports/summary')
        ->assertForbidden()
        ->assertJsonPath('errors.redirect', route('two-factor.show', absolute: false));
});

test('ReportAnalytics aggregate calculations preserve missing financial values and legacy reports', function () {
    $agency = phase4ReportAgency('phase-four-calculations');
    $admin = phase4ReportUser('agency_admin', $agency);

    phase4ReportRecord($agency, $admin, detail: ['allotted_budget' => '100.00', 'utilized_amount' => '20.00']);
    phase4ReportRecord($agency, $admin, detail: ['allotted_budget' => '300.00', 'utilized_amount' => '180.00']);
    phase4ReportRecord($agency, $admin, detail: null, items: []);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.total_reports', 3)
        ->assertJsonPath('data.reports_with_financial_data', 2)
        ->assertJsonPath('data.reports_without_financial_data', 1)
        ->assertJsonPath('data.total_allotted_budget', '400.00')
        ->assertJsonPath('data.total_utilized_amount', '200.00')
        ->assertJsonPath('data.overall_utilization_percentage', 50);
});

test('ReportAnalytics aggregate financial cards use the same reported totals', function () {
    $agency = phase4ReportAgency('phase-four-comparable-financials');
    $admin = phase4ReportUser('agency_admin', $agency);

    phase4ReportRecord($agency, $admin, detail: [
        'allotted_budget' => '1000.00',
        'released_amount' => null,
        'obligated_amount' => null,
        'utilized_amount' => null,
    ]);
    phase4ReportRecord($agency, $admin, detail: [
        'allotted_budget' => null,
        'released_amount' => null,
        'obligated_amount' => null,
        'utilized_amount' => '900.00',
    ]);
    phase4ReportRecord($agency, $admin, detail: [
        'allotted_budget' => '200.00',
        'released_amount' => '200.00',
        'obligated_amount' => '100.00',
        'utilized_amount' => '100.00',
    ]);
    phase4ReportRecord($agency, $admin, detail: [
        'allotted_budget' => null,
        'released_amount' => null,
        'obligated_amount' => null,
        'utilized_amount' => null,
        'financial_as_of_date' => '2026-06-30',
    ]);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.reports_with_financial_data', 3)
        ->assertJsonPath('data.reports_without_financial_data', 1)
        ->assertJsonPath('data.total_allotted_budget', '1200.00')
        ->assertJsonPath('data.total_utilized_amount', '1000.00')
        ->assertJsonPath('data.total_remaining_balance', '200.00')
        ->assertJsonPath('data.overall_utilization_percentage', 83.33);
});

test('AgencyAnalytics exposes zero-budget utilization as overutilized', function () {
    $agency = phase4ReportAgency('phase-four-zero-budget-overutilization');
    $admin = phase4ReportUser('agency_admin', $agency);
    $report = phase4ReportRecord($agency, $admin, detail: [
        'allotted_budget' => '0.00',
        'released_amount' => '0.00',
        'obligated_amount' => '0.00',
        'utilized_amount' => '100.00',
    ]);

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?budget_classification=overutilized')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.research_id', $report->id)
        ->assertJsonPath('data.0.budget.data_status', 'reported')
        ->assertJsonPath('data.0.budget.classification', 'overutilized');

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/summary')
        ->assertOk()
        ->assertJsonPath('data.total_remaining_balance', '-100.00')
        ->assertJsonPath('data.overall_utilization_percentage', null);
});

test('ReportAnalytics records endpoint keeps query count bounded after pagination', function () {
    $agency = phase4ReportAgency('phase-four-performance');
    $admin = phase4ReportUser('agency_admin', $agency);

    foreach (range(1, 5) as $index) {
        phase4ReportRecord($agency, $admin, research: ['title' => 'Bounded Query '.$index]);
    }

    DB::enableQueryLog();
    DB::flushQueryLog();

    $this->actingAs($admin)
        ->getJson('/api/agency/analytics/project-reports/records?per_page=2')
        ->assertOk()
        ->assertJsonPath('meta.pagination.per_page', 2);

    // Canonical RBAC adds one bounded role lookup to the request middleware.
    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(9);
});

test('ReportAnalytics public resources remain unchanged', function () {
    $agency = phase4ReportAgency('phase-four-public');
    $admin = phase4ReportUser('agency_admin', $agency);
    $report = phase4ReportRecord($agency, $admin, research: [
        'status' => 'published',
        'access_level' => 'public',
        'published_at' => now(),
    ]);

    $this->getJson('/api/public/research/'.$report->id)
        ->assertOk()
        ->assertJsonMissingPath('report_detail')
        ->assertJsonMissingPath('performance_items')
        ->assertJsonMissing(['budget', 'completeness', 'accomplishment', 'private/path/report.pdf']);
});
