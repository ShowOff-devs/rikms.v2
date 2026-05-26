<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;

function createProtectedApiAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createProtectedApiRole(string $slug): Role
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

function createProtectedApiUser(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createProtectedApiRole($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createProtectedApiResearch(Agency $agency, User $uploader, string $title = 'Protected Research'): Research
{
    return Research::create([
        'slug' => str($title)->slug()->append('-'.str()->random(6))->toString(),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => $title,
        'abstract' => 'A protected API research record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['protected api'],
        'status' => 'published',
        'access_level' => 'public',
    ]);
}

test('guest cannot access protected agency APIs', function () {
    $this->getJson('/api/agency/dashboard')
        ->assertUnauthorized()
        ->assertJsonStructure(['message', 'errors']);
});

test('guest cannot access protected admin APIs', function () {
    $this->getJson('/api/admin/dashboard')
        ->assertUnauthorized()
        ->assertJsonStructure(['message', 'errors']);
});

test('agency admin can access agency dashboard', function () {
    $agency = createProtectedApiAgency('dost-xi');
    $user = createProtectedApiUser('agency_admin', $agency);
    createProtectedApiResearch($agency, $user);

    $this->actingAs($user)
        ->getJson('/api/agency/dashboard')
        ->assertOk()
        ->assertJsonStructure(['message', 'data' => ['metrics'], 'meta'])
        ->assertJsonPath('data.metrics.total_research', 1);
});

test('agency admin cannot access another agency research detail', function () {
    $ownAgency = createProtectedApiAgency('own-agency');
    $otherAgency = createProtectedApiAgency('other-agency');
    $user = createProtectedApiUser('agency_admin', $ownAgency);
    $otherUser = createProtectedApiUser('agency_admin', $otherAgency);
    $research = createProtectedApiResearch($otherAgency, $otherUser, 'Other Agency Research');

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$research->id}")
        ->assertForbidden()
        ->assertJsonStructure(['message', 'errors']);
});

test('super admin can access admin dashboard', function () {
    $user = createProtectedApiUser('super_admin');

    $this->actingAs($user)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->assertJsonStructure(['message', 'data' => ['metrics'], 'meta']);
});

test('super admin can view all agencies and research', function () {
    $firstAgency = createProtectedApiAgency('first-agency');
    $secondAgency = createProtectedApiAgency('second-agency');
    $admin = createProtectedApiUser('super_admin');
    $firstUploader = createProtectedApiUser('agency_admin', $firstAgency);
    $secondUploader = createProtectedApiUser('agency_admin', $secondAgency);

    createProtectedApiResearch($firstAgency, $firstUploader, 'First Research');
    createProtectedApiResearch($secondAgency, $secondUploader, 'Second Research');

    $this->actingAs($admin)
        ->getJson('/api/admin/agencies')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 2);

    $this->actingAs($admin)
        ->getJson('/api/admin/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 2);
});

test('user without required role receives forbidden response', function () {
    $user = createProtectedApiUser('public_user');

    $this->actingAs($user)
        ->getJson('/api/admin/dashboard')
        ->assertForbidden()
        ->assertJsonStructure(['message', 'errors']);
});

test('protected list endpoints return standard response and pagination metadata', function () {
    $agency = createProtectedApiAgency('paginated-agency');
    $user = createProtectedApiUser('agency_admin', $agency);
    $research = createProtectedApiResearch($agency, $user);

    AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Public Researcher',
        'requester_email' => 'researcher@example.test',
        'purpose' => 'Policy review',
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->getJson('/api/agency/access-requests?per_page=1')
        ->assertOk()
        ->assertJsonStructure(['message', 'data', 'meta' => ['pagination']])
        ->assertJsonPath('meta.pagination.per_page', 1)
        ->assertJsonPath('meta.pagination.total', 1);
});

test('agency admin without agency cannot access agency scoped APIs', function () {
    $user = createProtectedApiUser('agency_admin');

    $this->actingAs($user)
        ->getJson('/api/agency/dashboard')
        ->assertForbidden()
        ->assertJsonStructure(['message', 'errors']);
});
