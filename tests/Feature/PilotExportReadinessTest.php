<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;

function createPilotExportRole(string $slug): Role
{
    return Role::query()->firstOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function createPilotExportUser(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPilotExportRole($role)->id => ['assigned_at' => now()],
    ]);

    if ($role === 'super_admin') {
        $user->forceFill([
            'two_factor_secret' => encrypt('pilot-export-secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['pilot-export-code'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
    }

    return $user;
}

function createPilotExportAgency(string $slug): Agency
{
    return Agency::query()->create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPilotExportResearch(Agency $agency, User $uploader, array $overrides = []): Research
{
    return Research::query()->create(array_merge([
        'slug' => 'pilot-export-research-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Pilot Export Research',
        'abstract' => 'Pilot export fixture.',
        'authors' => ['Pilot Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['pilot-export'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 3,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));
}

test('agency analytics export is agency scoped and escapes formula-like cells', function () {
    $ownAgency = createPilotExportAgency('pilot-own-agency');
    $otherAgency = createPilotExportAgency('pilot-other-agency');
    $agencyAdmin = createPilotExportUser('agency_admin', $ownAgency);
    $otherAdmin = createPilotExportUser('agency_admin', $otherAgency);

    createPilotExportResearch($ownAgency, $agencyAdmin, [
        'title' => '=HYPERLINK("https://attacker.test","click")',
    ]);
    createPilotExportResearch($otherAgency, $otherAdmin, [
        'title' => 'Other Agency Research',
    ]);

    $this->actingAs($agencyAdmin)
        ->get('/api/agency/analytics/export')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8')
        ->assertDownload('agency-research-analytics-all-years.csv');

    $csv = $this->actingAs($agencyAdmin)
        ->get('/api/agency/analytics/export')
        ->streamedContent();

    expect($csv)->toContain('\'=HYPERLINK')
        ->and($csv)->not->toContain('Other Agency Research');

    $pdf = $this->actingAs($agencyAdmin)
        ->get('/api/agency/analytics/export?format=pdf');

    $pdf->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertDownload('agency-research-analytics-all-years.pdf');
    expect($pdf->getContent())->toStartWith('%PDF-');
});

test('admin access monitoring export is protected filtered and escapes formula-like cells', function () {
    $agency = createPilotExportAgency('pilot-access-agency');
    $agencyAdmin = createPilotExportUser('agency_admin', $agency);
    $superAdmin = createPilotExportUser('super_admin');
    $research = createPilotExportResearch($agency, $agencyAdmin, [
        'title' => '+Access Export Research',
    ]);

    AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Pilot Requester',
        'requester_email' => '@requester.example',
        'purpose' => 'Pilot export verification',
        'status' => 'pending',
        'requested_at' => now(),
    ]);
    AccessRequest::query()->create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Approved Requester',
        'requester_email' => 'approved@example.test',
        'purpose' => 'Should be filtered out',
        'status' => 'approved',
        'requested_at' => now(),
    ]);

    $this->getJson('/api/admin/access-monitoring/export')->assertUnauthorized();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/access-monitoring/export')
        ->assertForbidden();

    $response = $this->actingAs($superAdmin)
        ->get('/api/admin/access-monitoring/export?statuses=pending')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8')
        ->assertDownload('access-monitoring-'.now()->format('Y-m-d').'.csv');

    $csv = $response->streamedContent();

    expect($csv)->toContain('\'+Access Export Research')
        ->and($csv)->toContain('\'@requester.example')
        ->and($csv)->not->toContain('approved@example.test');
});
