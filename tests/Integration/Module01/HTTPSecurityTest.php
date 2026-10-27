<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-02 P0: trusted HTTPS is valid for the assigned server IP', function () {
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
        $this->markTestSkipped("N/A: HTTPS is replaced by documented network restriction evidence [{$reference}].");
    }

    $response = $target->get('/');
    $certificate = $response['certificate'] ?? null;

    expect($response['error'] ?? null)->toBeNull('A verified TLS handshake must succeed.')
        ->and($response['status'])->toBeGreaterThanOrEqual(200)
        ->and($response['status'])->toBeLessThan(400)
        ->and($certificate)->toBeArray();

    $validFrom = (int) ($certificate['validFrom_time_t'] ?? 0);
    $validTo = (int) ($certificate['validTo_time_t'] ?? 0);
    $subjectAltName = (string) ($certificate['extensions']['subjectAltName'] ?? '');
    preg_match_all('/IP Address:([0-9a-fA-F:.]+)/', $subjectAltName, $matches);
    $ipSans = $matches[1] ?? [];
    $matchedIp = collect($ipSans)->contains(fn (string $candidate): bool => inet_pton($candidate) === inet_pton($target->ip()));

    expect($validFrom)->toBeLessThanOrEqual(time())
        ->and($validTo)->toBeGreaterThan(time())
        ->and($matchedIp)->toBeTrue('The trusted certificate must contain the assigned IP in its IP subject alternative names.');
})->group('module01', 'module01-live');
