<?php

use Illuminate\Support\Facades\URL;

test('TEST 01-03 P0: route generation preserves the configured transport scheme', function () {
    $scheme = parse_url((string) config('app.url'), PHP_URL_SCHEME);
    $generated = URL::to('/agency/login');

    expect($scheme)->toBeIn(['http', 'https'])
        ->and(parse_url($generated, PHP_URL_SCHEME))->toBe($scheme)
        ->and(parse_url($generated, PHP_URL_HOST))->toBe(parse_url((string) config('app.url'), PHP_URL_HOST));
})->group('module01', 'module01-app');
