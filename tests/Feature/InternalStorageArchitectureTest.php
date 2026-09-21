<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Agency;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\User;
use App\Services\PlatformSettingsService;
use App\Services\UploadQuotaService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

function internalStorageContext(): array
{
    $agency = Agency::create([
        'slug' => 'internal-storage-'.str()->random(8),
        'name' => 'Internal Storage Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $research = Research::create([
        'slug' => 'internal-storage-research-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Internal Storage Research',
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);

    return [$agency, $user, $research];
}

test('agency quota counts each physical object once', function () {
    [$agency, $user, $research] = internalStorageContext();
    config()->set('rikms.uploads.agency_quota_mb', 1);

    foreach ([1, 2] as $index) {
        ResearchFile::create([
            'research_id' => $research->id,
            'agency_id' => $agency->id,
            'uploaded_by' => $user->id,
            'original_name' => "shared-{$index}.pdf",
            'stored_name' => 'shared.pdf',
            'disk' => 'local',
            'path' => 'research/shared.pdf',
            'size_bytes' => 700 * 1024,
            'status' => 'active',
        ]);
    }

    $quota = app(UploadQuotaService::class);

    expect($quota->usedBytes($agency->id))->toBe(700 * 1024)
        ->and($quota->canStore($agency->id, 400 * 1024))->toBeFalse();
});

test('storage reconciliation detects and repairs missing orphaned and stale objects', function () {
    Storage::fake('local');
    config()->set([
        'rikms.uploads.storage_disk' => 'local',
        'rikms.uploads.quarantine_disk' => 'local',
        'rikms.uploads.reconciliation_repair_enabled' => true,
    ]);
    [$agency, $user, $research] = internalStorageContext();
    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'original_name' => 'missing.pdf',
        'stored_name' => 'missing.pdf',
        'disk' => 'local',
        'path' => "research/{$research->id}/missing.pdf",
        'size_bytes' => 100,
        'status' => 'active',
    ]);
    Storage::disk('local')->put('research/orphan.pdf', 'orphan');
    Storage::disk('local')->put('research/quarantine/stale.pdf', 'stale');
    $this->travel(2)->hours();

    $this->artisan('rikms:storage-reconcile --repair --quarantine-hours=1')
        ->assertSuccessful();

    expect($file->refresh()->status)->toBe('missing');
    Storage::disk('local')->assertMissing('research/orphan.pdf');
    Storage::disk('local')->assertMissing('research/quarantine/stale.pdf');
});

test('a stored active file can safely requeue its AI pipeline', function () {
    Storage::fake('local');
    Bus::fake();
    config()->set('rikms.uploads.storage_disk', 'local');

    $settings = app(PlatformSettingsService::class);
    $definition = $settings->definition(PlatformSettingsService::AI_PROCESSING_ENABLED);
    PlatformSetting::updateOrCreate(
        ['key' => PlatformSettingsService::AI_PROCESSING_ENABLED],
        [
            'value' => 'true',
            'type' => 'boolean',
            'group' => $definition['group'] ?? 'ai',
            'label' => $definition['label'] ?? 'AI Processing Enabled',
            'is_public' => false,
            'is_encrypted' => false,
        ],
    );
    $settings->forgetCache();

    [$agency, $user, $research] = internalStorageContext();
    $path = "research/{$research->id}/requeue.pdf";
    Storage::disk('local')->put($path, '%PDF-1.4');
    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'original_name' => 'requeue.pdf',
        'stored_name' => 'requeue.pdf',
        'disk' => 'local',
        'path' => $path,
        'size_bytes' => 8,
        'status' => 'active',
    ]);

    $this->artisan("rikms:ai-requeue {$file->id}")
        ->expectsOutput("AI processing requeued for research file {$file->id}.")
        ->assertSuccessful();

    Bus::assertChained([
        new ParsePdfDocumentJob($research->id, $file->id, $agency->id, $user->id),
        new ExtractResearchMetadataJob($research->id, $file->id, $agency->id, $user->id),
        new ClassifyResearchSdgJob($research->id, $file->id, $agency->id, $user->id),
    ]);

    expect(data_get($file->refresh()->metadata, 'ai_processing.pdf_parsing.status'))->toBe('queued')
        ->and(data_get($file->metadata, 'ai_processing.ai_metadata.status'))->toBe('queued')
        ->and(data_get($file->metadata, 'ai_processing.sdg_classification.status'))->toBe('queued');
});
