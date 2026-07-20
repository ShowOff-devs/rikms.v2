<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Agency;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\PlatformSettingsService;
use App\Services\UploadLimitService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function pilotUploadSet(string $key, mixed $value, string $type = 'boolean'): void
{
    $service = app(PlatformSettingsService::class);
    $definition = $service->definition($key);

    PlatformSetting::updateOrCreate(
        ['key' => $key],
        [
            'value' => $service->serialize($key, $value),
            'type' => $definition['type'] ?? $type,
            'group' => $definition['group'] ?? 'tests',
            'label' => $definition['label'] ?? $key,
            'description' => $definition['description'] ?? null,
            'is_public' => (bool) ($definition['is_public'] ?? false),
            'is_encrypted' => false,
        ],
    );

    $service->forgetCache();
}

function pilotUploadAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function pilotUploadUser(Agency $agency): User
{
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);

    $role = Role::updateOrCreate(
        ['slug' => 'agency_admin'],
        [
            'name' => 'Agency Admin',
            'display_name' => 'Agency Admin',
            'is_system' => true,
            'is_active' => true,
        ],
    );

    $user->roles()->syncWithoutDetaching([
        $role->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function pilotUploadResearch(Agency $agency, User $uploader): Research
{
    return Research::create([
        'slug' => 'pilot-upload-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Pilot Upload Readiness Research',
        'abstract' => 'A pilot upload readiness fixture.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['pilot-upload'],
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);
}

function pilotUploadContext(string $slug = 'pilot-upload-readiness'): array
{
    $agency = pilotUploadAgency($slug);
    $user = pilotUploadUser($agency);

    return [$agency, $user, pilotUploadResearch($agency, $user)];
}

function pilotUploadAssertNoAiJobs(): void
{
    Bus::assertNotDispatched(ParsePdfDocumentJob::class);
    Bus::assertNotDispatched(ExtractResearchMetadataJob::class);
    Bus::assertNotDispatched(ClassifyResearchSdgJob::class);
}

function pilotUploadIniMb(string $value): int
{
    $value = trim($value);
    $unit = strtolower(substr($value, -1));
    $number = is_numeric($unit) ? (float) $value : (float) substr($value, 0, -1);
    $bytes = match ($unit) {
        'g' => $number * 1024 * 1024 * 1024,
        'm' => $number * 1024 * 1024,
        'k' => $number * 1024,
        default => $number,
    };

    return (int) max(1, floor($bytes / 1024 / 1024));
}

test('effective upload limit uses the lowest configured and PHP limits', function () {
    $limits = app(UploadLimitService::class)->limits();
    $phpUploadMb = pilotUploadIniMb((string) ini_get('upload_max_filesize'));
    $phpPostMb = pilotUploadIniMb((string) ini_get('post_max_size'));
    $expected = min($limits['configured_mb'], $phpUploadMb, $phpPostMb);

    expect($limits['configured_mb'])->toBeGreaterThanOrEqual(1)
        ->and($limits['php_upload_max_filesize_mb'])->toBe($phpUploadMb)
        ->and($limits['php_post_max_size_mb'])->toBe($phpPostMb)
        ->and($limits['effective_mb'])->toBe($expected);
});

test('valid PDFs below and near the configured limit are accepted without AI jobs when AI is disabled', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB, 2, 'integer');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, false);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-valid');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('below-limit.pdf', 128),
        ])
        ->assertCreated();

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('near-limit.pdf', 2047),
        ])
        ->assertCreated();

    expect(ResearchFile::query()->where('agency_id', $agency->id)->count())->toBe(2);
    pilotUploadAssertNoAiJobs();
});

test('agency upload page receives the effective upload limit for display', function () {
    pilotUploadSet(PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB, 2, 'integer');
    [, $user] = pilotUploadContext('pilot-upload-ui-limit');

    $this->actingAs($user)
        ->get('/agency/upload/research')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/upload/research')
            ->where('uploadLimits.configuredMb', 2)
            ->where('uploadLimits.effectiveMb', 2));
});

test('PDF above the effective limit is rejected without records or AI jobs', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB, 2, 'integer');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, true);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-above-limit');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('above-limit.pdf', 2049),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['file'])
        ->assertJsonPath('errors.file.0', 'The PDF must not be larger than 2 MB.');

    expect(ResearchFile::query()->where('agency_id', $agency->id)->count())->toBe(0);
    pilotUploadAssertNoAiJobs();
});

test('invalid PDFs are rejected without records or AI jobs', function (UploadedFile $file) {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, true);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-invalid-'.str()->random(6));

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => $file,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);

    expect(ResearchFile::query()->where('agency_id', $agency->id)->count())->toBe(0);
    pilotUploadAssertNoAiJobs();
})->with([
    'renamed non-PDF file' => fn () => UploadedFile::fake()->createWithContent('renamed.pdf', 'not a pdf'),
    'unsupported MIME type' => fn () => UploadedFile::fake()->createWithContent('unsupported.txt', testPdfContent(12 * 1024)),
    'empty file' => fn () => UploadedFile::fake()->createWithContent('empty.pdf', ''),
    'corrupt PDF' => fn () => UploadedFile::fake()->createWithContent('corrupt.pdf', "%PDF-1.4\nnot a complete pdf"),
]);

test('PDF with a known malware test signature is rejected and quarantine is cleared', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, true);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-malware');
    $content = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
        .'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
        .str_repeat("\n", 2048)
        ."\ntrailer\n<<>>\n%%EOF\n";

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => UploadedFile::fake()->createWithContent('infected.pdf', $content),
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'The uploaded PDF did not pass security screening.')
        ->assertJsonValidationErrors(['file']);

    expect(ResearchFile::query()->where('agency_id', $agency->id)->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles('research/quarantine'))->toBe([]);
    pilotUploadAssertNoAiJobs();
});

test('filename with spaces and unicode is stored exactly', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, false);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-unicode');
    $fileName = 'Davao Research File ñ 2026.pdf';

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload($fileName, 64),
        ])
        ->assertCreated()
        ->assertJsonPath('data.original_name', $fileName);

    expect(ResearchFile::query()->where('agency_id', $agency->id)->firstOrFail()->original_name)->toBe($fileName);
    pilotUploadAssertNoAiJobs();
});

test('duplicate file upload is rejected without creating a second record', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, false);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-duplicate');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('first.pdf', 64),
        ])
        ->assertCreated();

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('same-content.pdf', 64),
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'This PDF has already been uploaded for this research record.')
        ->assertJsonValidationErrors(['file']);

    expect(ResearchFile::query()->where('agency_id', $agency->id)->count())->toBe(1);
    pilotUploadAssertNoAiJobs();
});

test('upload during disabled AI processing stores skipped AI status and dispatches no AI jobs', function () {
    Bus::fake();
    Storage::fake('local');
    pilotUploadSet(PlatformSettingsService::AI_PROCESSING_ENABLED, false);
    [$agency, $user, $research] = pilotUploadContext('pilot-upload-ai-disabled');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('ai-disabled.pdf', 64),
        ])
        ->assertCreated()
        ->assertJsonPath('message', 'Research file uploaded. AI-assisted processing is currently disabled.');

    $file = ResearchFile::query()->where('agency_id', $agency->id)->firstOrFail();

    expect($file->metadata['ai_processing']['pdf_parsing']['status'])->toBe('skipped')
        ->and($file->metadata['ai_processing']['ai_metadata']['status'])->toBe('skipped')
        ->and($file->metadata['ai_processing']['sdg_classification']['status'])->toBe('skipped');

    pilotUploadAssertNoAiJobs();
});
