<?php

use App\Models\Agency;
use App\Models\User;
use App\Services\TurnstileVerificationService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    config()->set('rikms.turnstile', [
        'enabled' => true,
        'site_key' => '1x00000000000000000000AA',
        'secret_key' => '1x0000000000000000000000000000000AA',
        'timeout_seconds' => 1,
        'expected_hostnames' => ['localhost'],
        'actions' => [
            'public_access_request' => 'public_access_request',
            'public_contact' => 'public_contact',
            'agency_login' => 'agency_login',
            'super_admin_login' => 'super_admin_login',
            'password_reset' => 'password_reset',
        ],
    ]);
});

function fakeSuccessfulTurnstile(string $action): void
{
    Http::fake([
        'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
            'success' => true,
            'hostname' => 'localhost',
            'action' => $action,
        ]),
    ]);
}

test('agency admin login cannot bypass turnstile', function () {
    Http::fake();

    $this->postJson(route('agency.login.store'), [
        'email' => 'agency@example.test',
        'password' => 'password',
    ])->assertUnprocessable()->assertJsonValidationErrors('captcha_token');

    $this->assertGuest();
    Http::assertNothingSent();
});

test('default fortify login cannot bypass agency turnstile', function () {
    Http::fake();

    $this->postJson(route('login.store'), [
        'email' => 'agency@example.test',
        'password' => 'password',
    ])->assertUnprocessable()->assertJsonValidationErrors('captcha_token');

    $this->assertGuest();
    Http::assertNothingSent();
});

test('super admin login cannot bypass turnstile', function () {
    Http::fake();

    $this->postJson(route('admin.login.store'), [
        'email' => 'admin@example.test',
        'password' => 'password',
    ])->assertUnprocessable()->assertJsonValidationErrors('captcha_token');

    $this->assertGuest();
    Http::assertNothingSent();
});

test('password recovery cannot bypass turnstile', function () {
    Notification::fake();
    Http::fake();

    $this->post(route('password.email'), [
        'email' => 'user@example.test',
    ])->assertSessionHasErrors('captcha_token');

    Notification::assertNothingSent();
    Http::assertNothingSent();
});

test('valid turnstile token preserves agency login and role redirect', function () {
    $agency = Agency::create([
        'slug' => 'turnstile-agency',
        'name' => 'Turnstile Agency',
        'short_name' => 'TURN',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    fakeSuccessfulTurnstile('agency_login');

    $this->postJson(route('agency.login.store'), [
        'agency' => $agency->slug,
        'email' => $user->email,
        'password' => 'password',
        'captcha_token' => 'valid-token',
    ])->assertOk()->assertJsonPath('redirect', '/agency/dashboard');

    $this->assertAuthenticatedAs($user);
});

test('valid turnstile token preserves super admin mfa challenge', function () {
    $user = User::factory()->create([
        'role' => 'super_admin',
        'status' => 'active',
        'two_factor_secret' => encrypt('test-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code'])),
        'two_factor_confirmed_at' => now(),
    ]);
    fakeSuccessfulTurnstile('super_admin_login');

    $this->postJson(route('admin.login.store'), [
        'email' => $user->email,
        'password' => 'password',
        'captcha_token' => 'valid-token',
    ])->assertOk()->assertJsonPath('two_factor', true);

    $this->assertGuest();
    expect(session('login.id'))->toBe($user->id);
});

test('valid turnstile token preserves generic password recovery response', function () {
    Notification::fake();
    $user = User::factory()->create();
    fakeSuccessfulTurnstile('password_reset');

    $this->post(route('password.email'), [
        'email' => $user->email,
        'captcha_token' => 'valid-token',
    ])->assertRedirect()->assertSessionHasNoErrors();

    Notification::assertSentTo($user, ResetPassword::class);
});

test('turnstile classifies expired or reused tokens', function () {
    Http::fake(['*' => Http::response([
        'success' => false,
        'error-codes' => ['timeout-or-duplicate'],
    ])]);

    $request = Request::create('/', 'POST', ['captcha_token' => 'used-token']);
    $result = app(TurnstileVerificationService::class)->verify($request, 'agency_login');

    expect($result->valid)->toBeFalse()
        ->and($result->reason)->toBe('expired_or_reused_token');
});

test('turnstile rejects incorrect hostname and action', function (array $payload, string $reason) {
    Http::fake(['*' => Http::response(['success' => true, ...$payload])]);

    $request = Request::create('/', 'POST', ['captcha_token' => 'valid-token']);
    $result = app(TurnstileVerificationService::class)->verify($request, 'agency_login');

    expect($result->valid)->toBeFalse()->and($result->reason)->toBe($reason);
})->with([
    'hostname' => [['hostname' => 'attacker.example', 'action' => 'agency_login'], 'hostname_mismatch'],
    'action' => [['hostname' => 'localhost', 'action' => 'other_action'], 'action_mismatch'],
]);

test('turnstile provider timeout and server errors fail closed', function (Closure $fake) {
    Http::fake($fake);

    $request = Request::create('/', 'POST', ['captcha_token' => 'provider-token']);
    $result = app(TurnstileVerificationService::class)->verify($request, 'agency_login');

    expect($result->valid)->toBeFalse()->and($result->reason)->toBe('provider_unavailable');
})->with([
    'timeout' => fn () => throw new RuntimeException('Simulated timeout'),
    'server error' => fn () => Http::response([], 503),
]);

test('missing enabled configuration fails closed', function () {
    config()->set('rikms.turnstile.secret_key', null);

    $request = Request::create('/', 'POST', ['captcha_token' => 'token']);
    $result = app(TurnstileVerificationService::class)->verify($request, 'agency_login');

    expect($result->valid)->toBeFalse()->and($result->reason)->toBe('configuration_error');
    Http::assertNothingSent();
});
