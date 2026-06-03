<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function portalAuditAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function portalAuditUser(string $role, ?Agency $agency = null): User
{
    return User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);
}

function portalAuditResearch(Agency $agency, User $uploader, string $title = 'Portal Audit Research'): Research
{
    return Research::create([
        'slug' => str($title)->slug().'-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => $title,
        'abstract' => 'A route audit research record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['route audit'],
        'status' => 'published',
        'access_level' => 'public',
    ]);
}

test('agency web routes use agency login and role protection', function () {
    $agency = portalAuditAgency('agency-web');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');

    $this->get('/agency/dashboard')->assertRedirect('/agency/login');

    $this->actingAs($agencyAdmin)
        ->get('/agency/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agency/dashboard'));

    $this->actingAs($superAdmin)
        ->get('/agency/dashboard')
        ->assertForbidden();
});

test('admin web routes use admin login and role protection', function () {
    $agency = portalAuditAgency('admin-web-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');

    $this->get('/admin/dashboard')->assertRedirect('/admin/login');

    $this->actingAs($superAdmin)
        ->get('/admin/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/dashboard'));

    $this->actingAs($agencyAdmin)
        ->get('/admin/dashboard')
        ->assertForbidden();
});

test('admin dashboard never redirects super admins to agency dashboard', function () {
    $superAdmin = portalAuditUser('super_admin');

    $this->actingAs($superAdmin)
        ->get('/admin/dashboard')
        ->assertOk();
});

test('expected web route aliases render existing portal pages', function () {
    $agency = portalAuditAgency('alias-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');

    $this->actingAs($agencyAdmin)
        ->get('/agency/research')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agency/research-repository'));

    $this->actingAs($agencyAdmin)
        ->get('/agency/research/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agency/upload/research'));

    $this->actingAs($superAdmin)
        ->get('/admin/users')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/agency-admin-users'));

    $this->actingAs($superAdmin)
        ->get('/admin/research')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/system-research'));

    $this->actingAs($superAdmin)
        ->get('/admin/moderation')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/research-moderation'));
});

test('api routes return expected auth and role responses', function () {
    $agency = portalAuditAgency('api-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');
    portalAuditResearch($agency, $agencyAdmin);

    $this->getJson('/api/agency/dashboard')->assertUnauthorized();
    $this->getJson('/api/admin/dashboard')->assertUnauthorized();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/admin/dashboard')
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->getJson('/api/agency/dashboard')
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/dashboard')
        ->assertOk();

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/dashboard')
        ->assertOk();
});

test('agency admins cannot access another agency research through agency API', function () {
    $ownAgency = portalAuditAgency('own-api-agency');
    $otherAgency = portalAuditAgency('other-api-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $ownAgency);
    $otherAdmin = portalAuditUser('agency_admin', $otherAgency);
    $research = portalAuditResearch($otherAgency, $otherAdmin, 'Other Scoped Research');

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$research->id}")
        ->assertForbidden();
});

test('portal login endpoints redirect by role and reject wrong portal users', function () {
    $agency = portalAuditAgency('login-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');

    $this->post('/agency/login', [
        'agency' => $agency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/agency/dashboard');

    $this->post('/logout');

    $this->post('/admin/login', [
        'email' => $superAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/admin/dashboard');

    $this->post('/logout');

    $this->post('/admin/login', [
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('agency login renders active agencies from the database', function () {
    $activeAgency = portalAuditAgency('active-login-agency');
    $inactiveAgency = portalAuditAgency('inactive-login-agency');
    $inactiveAgency->update(['status' => 'inactive']);

    $this->get('/agency/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/login')
            ->has('agencies', 1)
            ->where('agencies.0.id', $activeAgency->slug)
            ->where('agencies.0.shortName', $activeAgency->short_name)
        );
});

test('agency login rejects credentials for a different selected agency', function () {
    $ownAgency = portalAuditAgency('own-login-agency');
    $otherAgency = portalAuditAgency('other-login-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $ownAgency);

    $this->post('/agency/login', [
        'agency' => $otherAgency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('default login remains an agency login entry point with role based redirect', function () {
    $agency = portalAuditAgency('default-login-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $superAdmin = portalAuditUser('super_admin');

    $this->get('/login')->assertRedirect('/agency/login');

    $this->post('/login', [
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/agency/dashboard');

    $this->post('/logout');

    $this->post('/login', [
        'email' => $superAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/admin/dashboard');
});
