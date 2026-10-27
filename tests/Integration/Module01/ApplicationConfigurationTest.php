<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-05 P0: deployed session cookies are host-only and missing CSRF tokens are rejected', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $cookieName = trim((string) getenv('RIKMS_QA_SESSION_COOKIE'));

    if ($cookieName === '') {
        $this->markTestIncomplete('Blocked: set RIKMS_QA_SESSION_COOKIE to the deployed Laravel session cookie name.');
    }

    $target = DeploymentTarget::fromEnvironment();
    $login = $target->get('/agency/login');

    expect($login['status'])->toBe(200);
    preg_match('/<meta\s+name="csrf-token"\s+content="([^"]+)"/i', $login['body'], $firstTokenMatch);

    $sessionCookie = collect($target->setCookies())->first(fn (string $cookie): bool => str_starts_with($cookie, $cookieName.'='));
    $cookiePresent = is_string($sessionCookie);
    expect($cookiePresent)->toBeTrue('The login page must issue the configured session cookie.');

    $attributes = array_map('trim', explode(';', (string) $sessionCookie));
    $lowerAttributes = array_map('strtolower', $attributes);
    $path = collect($attributes)->first(fn (string $attribute): bool => str_starts_with(strtolower($attribute), 'path='));
    $sameSite = collect($attributes)->first(fn (string $attribute): bool => str_starts_with(strtolower($attribute), 'samesite='));
    $domain = collect($lowerAttributes)->first(fn (string $attribute): bool => str_starts_with($attribute, 'domain='));

    expect(in_array('secure', $lowerAttributes, true))->toBeTrue('The session cookie must include Secure.')
        ->and(in_array('httponly', $lowerAttributes, true))->toBeTrue('The session cookie must include HttpOnly.')
        ->and(strtolower((string) $path) === 'path=/')->toBeTrue('The session cookie path must be /.')
        ->and(in_array(strtolower((string) $sameSite), ['samesite=lax', 'samesite=strict'], true))->toBeTrue('The session cookie needs SameSite=Lax or Strict.')
        ->and($domain === null)->toBeTrue('IP-hosted session cookies must not set a domain attribute.');

    $secondLogin = $target->get('/agency/login');
    expect($secondLogin['status'])->toBe(200);
    preg_match('/<meta\s+name="csrf-token"\s+content="([^"]+)"/i', $secondLogin['body'], $secondTokenMatch);
    $sessionPersisted = isset($firstTokenMatch[1], $secondTokenMatch[1])
        && hash_equals($firstTokenMatch[1], $secondTokenMatch[1]);
    expect($sessionPersisted)->toBeTrue('The session CSRF token did not persist across legitimate same-host requests.');

    $csrfProbe = $target->request(
        $target->urlFor('/agency/login'),
        'POST',
        '',
        ['Content-Type: application/x-www-form-urlencoded'],
    );

    expect($csrfProbe['status'])->toBe(419, 'A POST without a CSRF token must be rejected by the deployed web middleware.');
})->group('module01', 'module01-live');
