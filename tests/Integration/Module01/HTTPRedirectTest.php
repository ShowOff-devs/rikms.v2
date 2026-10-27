<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-03 P0: insecure HTTP redirects to HTTPS or has verified network restriction', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $target = DeploymentTarget::fromEnvironment();

    if ($target->mode === 'restricted_http') {
        $confirmed = filter_var(getenv('RIKMS_QA_RESTRICTED_NETWORK_CONFIRMED') ?: false, FILTER_VALIDATE_BOOL);
        $evidence = trim((string) getenv('RIKMS_QA_RESTRICTION_EVIDENCE'));

        if (! $confirmed || $evidence === '') {
            $this->markTestIncomplete('Blocked: restricted HTTP needs external restriction evidence and an evidence reference.');
        }

        $reference = preg_replace('/[^A-Za-z0-9_.:#-]/', '', substr($evidence, 0, 120));
        $this->markTestSkipped("N/A: HTTP access is governed by verified network restrictions [{$reference}].");
    }

    if (strtolower(trim((string) getenv('RIKMS_QA_HTTP_POLICY'))) === 'blocked') {
        $response = $target->request($target->httpUrl());
        $evidence = trim((string) getenv('RIKMS_QA_RESTRICTION_EVIDENCE'));

        if (in_array($response['status'], [403, 421, 444, 451], true)) {
            expect($response['status'])->toBeIn([403, 421, 444, 451]);

            return;
        }

        if (($response['status'] ?? 0) === 0
            && filter_var(getenv('RIKMS_QA_RESTRICTED_NETWORK_CONFIRMED') ?: false, FILTER_VALIDATE_BOOL)
            && $evidence !== '') {
            $reference = preg_replace('/[^A-Za-z0-9_.:#-]/', '', substr($evidence, 0, 120));
            $this->markTestSkipped("N/A: external HTTP restriction evidence is recorded as [{$reference}].");
        }

        $this->fail('The configured blocked HTTP policy did not produce a verifiable denial or documented external restriction.');
    }

    $result = $target->getFollowingRedirects($target->httpUrl());
    $response = $result['response'];

    expect($result['error'])->toBeNull()
        ->and($result['history'])->not->toBeEmpty()
        ->and($response['status'])->toBeGreaterThanOrEqual(200)
        ->and($response['status'])->toBeLessThan(300)
        ->and(strtolower((string) parse_url($result['final_url'], PHP_URL_SCHEME)))->toBe('https')
        ->and(str_starts_with((string) ($response['headers']['content-type'][0] ?? ''), 'text/html'))->toBeTrue();
})->group('module01', 'module01-live');
