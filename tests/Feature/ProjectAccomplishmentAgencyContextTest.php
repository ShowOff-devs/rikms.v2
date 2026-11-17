<?php

use App\Models\Agency;
use App\Models\Role;
use App\Models\User;

function parAgencyContextAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->headline()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function parAgencyContextUser(?Agency $agency): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
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

function parAgencyContextPayload(array $overrides = []): array
{
    return array_replace([
        'title' => 'Agency Context PAR',
        'category' => 'Project Accomplishment Report',
        'publication_year' => (int) now()->year,
    ], $overrides);
}

test('authenticated agency admin creates a PAR owned by their active agency', function () {
    $agency = parAgencyContextAgency('par-valid-agency');
    $user = parAgencyContextUser($agency);

    $this->actingAs($user)
        ->postJson('/api/agency/research', parAgencyContextPayload())
        ->assertCreated()
        ->assertJsonPath('data.category', 'Project Accomplishment Report')
        ->assertJsonPath('data.agency_id', $agency->id);

    $this->assertDatabaseHas('research', [
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'category' => 'Project Accomplishment Report',
    ]);
});

test('agency admin without an agency is blocked with a friendly backend message', function () {
    $user = parAgencyContextUser(null);

    $this->actingAs($user)
        ->postJson('/api/agency/research', parAgencyContextPayload())
        ->assertForbidden()
        ->assertJsonPath('message', 'Your account is not assigned to an active agency.');

    $this->assertDatabaseMissing('research', [
        'uploaded_by' => $user->id,
        'category' => 'Project Accomplishment Report',
    ]);
});

test('PAR ownership ignores an unauthorized agency supplied by the client', function () {
    $authenticatedAgency = parAgencyContextAgency('par-authenticated-agency');
    $unauthorizedAgency = parAgencyContextAgency('par-unauthorized-agency');
    $user = parAgencyContextUser($authenticatedAgency);

    $response = $this->actingAs($user)
        ->postJson('/api/agency/research', parAgencyContextPayload([
            'agency_id' => $unauthorizedAgency->id,
        ]))
        ->assertCreated()
        ->assertJsonPath('data.agency_id', $authenticatedAgency->id);

    $this->assertDatabaseHas('research', [
        'id' => $response->json('data.id'),
        'agency_id' => $authenticatedAgency->id,
        'uploaded_by' => $user->id,
    ]);
    $this->assertDatabaseMissing('research', [
        'id' => $response->json('data.id'),
        'agency_id' => $unauthorizedAgency->id,
    ]);
});
