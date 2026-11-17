<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function documentDraftRouteAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->headline()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function documentDraftRouteUser(Agency $agency): User
{
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $role = Role::updateOrCreate(
        ['slug' => 'agency_admin'],
        [
            'name' => 'Agency Admin',
            'display_name' => 'Agency Admin',
            'is_system' => true,
            'is_active' => true,
        ],
    );
    $user->roles()->syncWithoutDetaching([$role->id => ['assigned_at' => now()]]);

    return $user;
}

function documentDraftRouteResearch(
    Agency $agency,
    User $user,
    string $category,
): Research {
    return Research::create([
        'slug' => str($category)->slug().'-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => $category,
        'category' => $category,
        'publication_year' => (int) now()->year,
        'status' => 'draft',
        'access_level' => 'request_required',
    ]);
}

test('Terminal Report draft route renders the existing wizard with its research id', function () {
    $agency = documentDraftRouteAgency('terminal-draft-route');
    $user = documentDraftRouteUser($agency);
    $research = documentDraftRouteResearch($agency, $user, 'Terminal Report');

    $this->actingAs($user)
        ->get(route('agency.upload.terminal-report.edit', $research, absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/upload/terminal-report')
            ->where('researchId', (string) $research->id));
});

test('PAR draft route renders the PAR wizard with its research id', function () {
    $agency = documentDraftRouteAgency('par-draft-route');
    $user = documentDraftRouteUser($agency);
    $research = documentDraftRouteResearch($agency, $user, 'Project Accomplishment Report');

    $this->actingAs($user)
        ->get(route('agency.upload.project-accomplishment.edit', $research, absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/upload/project-accomplishment')
            ->where('researchId', (string) $research->id));
});

test('document draft routes reject a mismatched document type', function () {
    $agency = documentDraftRouteAgency('mismatched-draft-route');
    $user = documentDraftRouteUser($agency);
    $terminalReport = documentDraftRouteResearch($agency, $user, 'Terminal Report');
    $par = documentDraftRouteResearch($agency, $user, 'Project Accomplishment Report');

    $this->actingAs($user)
        ->get('/agency/upload/project-accomplishment/'.$terminalReport->id)
        ->assertNotFound();
    $this->actingAs($user)
        ->get('/agency/upload/terminal-report/'.$par->id)
        ->assertNotFound();
});

test('saved PAR data persists and resumes by research id after refresh', function () {
    $agency = documentDraftRouteAgency('par-refresh');
    $user = documentDraftRouteUser($agency);
    $created = $this->actingAs($user)
        ->postJson('/api/agency/research', [
            'title' => 'Persisted PAR draft',
            'abstract' => 'Persisted description after refresh.',
            'category' => 'Project Accomplishment Report',
            'publication_year' => (int) now()->year,
            'report_details' => [
                'reporting_period' => 'Q3',
                'project_start_date' => now()->startOfYear()->toDateString(),
                'project_end_date' => now()->endOfYear()->toDateString(),
                'last_wizard_step' => 'financials',
            ],
        ])
        ->assertCreated()
        ->assertJsonPath('data.report_detail.reporting_period', 'Q3')
        ->assertJsonPath('data.report_detail.last_wizard_step', 'financials');
    $researchId = $created->json('data.id');

    $this->actingAs($user)
        ->getJson('/api/agency/research/'.$researchId)
        ->assertOk()
        ->assertJsonPath('data.title', 'Persisted PAR draft')
        ->assertJsonPath('data.abstract', 'Persisted description after refresh.')
        ->assertJsonPath('data.report_detail.reporting_period', 'Q3')
        ->assertJsonPath('data.report_detail.last_wizard_step', 'financials');

    $this->actingAs($user)
        ->get('/agency/upload/project-accomplishment/'.$researchId)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/upload/project-accomplishment')
            ->where('researchId', (string) $researchId));
});

test('PAR draft resumption rejects another agency', function () {
    $ownerAgency = documentDraftRouteAgency('par-resume-owner');
    $otherAgency = documentDraftRouteAgency('par-resume-outsider');
    $owner = documentDraftRouteUser($ownerAgency);
    $outsider = documentDraftRouteUser($otherAgency);
    $research = documentDraftRouteResearch(
        $ownerAgency,
        $owner,
        'Project Accomplishment Report',
    );

    $this->actingAs($outsider)
        ->get('/agency/upload/project-accomplishment/'.$research->id)
        ->assertForbidden();
    $this->actingAs($outsider)
        ->getJson('/api/agency/research/'.$research->id)
        ->assertForbidden();
});
