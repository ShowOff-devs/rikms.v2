<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
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
        'public_metadata' => ['funding_source' => 'GAA'],
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

    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(8);
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
