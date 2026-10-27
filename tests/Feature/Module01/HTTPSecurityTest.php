<?php

test('TEST 01-02 P0: application session cookies use secure deployment settings', function () {
    expect(config('session.secure'))->toBeTrue()
        ->and(config('session.http_only'))->toBeTrue()
        ->and(config('session.encrypt'))->toBeTrue()
        ->and(config('session.same_site'))->toBeIn(['lax', 'strict'])
        ->and(config('session.domain'))->toBeNull();
})->group('module01', 'module01-app');
