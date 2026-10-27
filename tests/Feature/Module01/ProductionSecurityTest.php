<?php

use Illuminate\Support\Facades\Route;

test('TEST 01-06 P0: debug is disabled and handled errors hide exception details', function () {
    config()->set('app.debug', false);

    Route::get('/__module01_synthetic_error', function () {
        throw new RuntimeException('Module 01 synthetic private exception detail');
    });

    $response = $this->get('/__module01_synthetic_error')->assertServerError();
    $body = $response->getContent();
    $landing = $this->get('/')->assertOk();

    expect(config('app.debug'))->toBeFalse()
        ->and($body)->not->toContain('Module 01 synthetic private exception detail')
        ->and($body)->not->toContain(base_path())
        ->and($body)->not->toContain('.env');

    $landing
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
})->group('module01', 'module01-app');
