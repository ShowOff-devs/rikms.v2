<?php

use Illuminate\Support\Facades\URL;

test('TEST 01-01 P0: application URLs are valid and the landing route responds', function () {
    $configuredUrl = (string) config('app.url');
    $parts = parse_url($configuredUrl);

    expect($parts)->toBeArray()
        ->and($parts['scheme'] ?? null)->toBeIn(['http', 'https'])
        ->and($parts['host'] ?? '')->not->toBe('')
        ->and($parts['user'] ?? null)->toBeNull()
        ->and($parts['pass'] ?? null)->toBeNull()
        ->and(URL::to('/'))->toStartWith(rtrim($configuredUrl, '/'));

    $this->get(route('home'))->assertOk();
})->group('module01', 'module01-app');
