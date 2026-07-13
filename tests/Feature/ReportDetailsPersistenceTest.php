<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchPerformanceItem;
use App\Models\ResearchReportDetail;
use App\Models\Role;
use App\Models\User;

function reportPersistenceAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function reportPersistenceRole(string $slug): Role
{
    return Role::updateOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function reportPersistenceUser(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        reportPersistenceRole($role)->id => ['assigned_at' => now()],
    ]);

    if ($role === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('test-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

    return $user;
}

function reportPersistencePayload(array $overrides = []): array
{
    return array_replace_recursive([
        'title' => 'Regional Innovation Terminal Report',
        'abstract' => 'A terminal report draft with analytics-ready metrics.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Terminal Report',
        'sdg_tags' => ['SDG 9'],
        'keywords' => ['terminal report'],
        'access_level' => 'request_required',
        'report_details' => [
            'reporting_period' => 'Q2',
            'project_start_date' => '2026-01-01',
            'project_end_date' => '2026-06-30',
            'allotted_budget' => 1250000.50,
            'released_amount' => 900000,
            'obligated_amount' => 750000,
            'utilized_amount' => 625000,
            'physical_accomplishment_percent' => 50,
            'financial_as_of_date' => '2026-06-30',
        ],
        'performance_items' => [
            [
                'project_name' => 'Prototype deployment',
                'target_value' => '4 prototypes',
                'actual_value' => '2 prototypes',
                'accomplishment_percentage' => 50,
                'project_status' => 'in-progress',
                'remarks' => 'Two pilot sites completed.',
            ],
            [
                'project_name' => 'Training rollout',
                'target_value' => '10 sessions',
                'actual_value' => '10 sessions',
                'accomplishment_percentage' => 100,
                'project_status' => 'completed',
                'remarks' => 'All sessions completed.',
            ],
        ],
    ], $overrides);
}

test('terminal report details and performance rows persist and reload', function () {
    $agency = reportPersistenceAgency('terminal-report-persistence');
    $user = reportPersistenceUser('agency_admin', $agency);

    $response = $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload());

    $response
        ->assertCreated()
        ->assertJsonPath('data.report_detail.reporting_period', 'Q2')
        ->assertJsonPath('data.report_detail.project_start_date', '2026-01-01')
        ->assertJsonPath('data.report_detail.project_end_date', '2026-06-30')
        ->assertJsonPath('data.report_detail.allotted_budget', '1250000.50')
        ->assertJsonPath('data.report_detail.released_amount', '900000.00')
        ->assertJsonPath('data.report_detail.obligated_amount', '750000.00')
        ->assertJsonPath('data.report_detail.utilized_amount', '625000.00')
        ->assertJsonPath('data.report_detail.physical_accomplishment_percent', '50.00')
        ->assertJsonPath('data.performance_items.0.project_name', 'Prototype deployment')
        ->assertJsonPath('data.performance_items.0.target_value', '4 prototypes')
        ->assertJsonPath('data.performance_items.1.accomplishment_percentage', '100.00');

    $researchId = $response->json('data.id');

    $this->assertDatabaseHas('research_report_details', [
        'research_id' => $researchId,
        'reporting_period' => 'Q2',
        'allotted_budget' => 1250000.50,
        'released_amount' => 900000,
        'obligated_amount' => 750000,
        'utilized_amount' => 625000,
        'physical_accomplishment_percent' => 50,
    ]);
    $detail = ResearchReportDetail::where('research_id', $researchId)->firstOrFail();
    expect($detail->project_start_date?->toDateString())->toBe('2026-01-01')
        ->and($detail->project_end_date?->toDateString())->toBe('2026-06-30')
        ->and($detail->financial_as_of_date?->toDateString())->toBe('2026-06-30');
    $this->assertDatabaseCount('research_performance_items', 2);

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$researchId}")
        ->assertOk()
        ->assertJsonPath('data.report_detail.financial_as_of_date', '2026-06-30')
        ->assertJsonPath('data.performance_items.1.project_status', 'completed');
});

test('project accomplishment report supports nulls explicit zeros and repeated saves without duplicate rows', function () {
    $agency = reportPersistenceAgency('par-report-persistence');
    $user = reportPersistenceUser('agency_admin', $agency);

    $createPayload = reportPersistencePayload([
        'title' => 'Project Accomplishment Report',
        'category' => 'Project Accomplishment Report',
        'report_details' => [
            'reporting_period' => 'Annual',
            'allotted_budget' => 0,
            'released_amount' => '',
            'obligated_amount' => 0,
            'utilized_amount' => '',
            'physical_accomplishment_percent' => 0,
        ],
    ]);
    $createPayload['performance_items'] = [
        [
            'project_name' => 'Beneficiary monitoring',
            'target_value' => '0 beneficiaries',
            'actual_value' => '0 beneficiaries',
            'accomplishment_percentage' => 0,
            'project_status' => 'not-started',
            'remarks' => '',
        ],
    ];

    $create = $this->actingAs($user)
        ->postJson('/api/agency/research', $createPayload)
        ->assertCreated()
        ->assertJsonPath('data.report_detail.reporting_period', 'Annual')
        ->assertJsonPath('data.report_detail.allotted_budget', '0.00')
        ->assertJsonPath('data.report_detail.released_amount', null)
        ->assertJsonPath('data.report_detail.obligated_amount', '0.00')
        ->assertJsonPath('data.report_detail.utilized_amount', null)
        ->assertJsonPath('data.report_detail.physical_accomplishment_percent', '0.00');

    $researchId = $create->json('data.id');

    $updatePayload = reportPersistencePayload([
        'title' => 'Project Accomplishment Report Updated',
        'category' => 'Project Accomplishment Report',
        'report_details' => [
            'reporting_period' => 'Final',
            'allotted_budget' => 100,
            'released_amount' => 80,
            'obligated_amount' => 90,
            'utilized_amount' => 75,
        ],
    ]);
    $updatePayload['performance_items'] = [
        [
            'project_name' => 'Updated row',
            'target_value' => '8 deliverables',
            'actual_value' => '6 deliverables',
            'accomplishment_percentage' => 75,
            'project_status' => 'in-progress',
        ],
    ];

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", $updatePayload)
        ->assertOk()
        ->assertJsonPath('data.report_detail.reporting_period', 'Final')
        ->assertJsonPath('data.report_detail.released_amount', '80.00')
        ->assertJsonPath('data.report_detail.obligated_amount', '90.00')
        ->assertJsonPath('data.performance_items.0.project_name', 'Updated row');

    expect(ResearchReportDetail::where('research_id', $researchId)->count())->toBe(1)
        ->and(ResearchPerformanceItem::where('research_id', $researchId)->count())->toBe(1);
});

test('existing reports without report metric children still load for editing', function () {
    $agency = reportPersistenceAgency('legacy-report-load');
    $user = reportPersistenceUser('agency_admin', $agency);

    $research = Research::create([
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Legacy Terminal Report',
        'category' => 'Terminal Report',
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$research->id}")
        ->assertOk()
        ->assertJsonPath('data.report_detail', null)
        ->assertJsonPath('data.performance_items', []);
});

test('failed report validation does not persist partial report metrics', function () {
    $agency = reportPersistenceAgency('report-validation-rollback');
    $user = reportPersistenceUser('agency_admin', $agency);

    $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload([
            'title' => 'Invalid Metrics Report',
            'report_details' => [
                'reporting_period' => 'Q2',
                'allotted_budget' => 100,
                'physical_accomplishment_percent' => 150,
            ],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['report_details.physical_accomplishment_percent']);

    $this->assertDatabaseMissing('research', ['title' => 'Invalid Metrics Report']);
    $this->assertDatabaseCount('research_report_details', 0);
    $this->assertDatabaseCount('research_performance_items', 0);
});

test('omitted report child payload leaves existing report details untouched', function () {
    $agency = reportPersistenceAgency('partial-report-persistence');
    $user = reportPersistenceUser('agency_admin', $agency);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload())
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", [
            'title' => 'Only Parent Field Changed',
            'category' => 'Terminal Report',
        ])
        ->assertOk()
        ->assertJsonPath('data.report_detail.reporting_period', 'Q2')
        ->assertJsonPath('data.performance_items.0.project_name', 'Prototype deployment');
});

test('explicit blank report detail update clears nullable metric fields', function () {
    $agency = reportPersistenceAgency('explicit-report-clearing');
    $user = reportPersistenceUser('agency_admin', $agency);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload())
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", [
            'title' => 'Cleared Metrics Report',
            'category' => 'Terminal Report',
            'report_details' => [
                'reporting_period' => '',
                'project_start_date' => '',
                'project_end_date' => '',
                'allotted_budget' => '',
                'released_amount' => '',
                'obligated_amount' => '',
                'utilized_amount' => '',
                'physical_accomplishment_percent' => '',
                'financial_as_of_date' => '',
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.report_detail.reporting_period', null)
        ->assertJsonPath('data.report_detail.project_start_date', null)
        ->assertJsonPath('data.report_detail.allotted_budget', null)
        ->assertJsonPath('data.report_detail.utilized_amount', null)
        ->assertJsonPath('data.report_detail.physical_accomplishment_percent', null);

    $detail = ResearchReportDetail::where('research_id', $researchId)->firstOrFail();

    expect($detail->reporting_period)->toBeNull()
        ->and($detail->project_start_date)->toBeNull()
        ->and($detail->allotted_budget)->toBeNull()
        ->and($detail->utilized_amount)->toBeNull()
        ->and($detail->physical_accomplishment_percent)->toBeNull();
});

test('normal research study payload does not create report detail rows', function () {
    $agency = reportPersistenceAgency('normal-research-unaffected');
    $user = reportPersistenceUser('agency_admin', $agency);

    $this->actingAs($user)
        ->postJson('/api/agency/research', [
            'title' => 'Normal Research Study',
            'category' => 'Research Study',
            'report_details' => [
                'reporting_period' => 'Q1',
                'allotted_budget' => 100,
            ],
            'performance_items' => [
                ['project_name' => 'Should not persist'],
            ],
        ])
        ->assertCreated();

    $this->assertDatabaseCount('research_report_details', 0);
    $this->assertDatabaseCount('research_performance_items', 0);
});

test('blank performance rows are ignored while meaningful rows persist', function () {
    $agency = reportPersistenceAgency('blank-performance-row');
    $user = reportPersistenceUser('agency_admin', $agency);

    $payload = reportPersistencePayload([
        'performance_items' => [
            [
                'project_name' => '',
                'target_value' => '',
                'actual_value' => '',
                'accomplishment_percentage' => '',
                'project_status' => 'not-reported',
                'remarks' => '',
            ],
            [
                'project_name' => 'Conduct stakeholder training',
                'target_value' => '10 trainings',
                'actual_value' => '8 trainings',
                'accomplishment_percentage' => 80,
                'project_status' => 'substantially-complete',
                'remarks' => '',
            ],
        ],
    ]);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', $payload)
        ->assertCreated()
        ->assertJsonCount(1, 'data.performance_items')
        ->assertJsonPath('data.performance_items.0.project_name', 'Conduct stakeholder training')
        ->assertJsonPath('data.performance_items.0.project_status', 'substantially-complete')
        ->json('data.id');

    expect(ResearchPerformanceItem::where('research_id', $researchId)->count())->toBe(1);
});

test('agency admin cannot update another agency report details', function () {
    $ownAgency = reportPersistenceAgency('own-report-agency');
    $otherAgency = reportPersistenceAgency('other-report-agency');
    $user = reportPersistenceUser('agency_admin', $ownAgency);
    $otherUser = reportPersistenceUser('agency_admin', $otherAgency);

    $research = Research::create([
        'agency_id' => $otherAgency->id,
        'uploaded_by' => $otherUser->id,
        'title' => 'Other Agency Terminal Report',
        'category' => 'Terminal Report',
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$research->id}")
        ->assertForbidden();

    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$research->id}", reportPersistencePayload([
            'title' => 'Cross Agency Update',
        ]))
        ->assertForbidden();
});

test('super admin can read permitted report metrics', function () {
    $agency = reportPersistenceAgency('super-admin-report-metrics');
    $agencyUser = reportPersistenceUser('agency_admin', $agency);
    $superAdmin = reportPersistenceUser('super_admin');

    $researchId = $this->actingAs($agencyUser)
        ->postJson('/api/agency/research', reportPersistencePayload())
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/research/{$researchId}")
        ->assertOk()
        ->assertJsonPath('data.report_detail.reporting_period', 'Q2')
        ->assertJsonPath('data.report_detail.allotted_budget', '1250000.50')
        ->assertJsonPath('data.performance_items.0.target_value', '4 prototypes');
});

test('public research resource does not expose report financial details', function () {
    $agency = reportPersistenceAgency('public-report-exclusion');
    $user = reportPersistenceUser('agency_admin', $agency);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload([
            'status' => 'draft',
            'access_level' => 'public',
        ]))
        ->assertCreated()
        ->json('data.id');

    $research = Research::findOrFail($researchId);
    $research->update([
        'status' => 'published',
        'published_at' => now(),
    ]);

    $this->getJson("/api/public/research/{$research->id}")
        ->assertOk()
        ->assertJsonMissingPath('report_detail')
        ->assertJsonMissingPath('performance_items')
        ->assertJsonMissing(['allotted_budget']);
});

test('invalid report detail validation rejects bad period percentage and date range', function () {
    $agency = reportPersistenceAgency('invalid-report-detail');
    $user = reportPersistenceUser('agency_admin', $agency);

    $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload([
            'report_details' => [
                'reporting_period' => 'Q5',
                'project_start_date' => '2026-06-30',
                'project_end_date' => '2026-01-01',
                'physical_accomplishment_percent' => 101,
            ],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'report_details.reporting_period',
            'report_details.project_end_date',
            'report_details.physical_accomplishment_percent',
        ]);
});

test('permanent parent deletion cascades report detail rows', function () {
    $agency = reportPersistenceAgency('report-cascade-delete');
    $user = reportPersistenceUser('agency_admin', $agency);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', reportPersistencePayload())
        ->assertCreated()
        ->json('data.id');

    Research::findOrFail($researchId)->forceDelete();

    $this->assertDatabaseMissing('research_report_details', ['research_id' => $researchId]);
    $this->assertDatabaseMissing('research_performance_items', ['research_id' => $researchId]);
});
