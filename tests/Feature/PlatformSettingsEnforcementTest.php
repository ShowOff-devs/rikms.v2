<?php

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Notification;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\PlatformSettingsService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

function platformSettingsSet(string $key, mixed $value, string $type = 'boolean'): void
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

function platformSettingsRole(string $slug): Role
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

function platformSettingsAgency(string $slug = 'settings-enforcement-agency'): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function platformSettingsUser(string $role, ?Agency $agency = null, bool $withTwoFactor = false): User
{
    $factory = $withTwoFactor ? User::factory()->withTwoFactor() : User::factory();
    $user = $factory->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        platformSettingsRole($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function platformSettingsResearch(Agency $agency, User $uploader, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => 'settings-enforcement-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Settings Enforcement Research',
        'abstract' => 'A platform settings enforcement fixture.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['settings'],
        'status' => $status,
        'access_level' => 'restricted',
        'published_at' => $status === 'published' ? now() : null,
    ]);
}

test('platform settings service casts values safely and invalidates cache', function () {
    platformSettingsSet(PlatformSettingsService::ACCESS_REQUESTS_ENABLED, true);

    $service = app(PlatformSettingsService::class);

    expect($service->boolean(PlatformSettingsService::ACCESS_REQUESTS_ENABLED))->toBeTrue();

    PlatformSetting::query()
        ->where('key', PlatformSettingsService::ACCESS_REQUESTS_ENABLED)
        ->update(['value' => 'false']);

    expect($service->boolean(PlatformSettingsService::ACCESS_REQUESTS_ENABLED))->toBeTrue();

    $service->forgetCache();

    expect($service->boolean(PlatformSettingsService::ACCESS_REQUESTS_ENABLED))->toBeFalse();

    PlatformSetting::query()
        ->where('key', PlatformSettingsService::ACCESS_REQUESTS_ENABLED)
        ->update(['value' => 'not-a-boolean']);

    $service->forgetCache();

    expect($service->boolean(PlatformSettingsService::ACCESS_REQUESTS_ENABLED, true))->toBeTrue();
});

test('unknown and invalid platform setting updates are rejected', function () {
    $admin = platformSettingsUser('super_admin', null, true);

    $this->actingAs($admin)
        ->postJson('/api/admin/platform-settings/bulk-update', [
            'settings' => ['unknown.setting' => true],
        ])
        ->assertUnprocessable();

    $this->actingAs($admin)
        ->postJson('/api/admin/platform-settings/bulk-update', [
            'settings' => [PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB => 0],
        ])
        ->assertUnprocessable();
});

test('disabled public access requests reject submissions without records or notifications', function () {
    platformSettingsSet(PlatformSettingsService::ACCESS_REQUESTS_ENABLED, false);

    $agency = platformSettingsAgency('settings-access-disabled');
    $agencyAdmin = platformSettingsUser('agency_admin', $agency);
    $research = platformSettingsResearch($agency, $agencyAdmin, 'published');

    $this->postJson("/api/public/research/{$research->slug}/access-requests", [
        'requester_name' => 'Public Researcher',
        'requester_email' => 'disabled-access@example.test',
        'requester_purpose' => 'Policy analysis for a regional knowledge-sharing study.',
    ])
        ->assertStatus(503)
        ->assertJsonPath('errors.code', 'PUBLIC_ACCESS_REQUESTS_DISABLED');

    expect(AccessRequest::query()->where('requester_email', 'disabled-access@example.test')->exists())->toBeFalse();
    expect(Notification::query()->where('type', 'access_request.submitted')->exists())->toBeFalse();

    $this->getJson('/api/public/platform-settings')
        ->assertOk()
        ->assertJsonPath('data.access_requests_enabled', false);
});

test('configured upload limit is enforced by request validation', function () {
    Bus::fake();
    Storage::fake('local');
    platformSettingsSet(PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB, 1, 'integer');

    $agency = platformSettingsAgency('settings-upload-limit');
    $agencyAdmin = platformSettingsUser('agency_admin', $agency);
    $research = platformSettingsResearch($agency, $agencyAdmin);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('too-large.pdf', 2048),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('small.pdf', 512),
        ])
        ->assertCreated();
});

test('disabled ai processing stores uploads but dispatches no ai jobs', function () {
    Bus::fake();
    Storage::fake('local');
    platformSettingsSet(PlatformSettingsService::AI_PROCESSING_ENABLED, false);

    $agency = platformSettingsAgency('settings-ai-disabled');
    $agencyAdmin = platformSettingsUser('agency_admin', $agency);
    $research = platformSettingsResearch($agency, $agencyAdmin);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/files", [
            'file' => testPdfUpload('ai-disabled.pdf', 128),
        ])
        ->assertCreated();

    $file = ResearchFile::query()->where('research_id', $research->id)->firstOrFail();

    expect($file->metadata['ai_processing']['pdf_parsing']['status'])->toBe('skipped')
        ->and($file->metadata['ai_processing']['ai_metadata']['status'])->toBe('skipped')
        ->and($file->metadata['ai_processing']['sdg_classification']['status'])->toBe('skipped');

    Bus::assertNotDispatched(ParsePdfDocumentJob::class);
    Bus::assertNotDispatched(ExtractResearchMetadataJob::class);
    Bus::assertNotDispatched(ClassifyResearchSdgJob::class);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/ai-results/process")
        ->assertStatus(503)
        ->assertJsonPath('errors.code', 'AI_PROCESSING_DISABLED');
});

test('super admin mfa setting follows environment floor precedence', function () {
    config(['rikms.security.force_super_admin_mfa' => false]);
    platformSettingsSet(PlatformSettingsService::REQUIRE_SUPER_ADMIN_MFA, false);

    $admin = platformSettingsUser('super_admin');

    $this->actingAs($admin)
        ->getJson('/api/admin/platform-settings?per_page=100')
        ->assertOk();

    platformSettingsSet(PlatformSettingsService::REQUIRE_SUPER_ADMIN_MFA, true);

    $this->actingAs($admin)
        ->getJson('/api/admin/platform-settings?per_page=100')
        ->assertForbidden();

    platformSettingsSet(PlatformSettingsService::REQUIRE_SUPER_ADMIN_MFA, false);
    config(['rikms.security.force_super_admin_mfa' => true]);

    $this->actingAs($admin)
        ->getJson('/api/admin/platform-settings?per_page=100')
        ->assertForbidden();
});

test('application maintenance mode blocks normal routes and keeps recovery routes available', function () {
    platformSettingsSet(PlatformSettingsService::MAINTENANCE_ENABLED, true);
    platformSettingsSet(PlatformSettingsService::MAINTENANCE_NOTICE_TEXT, 'Maintenance window in progress.', 'string');

    $this->get('/browse-research')
        ->assertStatus(503)
        ->assertSee('Maintenance window in progress.');

    $this->getJson('/api/public/research')
        ->assertStatus(503)
        ->assertJsonPath('errors.code', 'PLATFORM_MAINTENANCE');

    $this->get('/up')->assertOk();
    $this->get('/admin/login')->assertOk();
});
