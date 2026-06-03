<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\AiPipelineResultWriter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Features;

function createPhase85Role(string $slug): Role
{
    return Role::updateOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function createPhase85Agency(string $slug = 'phase-85-agency'): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase85User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase85Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase85Research(Agency $agency, User $uploader): Research
{
    return Research::create([
        'slug' => 'phase-85-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 8.5 Security Research',
        'abstract' => 'A security remediation test record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Security',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 8.5'],
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);
}

test('mongodb uri has no committed credential fallback', function () {
    $databaseConfig = file_get_contents(config_path('database.php'));

    expect($databaseConfig)
        ->toContain("'dsn' => env('MONGODB_URI')")
        ->not->toContain("env('MONGODB_URI',")
        ->not->toContain('mongodb+srv://');
});

test('public registration is disabled', function () {
    expect(Features::enabled(Features::registration()))->toBeFalse();

    $this->get('/register')->assertNotFound();
    $this->post('/register', [
        'name' => 'Public User',
        'email' => 'public-user@example.test',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'public-user@example.test']);
});

test('public access request submission remains available without registration', function () {
    $agency = createPhase85Agency('phase-85-public-access');
    $agencyAdmin = createPhase85User('agency_admin', $agency);
    $research = createPhase85Research($agency, $agencyAdmin);
    $research->forceFill([
        'status' => 'published',
        'published_at' => now(),
    ])->save();

    $this->postJson("/api/public/research/{$research->slug}/access-requests", [
        'requester_name' => 'Public Requester',
        'requester_email' => 'phase85-public@example.test',
        'requester_affiliation' => 'Regional University',
        'requester_purpose' => 'Policy research review.',
        'intended_use' => 'Regional knowledge synthesis.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending');

    expect(AccessRequest::where('requester_email', 'phase85-public@example.test')->exists())->toBeTrue();
});

test('ai pdf and sdg jobs skip safely when mongodb is not configured', function () {
    config(['database.connections.mongodb.dsn' => null]);

    $agency = createPhase85Agency('phase-85-jobs');
    $agencyAdmin = createPhase85User('agency_admin', $agency);
    $research = createPhase85Research($agency, $agencyAdmin);
    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $agencyAdmin->id,
        'original_name' => 'phase85.pdf',
        'stored_name' => 'phase85.pdf',
        'disk' => 'local',
        'path' => 'research/'.$research->id.'/phase85.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', 'phase85'),
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'metadata' => ['ai_processing' => 'queued'],
        'uploaded_at' => now(),
    ]);

    $writer = app(AiPipelineResultWriter::class);

    (new ParsePdfDocumentJob($research->id, $file->id, $agency->id, $agencyAdmin->id))->handle($writer);
    (new ExtractResearchMetadataJob($research->id, $file->id, $agency->id, $agencyAdmin->id))->handle($writer);
    (new ClassifyResearchSdgJob($research->id, $file->id, $agency->id, $agencyAdmin->id))->handle($writer);

    $metadata = $file->refresh()->metadata['ai_processing'];

    expect($metadata['pdf_parsing']['status'])->toBe('skipped')
        ->and($metadata['ai_metadata']['status'])->toBe('skipped')
        ->and($metadata['sdg_classification']['status'])->toBe('skipped');
});

test('pdf upload stores relational metadata and dispatches ai pipeline jobs', function () {
    Bus::fake();
    Storage::fake('local');

    $agency = createPhase85Agency('phase-85-upload');
    $agencyAdmin = createPhase85User('agency_admin', $agency);
    $research = createPhase85Research($agency, $agencyAdmin);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => UploadedFile::fake()->create('phase85.pdf', 128, 'application/pdf'),
            'visibility' => 'private',
            'access_level' => 'restricted',
        ])
        ->assertCreated()
        ->assertJsonPath('data.research_id', $research->id);

    $file = ResearchFile::query()->where('research_id', $research->id)->firstOrFail();

    expect($file->checksum)->not->toBeEmpty()
        ->and($file->metadata['ai_processing'])->toBe('queued');

    Bus::assertChained([
        new ParsePdfDocumentJob($research->id, $file->id, $agency->id, $agencyAdmin->id),
        new ExtractResearchMetadataJob($research->id, $file->id, $agency->id, $agencyAdmin->id),
        new ClassifyResearchSdgJob($research->id, $file->id, $agency->id, $agencyAdmin->id),
    ]);
});

test('frontend services no longer contain targeted silent production fallbacks', function () {
    $accessRequestService = file_get_contents(resource_path('js/lib/access-requests/access-request-service.ts'));
    $archiveService = file_get_contents(resource_path('js/lib/archive/archive-service.ts'));
    $agencyAuthService = file_get_contents(resource_path('js/lib/auth/agency-auth.ts'));
    $platformSettingsService = file_get_contents(resource_path('js/lib/admin/platform-settings-service.ts'));

    expect($accessRequestService)->not->toContain('Replace this mock fallback')
        ->and($archiveService)->not->toContain('mockArchivedResearch')
        ->and($archiveService)->not->toContain('window.localStorage')
        ->and($agencyAuthService)->not->toContain('readStoredSession')
        ->and($agencyAuthService)->not->toContain('mockNetworkDelay')
        ->and($platformSettingsService)->not->toContain('URL.createObjectURL(file)')
        ->and($platformSettingsService)->toContain('not configured');
});
