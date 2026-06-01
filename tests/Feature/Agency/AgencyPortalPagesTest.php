<?php

use App\Models\Agency;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createAgencyPortalUser(string $role = 'agency_admin'): User
{
    $agency = Agency::create([
        'slug' => 'agency-portal-'.str()->random(8),
        'name' => 'Agency Portal Test Agency',
        'short_name' => 'APT',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);

    return User::factory()->create([
        'agency_id' => $agency->id,
        'role' => $role,
        'status' => 'active',
    ]);
}

test('agency login page can be rendered', function () {
    $response = $this->get('/agency/login');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/login'),
    );
});

test('agency forgot password page can be rendered', function () {
    $response = $this->get('/agency/forgot-password');

    $response->assertOk();
});

test('agency research repository page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/research-repository');

    $response->assertOk();
});

test('agency research repository edit page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/research-repository/rr-001/edit');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/research-repository/edit')
        ->where('repositoryId', 'rr-001'),
    );
});

test('agency dashboard page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/dashboard');

    $response->assertOk();
});

test('agency access requests page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/access-requests');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/access-requests'),
    );
});

test('agency analytics page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/analytics');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/analytics'),
    );
});

test('agency notifications page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/notifications');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/notifications'),
    );
});

test('agency profile page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/profile');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/profile'),
    );
});

test('agency settings page can be rendered', function () {
    $response = $this->actingAs(createAgencyPortalUser())->get('/agency/settings');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/settings'),
    );
});

test('agency upload pages can be rendered', function (string $path) {
    $response = $this->actingAs(createAgencyPortalUser())->get($path);

    $response->assertOk();
})->with([
    '/agency/upload',
    '/agency/upload/research',
    '/agency/upload/terminal-report',
    '/agency/upload/project-accomplishment',
]);

test('agency portal pages redirect guests to login', function () {
    $this->get('/agency/dashboard')->assertRedirect('/agency/login');
});

test('admin portal rejects agency users and allows super admins', function () {
    $this->actingAs(createAgencyPortalUser())
        ->get('/admin/research-moderation')
        ->assertForbidden();

    $this->actingAs(createAgencyPortalUser('super_admin'))
        ->get('/admin/research-moderation')
        ->assertOk();
});

test('admin login redirects an existing agency admin session to agency dashboard', function () {
    $agencyAdmin = createAgencyPortalUser();

    $this->actingAs($agencyAdmin)
        ->get('/admin/login')
        ->assertRedirect('/agency/dashboard');

    $this->assertAuthenticatedAs($agencyAdmin);
});

test('web and api admin dashboard route names are distinct', function () {
    expect(route('admin.dashboard', absolute: false))->toBe('/admin/dashboard')
        ->and(route('api.admin.dashboard', absolute: false))->toBe('/api/admin/dashboard');
});
