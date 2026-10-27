<?php

test('TEST 01-07 P0: application tests use isolated database and optional service settings', function () {
    expect(app()->environment())->toBe('testing')
        ->and(config('database.default'))->toBe('sqlite')
        ->and(config('database.connections.sqlite.database'))->toBe(':memory:')
        ->and(config('session.driver'))->toBe('array');

    $usesRedis = config('queue.connections.'.config('queue.default').'.driver') === 'redis'
        || config('cache.stores.'.config('cache.default').'.driver') === 'redis'
        || config('session.driver') === 'redis';

    expect($usesRedis)->toBeFalse();
})->group('module01', 'module01-app');
