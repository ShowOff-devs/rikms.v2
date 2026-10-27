<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-04 P0: deployed public routes and Vite assets are available without exposing internals', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $target = DeploymentTarget::fromEnvironment();
    $browse = $target->getFollowingRedirects($target->urlFor('/browse-research'));
    $rendersApplication = str_contains((string) ($browse['response']['body'] ?? ''), 'id="app"');

    expect($browse['error'])->toBeNull()
        ->and($browse['response']['status'])->toBe(200)
        ->and($rendersApplication)->toBeTrue('The public route response did not contain the application root.');

    preg_match_all('/(?:src|href)=["\']([^"\']+)["\']/i', $browse['response']['body'], $matches);
    $assetUrls = array_values(array_unique(array_filter($matches[1] ?? [], function (string $url): bool {
        return preg_match('/\.(?:m?js|css)(?:\?|$)/i', $url) === 1 || str_contains($url, '/build/');
    })));

    expect($assetUrls)->not->toBeEmpty('The deployed page must reference built application assets.');

    foreach ($assetUrls as $assetUrl) {
        if (str_contains($assetUrl, 'fonts.bunny.net')) {
            continue;
        }

        $url = preg_match('/^https?:\/\//i', $assetUrl) === 1
            ? $assetUrl
            : $target->urlFor($assetUrl);
        expect($target->isSameIpUrl($url))->toBeTrue("Application asset points outside the assigned IP: {$assetUrl}");

        $asset = $target->getFollowingRedirects($url);
        expect($asset['error'])->toBeNull()
            ->and($asset['response']['status'])->toBeGreaterThanOrEqual(200)
            ->and($asset['response']['status'])->toBeLessThan(300);
    }

    foreach (['/vendor/', '/bootstrap/', '/storage/', '/storage/logs/laravel.log'] as $path) {
        $response = $target->get($path);
        expect($response['status'])->toBeIn([403, 404, 410], "Internal path {$path} is publicly reachable.");
    }
})->group('module01', 'module01-live');
