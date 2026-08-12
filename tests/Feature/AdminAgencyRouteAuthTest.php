<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use PragmaRX\Google2FA\Google2FA;

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
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
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

test('existing agency admin sessions lose access after agency deactivation', function () {
    $agency = portalAuditAgency('deactivated-session-agency');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);

    $this->actingAs($agencyAdmin)
        ->get('/agency/dashboard')
        ->assertOk();

    $agency->forceFill(['status' => 'inactive'])->save();

    $this->get('/agency/dashboard')
        ->assertRedirect('/agency/login')
        ->assertSessionHasErrors('email');

    $this->assertGuest();

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/dashboard')
        ->assertForbidden()
        ->assertJsonPath('message', 'Your agency account is inactive. Contact a system administrator.');
});

test('unverified portal users cannot access protected web or api routes', function () {
    $agency = portalAuditAgency('unverified-agency');
    $agencyAdmin = User::factory()->unverified()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $superAdmin = User::factory()->unverified()->create([
        'role' => 'super_admin',
        'status' => 'active',
    ]);

    $this->actingAs($agencyAdmin)
        ->get('/agency/dashboard')
        ->assertRedirect(route('verification.notice', absolute: false));

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/dashboard')
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->get('/admin/dashboard')
        ->assertRedirect(route('verification.notice', absolute: false));

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/dashboard')
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

test('admin web routes require super admins to enable two factor authentication', function () {
    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'status' => 'active',
    ]);

    $this->actingAs($superAdmin)
        ->get('/admin/dashboard')
        ->assertRedirect(route('two-factor.show', absolute: false));

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/dashboard')
        ->assertForbidden()
        ->assertJsonPath('errors.redirect', route('two-factor.show', absolute: false));
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

    $this->actingAs($superAdmin)
        ->get('/admin/analytics/project-reports/123')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/analytics/project-reports/show')
            ->where('researchId', '123')
        );

    $this->actingAs($agencyAdmin)
        ->get('/admin/analytics/project-reports/123')
        ->assertForbidden();
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
    ])->assertRedirect('/two-factor-challenge');

    $this->assertGuest();

    $this->post('/logout');

    $this->post('/admin/login', [
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('agency login sends verification email for an unverified account', function () {
    Notification::fake();

    $agency = portalAuditAgency('unverified-login-email');
    $agencyAdmin = User::factory()->unverified()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);

    $this->post('/agency/login', [
        'agency' => $agency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/agency/dashboard');

    Notification::assertSentTo($agencyAdmin, VerifyEmail::class);
});

test('login failures successes and logout are recorded as security events once', function () {
    SecurityEvent::query()->delete();

    $agency = portalAuditAgency('security-event-login');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);

    $this->post('/agency/login', [
        'agency' => $agency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'wrong-password',
    ])->assertSessionHasErrors('email');

    expect(SecurityEvent::query()->where('event_type', 'login.failed')->count())->toBe(1);

    $this->post('/agency/login', [
        'agency' => $agency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])->assertRedirect('/agency/dashboard');

    expect(SecurityEvent::query()->where('event_type', 'login.success')->count())->toBe(1);

    $loginEvent = SecurityEvent::query()->where('event_type', 'login.success')->firstOrFail();
    expect($loginEvent->metadata)
        ->toHaveKey('email', $agencyAdmin->email)
        ->not->toHaveKey('password')
        ->not->toHaveKey('code');

    $this->post('/logout')->assertRedirect('/');

    expect(SecurityEvent::query()->where('event_type', 'logout')->count())->toBe(1);
});

test('super admin session revocation is scoped to admin sessions and safe storage', function () {
    config(['session.driver' => 'database']);
    SecurityEvent::query()->delete();

    $agency = portalAuditAgency('admin-session-revoke-agency');
    $superAdmin = portalAuditUser('super_admin');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $publicUser = User::factory()->create([
        'role' => 'public_user',
        'status' => 'active',
    ]);

    DB::table('sessions')->insert([
        [
            'id' => 'target-admin-session',
            'user_id' => $agencyAdmin->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 Chrome Windows',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'public-session',
            'user_id' => $publicUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 Firefox Windows',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ],
    ]);

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/public-session')
        ->assertNotFound();

    expect(DB::table('sessions')->where('id', 'public-session')->exists())->toBeTrue();

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/missing-session')
        ->assertNotFound();

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/target-admin-session')
        ->assertOk()
        ->assertJsonPath('data.id', 'target-admin-session');

    expect(DB::table('sessions')->where('id', 'target-admin-session')->exists())->toBeFalse()
        ->and(SecurityEvent::query()->where('event_type', 'session.revoked')->count())->toBe(1);
});

test('super admin session revocation rejects non database session drivers', function () {
    config(['session.driver' => 'array']);

    $superAdmin = portalAuditUser('super_admin');

    $this->actingAs($superAdmin)
        ->deleteJson('/api/admin/security/sessions/any-session')
        ->assertStatus(409);
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

test('agency json login with two factor enabled sends user to challenge before dashboard', function () {
    $agency = portalAuditAgency('agency-two-factor-login');
    $agencyAdmin = portalAuditUser('agency_admin', $agency);
    $secret = 'JBSWY3DPEHPK3PXP';

    $agencyAdmin->forceFill([
        'two_factor_secret' => encrypt($secret),
        'two_factor_recovery_codes' => encrypt(json_encode(['agency-recovery-code'])),
        'two_factor_confirmed_at' => now(),
    ])->save();

    $this->postJson('/agency/login', [
        'agency' => $agency->slug,
        'email' => $agencyAdmin->email,
        'password' => 'password',
    ])
        ->assertOk()
        ->assertJsonPath('two_factor', true)
        ->assertSessionHas('login.id', $agencyAdmin->id);

    $this->assertGuest();

    $this->post('/two-factor-challenge', [
        'code' => app(Google2FA::class)->getCurrentOtp($secret),
    ])->assertRedirect('/agency/dashboard');

    $this->assertAuthenticatedAs($agencyAdmin);
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
    ])->assertRedirect('/two-factor-challenge');

    $this->assertGuest();
});
