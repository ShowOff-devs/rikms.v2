<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-06 P0: deployed errors and sensitive configuration files are not exposed', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $target = DeploymentTarget::fromEnvironment();
    $missing = $target->get('/__rikms_module01_missing_route_'.bin2hex(random_bytes(4)));
    $body = strtolower($missing['body']);
    $leaksSensitiveDetails = str_contains($body, 'stack trace')
        || str_contains($body, 'sqlstate')
        || str_contains($body, 'db_password')
        || str_contains($body, 'app_key')
        || str_contains($body, '/var/www/');

    expect($missing['status'])->toBe(404)
        ->and($leaksSensitiveDetails)->toBeFalse('The generic public error response contains stack or configuration details.');

    foreach ([
        '/.env',
        '/.env.example',
        '/.env.backup',
        '/.env.production',
        '/.git/config',
        '/.git/HEAD',
        '/composer.json',
        '/composer.lock',
        '/artisan',
        '/bootstrap/app.php',
        '/bootstrap/cache/config.php',
        '/config/app.php',
        '/database/database.sqlite',
        '/database.sql',
        '/storage/logs/laravel.log',
        '/storage/app/private/',
        '/backup.zip',
    ] as $path) {
        $response = $target->get($path);
        expect($response['status'])->toBeIn([403, 404, 410], "Sensitive path {$path} is publicly reachable.");
    }
})->group('module01', 'module01-live');
