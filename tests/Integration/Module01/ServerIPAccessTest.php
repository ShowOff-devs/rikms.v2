<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-01 P0: the assigned IP serves the landing page without invalid redirects', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $target = DeploymentTarget::fromEnvironment();
    $result = $target->getFollowingRedirects($target->baseUrl);
    $response = $result['response'];
    $rendersApplication = str_contains((string) ($response['body'] ?? ''), 'id="app"')
        && str_contains((string) ($response['body'] ?? ''), 'data-page=');

    expect($result['error'])->toBeNull()
        ->and($response['status'])->toBeGreaterThanOrEqual(200)
        ->and($response['status'])->toBeLessThan(300)
        ->and($rendersApplication)->toBeTrue('The final IP response did not contain the Laravel/Inertia application root.');
})->group('module01', 'module01-live');
