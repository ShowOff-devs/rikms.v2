<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function createPublicPortalResearch(?string $slug = 'climate-change-davao-gulf'): array
{
    $agency = Agency::create([
        'slug' => 'smaarrdec',
        'name' => 'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        'short_name' => 'SMAARRDEC',
        'full_name' => 'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        'type' => 'Research Consortium',
        'email' => 'secretariat@smaarrdec.example.gov.ph',
        'website' => 'https://smaarrdec.example.gov.ph',
        'address' => 'Southern Mindanao',
        'description' => 'Promotes agriculture, aquatic, and natural resources research.',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'agency_id' => $agency->id,
    ]);

    $research = Research::create([
        'slug' => $slug,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        'abstract' => 'This study examines the socioeconomic impact of climate change on coastal communities.',
        'authors' => ['Dr. Maria Santos', 'Dr. Juan Dela Cruz'],
        'publication_year' => 2025,
        'category' => 'Environmental Science',
        'sdgs' => ['SDG 13', 'SDG 14'],
        'keywords' => ['climate adaptation', 'coastal communities'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 12,
        'submitted_at' => now(),
        'approved_at' => now(),
        'approved_by' => $user->id,
    ]);

    return [$agency, $research];
}

test('public agencies are served from the database', function () {
    Storage::fake('public');

    [$agency] = createPublicPortalResearch();
    $agency->update(['logo_path' => "agency-logos/{$agency->id}/public-logo.png"]);

    $response = $this->getJson('/api/public/agencies');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'smaarrdec')
        ->assertJsonPath('data.0.logo_url', $agency->fresh()->logo_url);
});

test('public research search is served from the database', function () {
    [, $research] = createPublicPortalResearch();

    $response = $this->getJson('/api/public/research?search=climate');

    $response
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.id', $research->id)
        ->assertJsonPath('items.0.slug', 'climate-change-davao-gulf')
        ->assertJsonPath('items.0.public_identifier', 'climate-change-davao-gulf')
        ->assertJsonPath('items.0.agency', 'SMAARRDEC');
});

test('public summary exposes landing page metrics from current public data', function () {
    [$agency, $research] = createPublicPortalResearch();

    Agency::create([
        'slug' => 'dost-xi',
        'name' => 'Department of Science and Technology XI',
        'short_name' => 'DOST XI',
        'full_name' => 'Department of Science and Technology Regional Office XI',
        'type' => 'Government Agency',
        'email' => 'info@dostxi.example.gov.ph',
        'status' => 'active',
    ]);

    $inactiveAgency = Agency::create([
        'slug' => 'inactive-agency',
        'name' => 'Inactive Agency',
        'short_name' => 'IA',
        'full_name' => 'Inactive Agency',
        'type' => 'Government Agency',
        'email' => 'inactive@example.gov.ph',
        'status' => 'inactive',
    ]);

    $inactiveResearch = Research::create([
        'slug' => 'inactive-agency-study',
        'agency_id' => $inactiveAgency->id,
        'uploaded_by' => $research->uploaded_by,
        'title' => 'Study Owned by an Inactive Agency',
        'abstract' => 'This published record must not appear in the public portal.',
        'authors' => ['Dr. Hidden Record'],
        'publication_year' => 2027,
        'category' => 'Technology',
        'sdgs' => ['SDG 9'],
        'keywords' => ['inactive agency'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 0,
        'published_at' => now(),
    ]);

    Research::create([
        'slug' => 'newer-public-study',
        'agency_id' => $agency->id,
        'uploaded_by' => $research->uploaded_by,
        'title' => 'Newer Public Study',
        'abstract' => 'This study verifies summary metrics.',
        'authors' => ['Dr. Summary Metric'],
        'publication_year' => 2026,
        'category' => 'Technology',
        'sdgs' => ['SDG 9'],
        'keywords' => ['summary'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 0,
        'published_at' => now(),
    ]);

    $this->getJson('/api/public/summary')
        ->assertOk()
        ->assertJsonPath('researchCount', 2)
        ->assertJsonPath('agencyCount', 2)
        ->assertJsonPath('representedSdgCount', 3)
        ->assertJsonPath('latestPublicationYear', 2026)
        ->assertJsonPath('latestPublicationCount', 1)
        ->assertJsonPath('recentPublicationCount', 1)
        ->assertJsonPath('sdgCards.8.count', 1)
        ->assertJsonCount(2, 'featuredResearch');

    $this->getJson('/api/public/research?search=inactive-agency-study')
        ->assertOk()
        ->assertJsonPath('total', 0);

    $this->getJson("/api/public/research/{$inactiveResearch->slug}")
        ->assertNotFound();
});

test('agency deactivation immediately invalidates cached public research', function () {
    [$agency, $research] = createPublicPortalResearch();

    $this->getJson('/api/public/summary')
        ->assertOk()
        ->assertJsonPath('researchCount', 1);

    $this->getJson('/api/public/research')
        ->assertOk()
        ->assertJsonPath('total', 1);

    $agency->update(['status' => 'inactive']);

    $this->getJson('/api/public/summary')
        ->assertOk()
        ->assertJsonPath('researchCount', 0)
        ->assertJsonPath('agencyCount', 0)
        ->assertJsonCount(0, 'featuredResearch');

    $this->getJson('/api/public/research')
        ->assertOk()
        ->assertJsonPath('total', 0);

    $this->getJson("/api/public/research/{$research->slug}")
        ->assertNotFound();
});

test('public research detail supports slug and numeric id fallback', function () {
    [$agency, $sluggedResearch] = createPublicPortalResearch('slugged-public-study');

    $numericFallbackResearch = Research::create([
        'slug' => null,
        'agency_id' => $agency->id,
        'uploaded_by' => $sluggedResearch->uploaded_by,
        'title' => 'Published Research Without Slug',
        'abstract' => 'This published record has no slug and must still be readable by numeric fallback.',
        'authors' => ['Dr. Numeric Fallback'],
        'publication_year' => 2026,
        'category' => 'Technology',
        'sdgs' => ['SDG 9'],
        'keywords' => ['fallback'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 0,
        'published_at' => now(),
    ]);

    $this->getJson('/api/public/research/slugged-public-study')
        ->assertOk()
        ->assertJsonPath('data.id', $sluggedResearch->id)
        ->assertJsonPath('data.slug', 'slugged-public-study')
        ->assertJsonPath('data.public_identifier', 'slugged-public-study');

    $this->getJson("/api/public/research/{$numericFallbackResearch->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $numericFallbackResearch->id)
        ->assertJsonPath('data.slug', null)
        ->assertJsonPath('data.public_identifier', (string) $numericFallbackResearch->id);
});

test('public research download streams the latest public file', function () {
    Storage::fake('local');

    [, $research] = createPublicPortalResearch('downloadable-public-study');
    Storage::disk('local')->put("research/{$research->id}/public.pdf", 'PDF contents');

    $file = ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'uploaded_by' => $research->uploaded_by,
        'original_name' => 'public-study.pdf',
        'stored_name' => 'public.pdf',
        'disk' => 'local',
        'path' => "research/{$research->id}/public.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 12,
        'checksum' => hash('sha256', 'PDF contents'),
        'file_type' => 'research_document',
        'visibility' => 'public',
        'access_level' => 'public',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    $response = $this->get('/api/public/research/downloadable-public-study/download');

    $response
        ->assertOk()
        ->assertDownload('public-study.pdf');

    expect($response->streamedContent())->toBe('PDF contents');
    expect($research->fresh()->downloads)->toBe(13);
    expect(ResearchAnalyticsEvent::query()
        ->where('research_id', $research->id)
        ->where('research_file_id', $file->id)
        ->where('event_type', 'download')
        ->where('source', 'public')
        ->exists())->toBeTrue();
});

test('public research download rejects non public records and files', function () {
    Storage::fake('local');

    [, $research] = createPublicPortalResearch('public-record-private-file');
    Storage::disk('local')->put("research/{$research->id}/private.pdf", 'Private PDF');

    ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'uploaded_by' => $research->uploaded_by,
        'original_name' => 'private-study.pdf',
        'stored_name' => 'private.pdf',
        'disk' => 'local',
        'path' => "research/{$research->id}/private.pdf",
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 11,
        'checksum' => hash('sha256', 'Private PDF'),
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'uploaded_at' => now(),
    ]);

    $this->getJson('/api/public/research/public-record-private-file/download')
        ->assertNotFound()
        ->assertJsonPath('message', 'No public PDF is available for this research record.');

    $research->update(['access_level' => 'restricted']);

    $this->getJson('/api/public/research/public-record-private-file/download')
        ->assertForbidden()
        ->assertJsonPath('message', 'This research record is not available for public download.');

    expect($research->fresh()->downloads)->toBe(12);
});

test('public research only exposes published non archived non private records', function () {
    [$agency, $visibleResearch] = createPublicPortalResearch('visible-public-study');

    $hiddenRecords = collect([
        ['slug' => 'draft-public-study', 'status' => 'draft', 'access_level' => 'public', 'archived_at' => null],
        ['slug' => 'archived-public-study', 'status' => 'archived', 'access_level' => 'public', 'archived_at' => now()],
        ['slug' => 'private-public-study', 'status' => 'published', 'access_level' => 'private', 'archived_at' => null],
    ])->map(fn (array $attributes) => Research::create([
        ...$attributes,
        'agency_id' => $agency->id,
        'uploaded_by' => $visibleResearch->uploaded_by,
        'title' => str($attributes['slug'])->replace('-', ' ')->title()->toString(),
        'abstract' => 'Hidden from the public portal.',
        'authors' => ['Dr. Hidden Record'],
        'publication_year' => 2026,
        'category' => 'Technology',
        'sdgs' => ['SDG 9'],
        'keywords' => ['hidden'],
        'downloads' => 0,
    ]));

    $this->getJson('/api/public/research')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.id', $visibleResearch->id);

    $hiddenRecords->each(function (Research $research): void {
        $this->getJson("/api/public/research/{$research->slug}")
            ->assertNotFound();
    });
});

test('public research only exposes selected public metadata', function () {
    [, $research] = createPublicPortalResearch('metadata-visibility-study');

    $research->update([
        'public_metadata_fields' => [
            'title',
            'methodology',
            'results_and_discussion',
        ],
        'public_metadata' => [
            [
                'key' => 'title',
                'label' => 'Title',
                'value' => $research->title,
            ],
            [
                'key' => 'methodology',
                'label' => 'Methodology',
                'value' => 'Community surveys and shoreline mapping.',
            ],
            [
                'key' => 'results_and_discussion',
                'label' => 'Results and Discussion',
                'value' => 'Community relocation plans improved.',
            ],
            [
                'key' => 'abstract',
                'label' => 'Abstract',
                'value' => 'This unchecked abstract must not be exposed.',
            ],
        ],
    ]);

    $detail = $this->getJson('/api/public/research/metadata-visibility-study');

    $detail
        ->assertOk()
        ->assertJsonPath('data.title', $research->title)
        ->assertJsonPath('data.abstract', '')
        ->assertJsonPath('data.authors', [])
        ->assertJsonPath('data.keywords', [])
        ->assertJsonPath('data.publicMetadata.1.key', 'methodology')
        ->assertJsonPath('data.publicMetadata.2.key', 'results_and_discussion')
        ->assertJsonPath('data.publicMetadataFields.2', 'results_and_discussion')
        ->assertJsonMissingPath('data.publicMetadata.3');

    $detail
        ->assertJsonMissing(['key' => 'abstract'])
        ->assertJsonMissing(['value' => 'This unchecked abstract must not be exposed.']);

    $this->getJson('/api/public/research?search=socioeconomic')
        ->assertOk()
        ->assertJsonPath('total', 0);

    $this->getJson('/api/public/research?search=shoreline')
        ->assertOk()
        ->assertJsonPath('total', 1);
});

test('public metadata visibility supports legacy wizard keys and updates selected fields', function () {
    [, $research] = createPublicPortalResearch('metadata-update-study');

    $research->update([
        'public_metadata_fields' => [
            'title',
            'resultsAndDiscussion',
        ],
        'public_metadata' => [
            [
                'key' => 'resultsAndDiscussion',
                'label' => 'Results and Discussion',
                'value' => 'Initial public results.',
            ],
            [
                'key' => 'methodology',
                'label' => 'Methodology',
                'value' => 'Unchecked method should stay private.',
            ],
        ],
    ]);

    $this->getJson('/api/public/research/metadata-update-study')
        ->assertOk()
        ->assertJsonPath('data.publicMetadata.1.key', 'results_and_discussion')
        ->assertJsonMissing(['key' => 'methodology']);

    $research->update([
        'public_metadata_fields' => [
            'title',
            'methodology',
        ],
        'public_metadata' => [
            [
                'key' => 'methodology',
                'label' => 'Methodology',
                'value' => 'Updated public methodology.',
            ],
            [
                'key' => 'results_and_discussion',
                'label' => 'Results and Discussion',
                'value' => 'Old results should stay private.',
            ],
        ],
    ]);

    $this->getJson('/api/public/research/metadata-update-study')
        ->assertOk()
        ->assertJsonPath('data.publicMetadata.1.key', 'methodology')
        ->assertJsonMissing(['key' => 'results_and_discussion'])
        ->assertJsonMissing(['value' => 'Old results should stay private.']);
});

test('public agency profile includes database backed research', function () {
    Storage::fake('public');

    [$agencyRecord] = createPublicPortalResearch();
    $agencyRecord->update(['logo_path' => "agency-logos/{$agencyRecord->id}/detail-logo.png"]);

    $agency = $this->getJson('/api/public/agencies/smaarrdec');
    $research = $this->getJson('/api/public/agencies/smaarrdec/research');

    $agency
        ->assertOk()
        ->assertJsonPath('data.slug', 'smaarrdec')
        ->assertJsonPath('data.logo_url', $agencyRecord->fresh()->logo_url)
        ->assertJsonPath('data.publications', 1);

    $research
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('public portal can start empty', function () {
    $this->getJson('/api/public/agencies')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->getJson('/api/public/research')
        ->assertOk()
        ->assertJsonPath('total', 0)
        ->assertJsonCount(0, 'items');
});

test('public browse and agency endpoints use the public api limiter', function () {
    config()->set('rikms.security.public_api_per_minute', 2);

    $this->getJson('/api/public/research')->assertOk();
    $this->getJson('/api/public/agencies')->assertOk();
    $this->getJson('/api/public/summary')->assertTooManyRequests();
});

test('public downloads use their stricter limiter', function () {
    config()->set('rikms.security.public_api_per_minute', 60);
    config()->set('rikms.security.public_downloads_per_minute', 1);

    createPublicPortalResearch('limited-download');

    $this->getJson('/api/public/research/limited-download/download')->assertNotFound();
    $this->getJson('/api/public/research/limited-download/download')->assertTooManyRequests();
});

test('public browse uses database pagination and clamps per page', function () {
    [$agency, $first] = createPublicPortalResearch('database-page-1');

    foreach (range(2, 55) as $index) {
        Research::create([
            'slug' => "database-page-{$index}",
            'agency_id' => $agency->id,
            'uploaded_by' => $first->uploaded_by,
            'title' => "Database Page {$index}",
            'publication_year' => 2026,
            'category' => 'Scalability',
            'sdgs' => ['SDG 9'],
            'status' => 'published',
            'access_level' => 'public',
            'published_at' => now(),
        ]);
    }

    $this->getJson('/api/public/research?per_page=500&page=1')
        ->assertOk()
        ->assertJsonPath('total', 55)
        ->assertJsonPath('perPage', 50)
        ->assertJsonCount(50, 'items');
});

test('public browse applies agency year document type and sdg filters in the database', function () {
    Storage::fake('local');
    [$agency, $matching] = createPublicPortalResearch('database-filter-match');
    $matching->update(['publication_year' => 2024, 'sdgs' => ['SDG 9']]);
    ResearchFile::create([
        'research_id' => $matching->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $matching->uploaded_by,
        'original_name' => 'terminal.pdf',
        'stored_name' => 'terminal.pdf',
        'disk' => 'local',
        'path' => 'terminal.pdf',
        'file_type' => 'terminal-report',
        'visibility' => 'public',
        'access_level' => 'public',
        'status' => 'active',
    ]);

    $this->getJson('/api/public/research?agency=smaarrdec&year=2024&document_type=terminal-report&sdg=SDG%209')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.id', $matching->id)
        ->assertJsonPath('facets.documentTypes.0.value', 'terminal-report');

    $this->getJson('/api/public/research?year=2023')->assertJsonPath('total', 0);
});

test('public browse rejects unapproved sort fields', function () {
    $this->getJson('/api/public/research?sort=password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('sort');
});

test('public list cache is parameter specific and invalidates after research changes', function () {
    [, $research] = createPublicPortalResearch('cache-version-study');
    $research->update(['title' => 'Cache Version Study']);

    $this->getJson('/api/public/research?search=Cache%20Version')->assertJsonPath('total', 1);

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->getJson('/api/public/research?search=Cache%20Version')->assertJsonPath('total', 1);
    expect(DB::getQueryLog())->toBe([]);
    DB::disableQueryLog();

    $this->getJson('/api/public/research?search=no-match')->assertJsonPath('total', 0);

    $research->update(['title' => 'Changed Public Cache Title']);

    $this->getJson('/api/public/research?search=Changed%20Public%20Cache')
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.title', 'Changed Public Cache Title');
});
