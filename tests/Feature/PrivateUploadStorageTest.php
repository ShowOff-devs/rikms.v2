<?php

use App\Services\QuarantinedUploadStorage;
use Illuminate\Support\Facades\Storage;

test('private upload disks are local private and outside the public web root', function () {
    $publicRoot = str_replace('\\', '/', rtrim(public_path(), '\\/'));

    foreach (['upload_quarantine', 'private_uploads'] as $disk) {
        $configuration = config("filesystems.disks.{$disk}");
        $root = str_replace('\\', '/', rtrim((string) $configuration['root'], '\\/'));

        expect($configuration)
            ->toBeArray()
            ->and($configuration['driver'])->toBe('local')
            ->and($configuration['visibility'])->toBe('private')
            ->and($configuration['serve'])->toBeFalse()
            ->and($root)->not->toBe($publicRoot)
            ->and(str_starts_with($root, $publicRoot.'/'))->toBeFalse()
            ->and(config('filesystems.links'))->not->toContain($configuration['root']);
    }

    expect(config('filesystems.disks.upload_quarantine.root'))
        ->not->toBe(config('filesystems.disks.private_uploads.root'));
});

test('a clean upload is promoted across isolated disks and removed from quarantine', function () {
    Storage::fake('upload_quarantine');
    Storage::fake('private_uploads');
    Storage::disk('upload_quarantine')->put('research/quarantine/pending.pdf', '%PDF-1.4 safe');

    $promoted = app(QuarantinedUploadStorage::class)->promote(
        'upload_quarantine',
        'research/quarantine/pending.pdf',
        'private_uploads',
        'research/42/accepted.pdf',
    );

    expect($promoted)->toBeTrue();
    Storage::disk('upload_quarantine')->assertMissing('research/quarantine/pending.pdf');
    Storage::disk('private_uploads')->assertExists('research/42/accepted.pdf');
});
