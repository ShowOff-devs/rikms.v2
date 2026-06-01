<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;

function createPhase6Role(string $slug): Role
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

function createPhase6User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase6Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase6Research(Agency $agency, User $uploader, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => 'phase-6-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 6 Research',
        'abstract' => 'A Phase 6 integration record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 6'],
        'status' => $status,
        'access_level' => 'request_required',
    ]);
}

test('agency active detail endpoint hides archived research after browser QA finding', function () {
    $agency = Agency::create([
        'slug' => 'phase-six-archive-detail',
        'name' => 'Phase Six Archive Detail',
        'short_name' => 'P6AD',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $agencyAdmin = createPhase6User('agency_admin', $agency);
    $research = createPhase6Research($agency, $agencyAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/archive", [
            'reason' => 'Browser QA archived detail check.',
        ])
        ->assertOk();

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$research->id}")
        ->assertNotFound();
});

test('ai review and apply endpoints are protected and validate missing mongo results safely', function () {
    $agency = Agency::create([
        'slug' => 'phase-six-ai-review',
        'name' => 'Phase Six AI Review',
        'short_name' => 'P6AI',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $otherAgency = Agency::create([
        'slug' => 'phase-six-ai-other',
        'name' => 'Phase Six AI Other',
        'short_name' => 'P6AO',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $agencyAdmin = createPhase6User('agency_admin', $agency);
    $otherAdmin = createPhase6User('agency_admin', $otherAgency);
    $superAdmin = createPhase6User('super_admin');
    $research = createPhase6Research($agency, $agencyAdmin, 'submitted');
    $otherResearch = createPhase6Research($otherAgency, $otherAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/ai-results/missing-result/review", [
            'review_status' => 'reviewed',
            'notes' => 'Looks plausible.',
        ])
        ->assertNotFound();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$otherResearch->id}/ai-results/missing-result/review", [
            'review_status' => 'reviewed',
        ])
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/ai-results/missing-result/apply", [
            'fields' => ['title'],
        ])
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/ai-results/missing-result/review", [
            'review_status' => 'reviewed',
        ])
        ->assertNotFound();
});
