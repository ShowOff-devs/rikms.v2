<?php

use App\Services\InfrastructureReadinessService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;

test('external infrastructure readiness performs safe local round trips', function () {
    Storage::fake('upload_quarantine');
    Storage::fake('private_uploads');
    config()->set([
        'database.connections.mongodb.dsn' => null,
        'infrastructure.require_mongodb' => false,
        'infrastructure.require_remote_storage' => false,
        'infrastructure.require_backup_ready' => false,
        'rikms.uploads.quarantine_disk' => 'upload_quarantine',
        'rikms.uploads.storage_disk' => 'private_uploads',
        'cache.default' => 'array',
        'queue.default' => 'database',
    ]);

    expect(Artisan::call('rikms:infrastructure-check', ['--write' => true, '--json' => true]))->toBe(0);

    $report = json_decode(Artisan::output(), true);

    expect($report['status'])->toBe('ready')
        ->and(collect($report['checks'])->firstWhere('id', 'database')['status'])->toBe('ready')
        ->and(collect($report['checks'])->firstWhere('id', 'migrations')['status'])->toBe('ready')
        ->and(collect($report['checks'])->firstWhere('id', 'mongodb')['status'])->toBe('skipped')
        ->and(collect($report['checks'])->firstWhere('id', 'backup')['status'])->toBe('skipped')
        ->and(collect($report['checks'])->firstWhere('id', 'storage_upload_quarantine')['status'])->toBe('ready')
        ->and(collect($report['checks'])->firstWhere('id', 'storage_private_uploads')['status'])->toBe('ready')
        ->and(Storage::disk('upload_quarantine')->allFiles())->toBe([])
        ->and(Storage::disk('private_uploads')->allFiles())->toBe([]);
});

test('readiness fails closed when required external dependencies are absent', function () {
    config()->set([
        'database.connections.mongodb.dsn' => null,
        'infrastructure.require_mongodb' => true,
        'infrastructure.require_remote_storage' => true,
        'infrastructure.require_backup_ready' => true,
        'backup.destination_path' => null,
        'backup.encryption_key' => null,
        'rikms.uploads.quarantine_disk' => 'upload_quarantine',
        'rikms.uploads.storage_disk' => 'private_uploads',
    ]);

    expect(Artisan::call('rikms:infrastructure-check', ['--json' => true]))->toBe(1);

    $report = json_decode(Artisan::output(), true);

    expect($report['status'])->toBe('failed')
        ->and(collect($report['checks'])->firstWhere('id', 'mongodb')['status'])->toBe('failed')
        ->and(collect($report['checks'])->firstWhere('id', 'backup')['status'])->toBe('failed')
        ->and(collect($report['checks'])->firstWhere('id', 'storage_upload_quarantine')['status'])->toBe('failed')
        ->and(collect($report['checks'])->firstWhere('id', 'storage_private_uploads')['status'])->toBe('failed');
});

test('readiness command returns sanitized machine-readable failure when inspection crashes', function () {
    $readiness = Mockery::mock(InfrastructureReadinessService::class);
    $readiness->shouldReceive('report')
        ->once()
        ->with(false)
        ->andThrow(new RuntimeException('provider credentials must not be displayed'));
    app()->instance(InfrastructureReadinessService::class, $readiness);

    expect(Artisan::call('rikms:infrastructure-check', ['--json' => true]))->toBe(1);

    $output = Artisan::output();
    $report = json_decode($output, true, flags: JSON_THROW_ON_ERROR);

    expect($report['status'])->toBe('failed')
        ->and($report['checks'][0]['id'])->toBe('readiness')
        ->and($output)->not->toContain('provider credentials must not be displayed');
});

test('repository installs the S3 adapter used by external storage disks', function () {
    expect(class_exists(AwsS3V3Adapter::class))->toBeTrue()
        ->and(config('filesystems.disks.private_uploads_s3.driver'))->toBe('s3')
        ->and(config('filesystems.disks.upload_quarantine_s3.driver'))->toBe('s3');
});
