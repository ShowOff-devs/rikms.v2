<?php

use App\Models\CspViolationReport;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

function cspCollectorLegacyPayload(array $override = []): array
{
    return [
        'csp-report' => array_replace([
            'document-uri' => 'https://pilot.example.test/agency/research?token=private#section',
            'blocked-uri' => 'https://cdn.example.test/assets/script.js?signature=secret',
            'effective-directive' => 'script-src-elem',
            'violated-directive' => "script-src 'self'",
            'source-file' => 'https://pilot.example.test/build/app.js?version=private',
            'line-number' => 42,
            'column-number' => 7,
            'status-code' => 200,
            'disposition' => 'report',
            'original-policy' => "default-src 'self'; report-uri /api/security/csp-reports",
            'script-sample' => 'private inline content must not be stored',
        ], $override),
    ];
}

function cspCollectorPost(TestCase $test, array $payload, string $contentType = 'application/csp-report')
{
    return $test->call(
        'POST',
        '/api/security/csp-reports',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => $contentType,
            'HTTP_USER_AGENT' => 'Mozilla/5.0 Chrome/140.0 Safari/537.36',
        ],
        json_encode($payload, JSON_THROW_ON_ERROR),
    );
}

function cspCollectorSuperAdmin(): User
{
    test()->seed([RoleSeeder::class, PermissionSeeder::class]);
    $role = Role::query()->where('slug', 'super_admin')->firstOrFail();
    $user = User::factory()->create([
        'role' => 'super_admin',
        'status' => 'active',
        'email_verified_at' => now(),
        'two_factor_secret' => encrypt('csp-test-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['csp-recovery-code'])),
        'two_factor_confirmed_at' => now(),
    ]);
    $user->roles()->syncWithoutDetaching([$role->id => ['assigned_at' => now()]]);

    return $user;
}

test('legacy CSP reports are normalized without sensitive raw fields', function () {
    $response = cspCollectorPost($this, cspCollectorLegacyPayload());

    $response->assertNoContent()
        ->assertHeader('Cache-Control', 'no-store, private');

    $report = CspViolationReport::query()->sole();

    expect($report->document_uri)->toBe('https://pilot.example.test/agency/research')
        ->and($report->blocked_uri)->toBe('https://cdn.example.test')
        ->and($report->source_file)->toBe('https://pilot.example.test/build/app.js')
        ->and($report->effective_directive)->toBe('script-src-elem')
        ->and($report->browser)->toBe('Chrome')
        ->and($report->policy_hash)->toHaveLength(64)
        ->and($report->occurrence_count)->toBe(1)
        ->and(json_encode($report->getAttributes()))
        ->not->toContain('token=private')
        ->not->toContain('signature=secret')
        ->not->toContain('private inline content');
});

test('duplicate CSP violations are aggregated by fingerprint', function () {
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNoContent();
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNoContent();

    expect(CspViolationReport::query()->count())->toBe(1)
        ->and(CspViolationReport::query()->sole()->occurrence_count)->toBe(2);
});

test('modern reporting API batches are accepted', function () {
    $payload = [[
        'type' => 'csp-violation',
        'age' => 10,
        'url' => 'https://pilot.example.test/agency',
        'body' => [
            'documentURL' => 'https://pilot.example.test/agency/dashboard?session=private',
            'blockedURL' => 'https://unexpected.example.net/library.js/path',
            'effectiveDirective' => 'connect-src',
            'sourceFile' => 'https://pilot.example.test/build/app.js?v=1',
            'statusCode' => 200,
            'disposition' => 'report',
        ],
    ]];

    cspCollectorPost($this, $payload, 'application/reports+json')->assertNoContent();

    $report = CspViolationReport::query()->sole();
    expect($report->document_uri)->toBe('https://pilot.example.test/agency/dashboard')
        ->and($report->blocked_uri)->toBe('https://unexpected.example.net')
        ->and($report->effective_directive)->toBe('connect-src');
});

test('collector rejects malformed oversized and unsupported payloads', function () {
    config()->set('security_headers.csp.collector.max_payload_bytes', 1024);

    $this->call('POST', '/api/security/csp-reports', [], [], [], [
        'CONTENT_TYPE' => 'application/csp-report',
    ], '{invalid')->assertBadRequest();

    $this->call('POST', '/api/security/csp-reports', [], [], [], [
        'CONTENT_TYPE' => 'text/plain',
    ], '{}')->assertStatus(415);

    cspCollectorPost($this, cspCollectorLegacyPayload([
        'document-uri' => 'https://pilot.example.test/'.str_repeat('a', 2000),
    ]))->assertStatus(413);

    expect(CspViolationReport::query()->count())->toBe(0);
});

test('collector can be disabled and limits report batch counts', function () {
    config()->set('security_headers.csp.collector.enabled', false);
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNotFound();

    config()->set('security_headers.csp.collector.enabled', true);
    config()->set('security_headers.csp.collector.max_reports_per_request', 1);
    $report = [
        'type' => 'csp-violation',
        'body' => cspCollectorLegacyPayload()['csp-report'],
    ];

    cspCollectorPost($this, [$report, $report], 'application/reports+json')->assertBadRequest();
    expect(CspViolationReport::query()->count())->toBe(0);
});

test('collector is independently rate limited', function () {
    config()->set('security_headers.csp.collector.rate_limit_per_minute', 1);
    RateLimiter::clear('csp-report:'.hash('sha256', '127.0.0.1'));

    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNoContent();
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertTooManyRequests();
});

test('only authorized administrators can review sanitized CSP reports', function () {
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNoContent();
    $admin = cspCollectorSuperAdmin();

    $this->getJson('/api/admin/security/csp-reports')->assertUnauthorized();

    $response = $this->actingAs($admin)
        ->getJson('/api/admin/security/csp-reports?directive=script-src-elem')
        ->assertOk()
        ->assertJsonPath('data.0.effective_directive', 'script-src-elem')
        ->assertJsonPath('data.0.occurrence_count', 1)
        ->assertJsonMissingPath('data.0.fingerprint')
        ->assertJsonMissingPath('data.0.policy_hash');

    expect($response->getContent())->not->toContain('private inline content');
});

test('expired CSP report aggregates are pruned by retention policy', function () {
    config()->set('security_headers.csp.collector.retention_days', 30);
    cspCollectorPost($this, cspCollectorLegacyPayload())->assertNoContent();
    CspViolationReport::query()->update(['last_seen_at' => now()->subDays(31)]);

    expect(Artisan::call('csp:prune-reports'))->toBe(0)
        ->and(CspViolationReport::query()->count())->toBe(0)
        ->and(Artisan::output())->toContain('Pruned 1 expired CSP report aggregate(s).');
});
