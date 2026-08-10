<?php

use App\Contracts\MalwareScanner;
use App\Providers\AppServiceProvider;
use App\Services\MalwareScanner\FakeMalwareScanner;
use Illuminate\Http\Request;

test('local responses include baseline headers without csp or hsts by default', function () {
    config()->set('app.env', 'local');
    config()->set('security_headers.csp.mode', 'off');

    $this->get('/')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeaderMissing('Strict-Transport-Security')
        ->assertHeaderMissing('Content-Security-Policy')
        ->assertHeaderMissing('Content-Security-Policy-Report-Only');
});

test('local csp may be configured as report only', function () {
    config()->set('app.env', 'local');
    config()->set('security_headers.csp.mode', 'report-only');

    $this->get('/')
        ->assertOk()
        ->assertHeader('Content-Security-Policy-Report-Only')
        ->assertHeaderMissing('Content-Security-Policy');
});

test('staging responses include only report only csp and no hsts', function () {
    config()->set('app.env', 'staging');
    config()->set('security_headers.csp.mode', 'report-only');

    $this->get('https://rikms-staging.example.gov.ph/')
        ->assertOk()
        ->assertHeader('Content-Security-Policy-Report-Only')
        ->assertHeaderMissing('Content-Security-Policy')
        ->assertHeaderMissing('Strict-Transport-Security');
});

test('secure production responses enforce nonce based csp and hsts', function () {
    config()->set('app.env', 'production');
    config()->set('security_headers.csp.mode', 'enforce');

    $response = $this->get('https://rikms.example.gov.ph/')->assertOk();
    $policy = (string) $response->headers->get('Content-Security-Policy');
    preg_match('/<script nonce="([^"]+)"/', $response->getContent(), $nonceMatch);

    $response
        ->assertHeaderMissing('Content-Security-Policy-Report-Only')
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    expect($policy)
        ->toContain("script-src 'self' https://challenges.cloudflare.com 'nonce-")
        ->toContain("style-src-attr 'unsafe-inline'")
        ->toContain('frame-src https://challenges.cloudflare.com')
        ->not->toContain("'unsafe-eval'")
        ->not->toContain("script-src 'self' 'unsafe-inline'");

    expect($nonceMatch[1] ?? null)->not->toBeNull()
        ->and($policy)->toContain("'nonce-{$nonceMatch[1]}'");
});

test('production hsts requires an actually secure request', function () {
    config()->set('app.env', 'production');
    config()->set('app.url', 'https://rikms.example.gov.ph');
    config()->set('security_headers.csp.mode', 'enforce');

    $this->get('http://rikms.example.gov.ph/')
        ->assertOk()
        ->assertHeaderMissing('Strict-Transport-Security');
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

test('testing environment resolves only the explicit fake malware scanner', function () {
    config()->set('rikms.uploads.malware_scanner', 'fake');
    $this->app->forgetInstance(MalwareScanner::class);

    expect(app(MalwareScanner::class))->toBeInstanceOf(FakeMalwareScanner::class);
});

test('deployed environments reject unsafe security service configuration', function (array $override, string $violation) {
    $originalEnvironment = $this->app->environment();
    $this->app->detectEnvironment(fn (): string => 'production');
    config()->set([
        'app.env' => 'production',
        'app.debug' => false,
        'app.url' => 'https://rikms.example.test',
        'session.encrypt' => true,
        'session.secure' => true,
        'rikms.security.log_level' => 'warning',
        'rikms.security.force_super_admin_mfa' => true,
        'rikms.dev_seed_accounts.enabled' => false,
        'rikms.security.dev_seed_accounts_requested' => false,
        'rikms.dev_seed_accounts.allow_outside_safe_environments' => false,
        'trustedproxy.hosts' => ['^rikms\\.example\\.test$'],
        'queue.default' => 'database',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'rikms.public_access_requests.enabled' => false,
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
    ]);
    config()->set($override);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');
    $exception = null;

    try {
        $method->invoke($provider);
    } catch (RuntimeException $caught) {
        $exception = $caught;
    } finally {
        $this->app->detectEnvironment(fn (): string => $originalEnvironment);
    }

    expect($exception)->not->toBeNull()
        ->and($exception?->getMessage())->toContain($violation);
})->with([
    'disabled scanner' => [['rikms.uploads.malware_scanner' => 'none'], 'MALWARE_SCANNER must be clamav'],
    'testing scanner' => [['rikms.uploads.malware_scanner' => 'fake'], 'MALWARE_SCANNER must be clamav'],
    'missing host' => [['rikms.uploads.clamav_host' => ''], 'CLAMAV_HOST must be configured'],
    'invalid port' => [['rikms.uploads.clamav_port' => 0], 'CLAMAV_PORT must be between 1 and 65535'],
    'invalid timeout' => [['rikms.uploads.clamav_timeout_seconds' => 0], 'CLAMAV_TIMEOUT_SECONDS must be greater than zero'],
    'csp not enforced' => [['security_headers.csp.mode' => 'report-only'], 'CSP_MODE must be enforce in production'],
    'csp staging evidence missing' => [['security_headers.csp.production_validated' => false], 'CSP_PRODUCTION_VALIDATED must be true before production enforcement'],
]);

test('deployed environments accept the complete captcha contract', function () {
    $originalEnvironment = $this->app->environment();
    $this->app->detectEnvironment(fn (): string => 'production');
    config()->set([
        'app.env' => 'production',
        'app.debug' => false,
        'app.url' => 'https://rikms.example.test',
        'session.encrypt' => true,
        'session.secure' => true,
        'rikms.security.log_level' => 'warning',
        'rikms.security.force_super_admin_mfa' => true,
        'rikms.dev_seed_accounts.enabled' => false,
        'rikms.security.dev_seed_accounts_requested' => false,
        'rikms.dev_seed_accounts.allow_outside_safe_environments' => false,
        'trustedproxy.hosts' => ['^rikms\\.example\\.test$'],
        'queue.default' => 'database',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
    ]);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');

    try {
        $method->invoke($provider);
    } finally {
        $this->app->detectEnvironment(fn (): string => $originalEnvironment);
    }

    expect(true)->toBeTrue();
});

test('captcha may be disabled only in explicitly allowed environments', function (string $environment) {
    $originalEnvironment = $this->app->environment();
    $this->app->detectEnvironment(fn (): string => $environment);
    config()->set('rikms.public_access_requests.captcha.enabled', false);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');

    try {
        $method->invoke($provider);
    } finally {
        $this->app->detectEnvironment(fn (): string => $originalEnvironment);
    }

    expect(true)->toBeTrue();
})->with(['local', 'testing']);

test('an unrecognized environment cannot disable captcha', function () {
    $originalEnvironment = $this->app->environment();
    $this->app->detectEnvironment(fn (): string => 'development');
    config()->set('rikms.public_access_requests.captcha.enabled', false);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');

    try {
        $method->invoke($provider);
    } finally {
        $this->app->detectEnvironment(fn (): string => $originalEnvironment);
    }
})->throws(RuntimeException::class, 'CAPTCHA may be disabled only in local or testing');

test('deployed environments reject inconsistent captcha configuration', function (array $override, string $violation) {
    $originalEnvironment = $this->app->environment();
    $this->app->detectEnvironment(fn (): string => 'production');
    config()->set([
        'app.env' => 'production',
        'app.debug' => false,
        'app.url' => 'https://rikms.example.test',
        'session.encrypt' => true,
        'session.secure' => true,
        'rikms.security.log_level' => 'warning',
        'rikms.security.force_super_admin_mfa' => true,
        'rikms.dev_seed_accounts.enabled' => false,
        'rikms.security.dev_seed_accounts_requested' => false,
        'rikms.dev_seed_accounts.allow_outside_safe_environments' => false,
        'trustedproxy.hosts' => ['^rikms\\.example\\.test$'],
        'queue.default' => 'database',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
    ]);
    config()->set($override);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');
    $exception = null;

    try {
        $method->invoke($provider);
    } catch (RuntimeException $caught) {
        $exception = $caught;
    } finally {
        $this->app->detectEnvironment(fn (): string => $originalEnvironment);
    }

    expect($exception)->not->toBeNull()
        ->and($exception?->getMessage())->toContain($violation);
})->with([
    'disabled backend' => [[
        'rikms.public_access_requests.captcha.enabled' => false,
        'rikms.public_access_requests.captcha.frontend_enabled' => false,
    ], 'PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED must be true'],
    'mismatched flags' => [[
        'rikms.public_access_requests.captcha.frontend_enabled' => false,
    ], 'VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED must match PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED'],
    'missing public site key' => [[
        'rikms.public_access_requests.captcha.site_key' => '',
    ], 'VITE_CAPTCHA_SITE_KEY must be configured'],
    'missing backend secret' => [[
        'rikms.public_access_requests.captcha.secret_key' => '',
    ], 'CAPTCHA_SECRET_KEY must be configured'],
]);
