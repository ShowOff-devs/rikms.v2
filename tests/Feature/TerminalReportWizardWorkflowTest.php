<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\Reports\PerformanceCalculationService;
use App\Services\ResearchFileStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function terminalWizardAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug.'-'.str()->random(6),
        'name' => str($slug)->headline()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function terminalWizardUser(Agency $agency): User
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
    $user->roles()->syncWithoutDetaching([$role->id => ['assigned_at' => now()]]);

    return $user;
}

function terminalWizardPayload(array $overrides = []): array
{
    return array_replace_recursive([
        'title' => 'Complete Terminal Report',
        'abstract' => 'A complete terminal report used to verify the resumable wizard workflow.',
        'authors' => ['Agency Researcher'],
        'publication_year' => (int) now()->year,
        'category' => 'Terminal Report',
        'sdg_tags' => ['SDG 9'],
        'public_metadata_fields' => ['title', 'abstract'],
        'public_metadata' => [
            ['key' => 'title', 'label' => 'Title', 'value' => 'Complete Terminal Report'],
            ['key' => 'abstract', 'label' => 'Abstract', 'value' => 'A complete terminal report used to verify the resumable wizard workflow.'],
        ],
        'report_details' => [
            'reporting_period' => 'Final',
            'project_start_date' => now()->startOfYear()->toDateString(),
            'project_end_date' => now()->endOfYear()->toDateString(),
            'allotted_budget' => 1000,
            'released_amount' => 1000,
            'obligated_amount' => 900,
            'utilized_amount' => 800,
            'physical_accomplishment_percent' => 100,
            'financial_as_of_date' => now()->toDateString(),
            'pap_categories' => ['Research and Development'],
            'pap_description' => 'Regional research and development program.',
            'beneficiary_sectors' => ['government', 'academe'],
            'performance_remarks' => 'Official reporting uses the approved terminal report figure.',
            'last_wizard_step' => 'highlights',
        ],
        'performance_items' => [[
            'project_name' => 'Deliver prototypes',
            'target_value' => '10 prototypes',
            'actual_value' => '12 prototypes',
            'target_numeric_value' => 10,
            'actual_numeric_value' => 12,
            'unit' => 'prototypes',
            'accomplishment_percentage' => 1,
            'project_status' => 'not-started',
            'remarks' => 'Exceeded the planned output.',
        ]],
        'report_highlights' => [[
            'title' => 'Prototype deployment completed',
            'description' => 'The project deployed production-ready prototypes across all participating pilot sites.',
            'is_featured' => true,
            'sort_order' => 0,
        ]],
    ], $overrides);
}

test('terminal report wizard fields persist hydrate and use canonical performance values', function () {
    $agency = terminalWizardAgency('wizard-persistence');
    $user = terminalWizardUser($agency);

    $created = $this->actingAs($user)
        ->postJson('/api/agency/research', terminalWizardPayload())
        ->assertCreated()
        ->assertJsonPath('data.report_detail.pap_categories.0', 'Research and Development')
        ->assertJsonPath('data.report_detail.beneficiary_sectors.1', 'academe')
        ->assertJsonPath('data.report_detail.performance_remarks', 'Official reporting uses the approved terminal report figure.')
        ->assertJsonPath('data.report_detail.last_wizard_step', 'highlights')
        ->assertJsonPath('data.report_highlights.0.title', 'Prototype deployment completed')
        ->assertJsonPath('data.report_highlights.0.is_featured', true)
        ->assertJsonPath('data.performance_items.0.target_numeric_value', '10.0000')
        ->assertJsonPath('data.performance_items.0.actual_numeric_value', '12.0000')
        ->assertJsonPath('data.performance_items.0.accomplishment_percentage', '120.00')
        ->assertJsonPath('data.performance_items.0.project_status', 'completed');

    $researchId = $created->json('data.id');

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$researchId}")
        ->assertOk()
        ->assertJsonPath('data.report_detail.pap_description', 'Regional research and development program.')
        ->assertJsonPath('data.report_highlights.0.description', 'The project deployed production-ready prototypes across all participating pilot sites.')
        ->assertJsonPath('data.performance_items.0.unit', 'prototypes');

    $this->actingAs($user)
        ->get("/agency/upload/terminal-report/{$researchId}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agency/upload/terminal-report')
            ->where('researchId', (string) $researchId));
});

test('draft saving is relaxed but submission is strict and does not change status on failure', function () {
    $agency = terminalWizardAgency('wizard-incomplete');
    $user = terminalWizardUser($agency);

    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', [
            'title' => 'Incomplete Terminal Report',
            'category' => 'Terminal Report',
            'publication_year' => (int) now()->year,
        ])
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$researchId}/submit")
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'sections.details.projectStartDate',
            'sections.performance.physicalAccomplishmentPercent',
            'sections.financials.allocatedBudget',
            'sections.performance.performanceProjects',
            'sections.pap-classification.papCategories',
            'sections.highlights.highlightTitle',
            'sections.details.uploadedFile',
        ]);

    expect(Research::findOrFail($researchId)->status)->toBe('draft');
});

test('complete terminal report submits with explicit zero financial values and a validated main pdf', function () {
    Storage::fake('local');
    Bus::fake();
    $agency = terminalWizardAgency('wizard-submit');
    $user = terminalWizardUser($agency);
    $payload = terminalWizardPayload([
        'report_details' => [
            'allotted_budget' => 0,
            'released_amount' => 0,
            'obligated_amount' => 0,
            'utilized_amount' => 0,
        ],
    ]);
    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', $payload)
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$researchId}/files", [
            'file' => testPdfUpload('terminal-report.pdf'),
            'file_type' => 'terminal-report',
        ])
        ->assertCreated();

    $this->actingAs($user)
        ->postJson("/api/agency/research/{$researchId}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');
});

test('highlight supporting files are scanned associated restored removable and agency scoped', function () {
    Storage::fake('local');
    $agency = terminalWizardAgency('wizard-files');
    $otherAgency = terminalWizardAgency('wizard-files-other');
    $user = terminalWizardUser($agency);
    $otherUser = terminalWizardUser($otherAgency);
    $created = $this->actingAs($user)
        ->postJson('/api/agency/research', terminalWizardPayload())
        ->assertCreated();
    $researchId = $created->json('data.id');
    $highlightId = $created->json('data.report_highlights.0.id');

    $fileId = $this->actingAs($user)
        ->postJson("/api/agency/research/{$researchId}/highlights/{$highlightId}/files", [
            'file' => UploadedFile::fake()->image('evidence.png', 500, 500),
        ])
        ->assertCreated()
        ->assertJsonPath('data.report_highlight_id', $highlightId)
        ->assertJsonPath('data.file_type', 'report-highlight-supporting')
        ->json('data.id');

    $this->actingAs($user)
        ->getJson("/api/agency/research/{$researchId}")
        ->assertOk()
        ->assertJsonPath('data.report_highlights.0.files.0.original_name', 'evidence.png');

    $this->actingAs($otherUser)
        ->deleteJson("/api/agency/research/{$researchId}/files/{$fileId}")
        ->assertForbidden();

    $this->actingAs($user)
        ->deleteJson("/api/agency/research/{$researchId}/files/{$fileId}")
        ->assertOk();

    $this->assertDatabaseHas('research_files', [
        'id' => $fileId,
        'status' => 'archived',
        'deleted_at' => null,
    ]);
    Storage::disk('local')->assertExists(
        ResearchFile::query()->findOrFail($fileId)->path,
    );
});

test('report revisions receive independent physical supporting files', function () {
    Storage::fake('local');
    $agency = terminalWizardAgency('wizard-revision-files');
    $user = terminalWizardUser($agency);
    $researchId = $this->actingAs($user)
        ->postJson('/api/agency/research', terminalWizardPayload())
        ->assertCreated()
        ->json('data.id');
    $research = Research::query()->findOrFail($researchId);
    $highlight = $research->reportHighlights()->firstOrFail();

    $sourceFileId = $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/highlights/{$highlight->id}/files", [
            'file' => UploadedFile::fake()->image('revision-evidence.png', 500, 500),
        ])
        ->assertCreated()
        ->json('data.id');

    $research->forceFill(['status' => 'published', 'published_at' => now()])->save();
    $revisionId = $this->actingAs($user)
        ->postJson("/api/agency/research/{$research->id}/revision")
        ->assertCreated()
        ->json('data.id');

    $sourceFile = ResearchFile::query()->findOrFail($sourceFileId);
    $revisionFile = ResearchFile::query()->where('research_id', $revisionId)->firstOrFail();

    expect($revisionFile->path)->not->toBe($sourceFile->path);
    Storage::disk('local')->assertExists($sourceFile->path);
    Storage::disk('local')->assertExists($revisionFile->path);

    expect(app(ResearchFileStorage::class)->deleteIfUnreferenced($sourceFile))->toBeTrue();
    Storage::disk('local')->assertMissing($sourceFile->path);
    Storage::disk('local')->assertExists($revisionFile->path);
});

test('performance calculation strictly handles commas units zero targets and overachievement', function () {
    $service = app(PerformanceCalculationService::class);

    $comma = $service->canonicalize([
        'target_value' => '1,000 trainings',
        'actual_value' => '1,200 trainings',
    ]);
    $mismatch = $service->canonicalize([
        'target_value' => '10 trainings',
        'actual_value' => '8 participants',
        'accomplishment_percentage' => 80,
        'project_status' => 'completed',
    ]);
    $zero = $service->canonicalize([
        'target_numeric_value' => 0,
        'actual_numeric_value' => 0,
        'unit' => 'outputs',
    ]);

    expect($comma['target_numeric_value'])->toBe(1000.0)
        ->and($comma['actual_numeric_value'])->toBe(1200.0)
        ->and($comma['accomplishment_percentage'])->toBe(120.0)
        ->and($comma['project_status'])->toBe('completed')
        ->and($mismatch['accomplishment_percentage'])->toBeNull()
        ->and($mismatch['project_status'])->toBe('not-reported')
        ->and($zero['accomplishment_percentage'])->toBeNull();
});

test('terminal report draft route and api reject cross agency access', function () {
    $agency = terminalWizardAgency('wizard-owner');
    $otherAgency = terminalWizardAgency('wizard-outsider');
    $owner = terminalWizardUser($agency);
    $outsider = terminalWizardUser($otherAgency);
    $researchId = $this->actingAs($owner)
        ->postJson('/api/agency/research', terminalWizardPayload())
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($outsider)
        ->get("/agency/upload/terminal-report/{$researchId}")
        ->assertForbidden();
    $this->actingAs($outsider)
        ->getJson("/api/agency/research/{$researchId}")
        ->assertForbidden();
    $this->actingAs($outsider)
        ->patchJson("/api/agency/research/{$researchId}", terminalWizardPayload())
        ->assertForbidden();
});

test('repeated draft saves retain one highlight and stale writes are rejected', function () {
    $agency = terminalWizardAgency('wizard-concurrency');
    $user = terminalWizardUser($agency);
    $created = $this->actingAs($user)
        ->postJson('/api/agency/research', terminalWizardPayload())
        ->assertCreated();
    $researchId = $created->json('data.id');
    $highlightId = $created->json('data.report_highlights.0.id');
    $originalUpdatedAt = $created->json('data.updated_at');
    $originalDraftVersion = $created->json('data.report_detail.draft_version');
    $payload = terminalWizardPayload([
        'title' => 'Updated terminal report',
        'expected_updated_at' => $originalUpdatedAt,
        'expected_draft_version' => $originalDraftVersion,
        'report_highlights' => [[
            'id' => $highlightId,
            'title' => 'Updated highlight',
            'description' => 'The updated highlight remains stable across repeated draft saves.',
            'is_featured' => true,
            'sort_order' => 0,
        ]],
    ]);

    $updated = $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", $payload)
        ->assertOk()
        ->assertJsonCount(1, 'data.report_highlights');

    $payload['expected_updated_at'] = $updated->json('data.updated_at');
    $payload['expected_draft_version'] = $updated->json('data.report_detail.draft_version');
    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", $payload)
        ->assertOk()
        ->assertJsonCount(1, 'data.report_highlights');

    $payload['expected_updated_at'] = $originalUpdatedAt;
    $payload['expected_draft_version'] = $originalDraftVersion;
    $this->actingAs($user)
        ->patchJson("/api/agency/research/{$researchId}", $payload)
        ->assertStatus(409)
        ->assertJsonPath('errors.expected_draft_version.0', 'The draft has changed since it was loaded.');

    $this->assertDatabaseCount('research_report_highlights', 1);
});

test('performance status input is restricted while valid contradictory derived values are ignored', function () {
    $agency = terminalWizardAgency('wizard-status');
    $user = terminalWizardUser($agency);
    $invalid = terminalWizardPayload();
    $invalid['performance_items'][0]['project_status'] = 'arbitrary-status';

    $this->actingAs($user)
        ->postJson('/api/agency/research', $invalid)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['performance_items.0.project_status']);

    $valid = terminalWizardPayload();
    $valid['performance_items'][0]['accomplishment_percentage'] = 5;
    $valid['performance_items'][0]['project_status'] = 'not-started';

    $this->actingAs($user)
        ->postJson('/api/agency/research', $valid)
        ->assertCreated()
        ->assertJsonPath('data.performance_items.0.accomplishment_percentage', '120.00')
        ->assertJsonPath('data.performance_items.0.project_status', 'completed');
});
