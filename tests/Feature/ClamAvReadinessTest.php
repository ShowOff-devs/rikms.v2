<?php

use App\Exceptions\MalwareScanException;
use App\Services\MalwareScanner\ClamAvClient;
use App\Services\MalwareScanner\ClamAvMalwareScanner;
use App\Services\MalwareScanner\ClamAvReadinessService;
use App\Services\UploadLimitService;

test('clamav readiness reports a responding compatible daemon', function () {
    config()->set([
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.clamav_stream_max_length_mb' => 100,
    ]);

    $client = Mockery::mock(ClamAvClient::class);
    $client->shouldReceive('maxStreamMb')->andReturn(100);
    $client->shouldReceive('endpointLabel')->andReturn('clamav.internal:3310');
    $client->shouldReceive('command')->with('PING')->once()->andReturn('PONG');
    $client->shouldReceive('command')->with('VERSION')->once()->andReturn('ClamAV test/version');

    $status = (new ClamAvReadinessService($client, app(UploadLimitService::class)))->status();

    expect($status['healthy'])->toBeTrue()
        ->and($status['responding'])->toBeTrue()
        ->and($status['version'])->toBe('ClamAV test/version')
        ->and($status['stream_limit_compatible'])->toBeTrue();
});

test('clamav readiness fails before connecting when stream capacity is too small', function () {
    config()->set([
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.clamav_stream_max_length_mb' => 1,
    ]);

    $client = Mockery::mock(ClamAvClient::class);
    $client->shouldReceive('maxStreamMb')->andReturn(1);
    $client->shouldReceive('endpointLabel')->andReturn('clamav.internal:3310');
    $client->shouldNotReceive('command');

    $status = (new ClamAvReadinessService($client, app(UploadLimitService::class)))->status();

    expect($status['healthy'])->toBeFalse()
        ->and($status['reason'])->toBe('stream_limit_too_small')
        ->and($status['stream_limit_compatible'])->toBeFalse();
});

test('clamav readiness sanitizes daemon connection failures', function () {
    config()->set([
        'rikms.uploads.malware_scanner' => 'clamav',
        'rikms.uploads.clamav_host' => 'clamav.internal',
        'rikms.uploads.clamav_port' => 3310,
        'rikms.uploads.clamav_timeout_seconds' => 10,
        'rikms.uploads.clamav_stream_max_length_mb' => 100,
    ]);

    $client = Mockery::mock(ClamAvClient::class);
    $client->shouldReceive('maxStreamMb')->andReturn(100);
    $client->shouldReceive('endpointLabel')->andReturn('clamav.internal:3310');
    $client->shouldReceive('command')->with('PING')->once()->andThrow(new MalwareScanException('unavailable'));

    $status = (new ClamAvReadinessService($client, app(UploadLimitService::class)))->status();

    expect($status['healthy'])->toBeFalse()
        ->and($status['reason'])->toBe('unavailable')
        ->and($status['version'])->toBeNull();
});

test('clamav scanner rejects files above the configured stream capacity before connecting', function () {
    config()->set('rikms.uploads.clamav_stream_max_length_mb', 1);
    $path = tempnam(sys_get_temp_dir(), 'clamav-limit-');
    file_put_contents($path, str_repeat('x', (1024 * 1024) + 1));

    try {
        (new ClamAvMalwareScanner)->scan($path);
    } catch (MalwareScanException $exception) {
        expect($exception->reason)->toBe('stream_limit_exceeded');

        return;
    } finally {
        @unlink($path);
    }

    $this->fail('Expected the stream-size guard to reject the file.');
});

test('clamav readiness command returns failure while the scanner is disabled', function () {
    config()->set('rikms.uploads.malware_scanner', 'none');

    $this->artisan('rikms:clamav-check')
        ->expectsOutputToContain('ClamAV readiness check failed: scanner_disabled.')
        ->assertFailed();
});
