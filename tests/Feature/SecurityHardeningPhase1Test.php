<?php

use Illuminate\Http\Request;

test('web responses include baseline security headers without local hsts', function () {
    $this->get('/')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeaderMissing('Strict-Transport-Security')
        ->assertHeaderMissing('Content-Security-Policy-Report-Only');
});

test('deployed https responses include report only csp and hsts', function () {
    config()->set('app.env', 'pilot');
    config()->set('app.url', 'https://rikms-pilot.example.gov.ph');

    $this->get('https://rikms-pilot.example.gov.ph/')
        ->assertOk()
        ->assertHeader('Content-Security-Policy-Report-Only')
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

test('trusted network configuration is explicit and does not trust every proxy', function () {
    expect(config('trustedproxy.hosts'))->toBeArray()
        ->and(config('trustedproxy.proxies'))->toBeArray()
        ->and(config('trustedproxy.proxies'))->not->toContain('*')
        ->and(config('trustedproxy.headers'))->toBe(
            Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_HOST,
        );
});

test('configured trusted hosts are parsed as exact patterns', function () {
    config()->set('trustedproxy.hosts', [
        '^rikms\\.example\\.gov\\.ph$',
        '^rikms\-pilot\\.example\\.gov\\.ph$',
    ]);

    expect(config('trustedproxy.hosts'))
        ->toContain('^rikms\\.example\\.gov\\.ph$')
        ->not->toContain('.*');
});
