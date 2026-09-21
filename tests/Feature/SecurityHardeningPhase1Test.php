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

test('api responses include baseline security headers', function () {
    config()->set('app.env', 'local');
    config()->set('security_headers.csp.mode', 'off');

    $this->getJson('/api/public/platform-settings')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeaderMissing('Strict-Transport-Security');
});

test('local csp may be configured as report only', function () {
    config()->set('app.env', 'local');
    config()->set('security_headers.csp.mode', 'report-only');
    config()->set('security_headers.csp.report_uri', '/api/security/csp-reports');

    $response = $this->get('/')
        ->assertOk()
        ->assertHeader('Content-Security-Policy-Report-Only')
        ->assertHeaderMissing('Content-Security-Policy');

    expect($response->headers->get('Content-Security-Policy-Report-Only'))
        ->toContain('report-uri /api/security/csp-reports');
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

test('turnstile frontend and backend use the same fixed action', function () {
    $expectedAction = (string) config('rikms.public_access_requests.captcha.expected_action');
    $frontend = file_get_contents(resource_path('js/pages/research/show.tsx'));

    expect($expectedAction)->toBe('public_access_request')
        ->and($frontend)->toContain("action=\"{$expectedAction}\"");
});

test('deployed environments reject unsafe security service configuration', function (array $override, string $violation) {
    $originalEnvironment = $this->app->environment();
    $originalDatabase = config('database.default');
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
        'database.default' => 'mysql',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'security_headers.csp.report_uri' => '/api/security/csp-reports',
        'security_headers.csp.collector.enabled' => true,
        'rikms.public_access_requests.enabled' => false,
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
        'rikms.public_access_requests.captcha.allowed_hostnames' => ['rikms.example.test'],
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.quarantine_disk' => 'upload_quarantine',
        'rikms.uploads.storage_disk' => 'private_uploads',
        'infrastructure.require_backup_ready' => true,
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
        config()->set('database.default', $originalDatabase);
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
    'invalid stream limit' => [['rikms.uploads.clamav_stream_max_length_mb' => 0], 'CLAMAV_STREAM_MAX_LENGTH_MB must be greater than zero'],
    'unsupported production queue' => [['queue.default' => 'sqs'], 'QUEUE_CONNECTION must be database or redis in staging and production'],
    'sqlite production database' => [['database.default' => 'sqlite'], 'DB_CONNECTION must be mysql or mariadb'],
    'shared upload disk' => [['rikms.uploads.storage_disk' => 'upload_quarantine'], 'UPLOAD_QUARANTINE_DISK and UPLOAD_STORAGE_DISK must be separate'],
    'public upload disk' => [['rikms.uploads.storage_disk' => 'public'], 'Upload disk [public] must not be public'],
    'csp not enforced' => [['security_headers.csp.mode' => 'report-only'], 'CSP_MODE must be enforce in production'],
    'csp staging evidence missing' => [['security_headers.csp.production_validated' => false], 'CSP_PRODUCTION_VALIDATED must be true before production enforcement'],
    'csp report endpoint missing' => [['security_headers.csp.report_uri' => ''], 'CSP_REPORT_URI must be configured'],
    'internal csp collector disabled' => [['security_headers.csp.collector.enabled' => false], 'CSP_REPORT_COLLECTOR_ENABLED must be true for the internal report URI'],
    'missing captcha hostname allowlist' => [['rikms.public_access_requests.captcha.allowed_hostnames' => []], 'CAPTCHA_ALLOWED_HOSTNAMES must contain at least one hostname'],
    'invalid captcha hostname allowlist' => [['rikms.public_access_requests.captcha.allowed_hostnames' => ['https://rikms.example.test']], 'CAPTCHA_ALLOWED_HOSTNAMES must contain only valid hostnames'],
    'monitoring enabled without destination' => [['monitoring.alerts_enabled' => true], 'Monitoring alerts require a valid email recipient or HTTPS webhook'],
    'backup readiness gate disabled' => [['infrastructure.require_backup_ready' => false], 'INFRA_REQUIRE_BACKUP_READY must be true in deployed environments'],
]);

test('deployed environments accept the complete captcha contract', function () {
    $originalEnvironment = $this->app->environment();
    $originalDatabase = config('database.default');
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
        'database.default' => 'mysql',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'security_headers.csp.report_uri' => '/api/security/csp-reports',
        'security_headers.csp.collector.enabled' => true,
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.quarantine_disk' => 'upload_quarantine',
        'rikms.uploads.storage_disk' => 'private_uploads',
        'infrastructure.require_backup_ready' => true,
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
        'rikms.public_access_requests.captcha.allowed_hostnames' => ['rikms.example.test'],
    ]);

    $provider = new AppServiceProvider($this->app);
    $method = new ReflectionMethod($provider, 'enforceProductionSecurityConfiguration');

    try {
        $method->invoke($provider);
    } finally {
        config()->set('database.default', $originalDatabase);
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
    $originalDatabase = config('database.default');
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
        'database.default' => 'mysql',
        'security_headers.csp.mode' => 'enforce',
        'security_headers.csp.production_validated' => true,
        'security_headers.csp.report_uri' => '/api/security/csp-reports',
        'security_headers.csp.collector.enabled' => true,
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.quarantine_disk' => 'upload_quarantine',
        'rikms.uploads.storage_disk' => 'private_uploads',
        'rikms.public_access_requests.captcha.enabled' => true,
        'rikms.public_access_requests.captcha.frontend_enabled' => true,
        'rikms.public_access_requests.captcha.provider' => 'turnstile',
        'rikms.public_access_requests.captcha.site_key' => 'test-site-key',
        'rikms.public_access_requests.captcha.secret_key' => 'test-secret-key',
        'rikms.public_access_requests.captcha.timeout_seconds' => 3,
        'rikms.public_access_requests.captcha.allowed_hostnames' => ['rikms.example.test'],
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
        config()->set('database.default', $originalDatabase);
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
    'missing allowed hostnames' => [[
        'rikms.public_access_requests.captcha.allowed_hostnames' => [],
    ], 'CAPTCHA_ALLOWED_HOSTNAMES must contain at least one hostname'],
    'invalid allowed hostname' => [[
        'rikms.public_access_requests.captcha.allowed_hostnames' => ['rikms.example.test/path'],
    ], 'CAPTCHA_ALLOWED_HOSTNAMES must contain only valid hostnames'],
]);
