<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchFile;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Date::setTestNow('2026-08-30 12:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

function analyticsAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->headline()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function analyticsAgencyUser(Agency $agency, string $email): User
{
    return User::factory()->create([
        'agency_id' => $agency->id,
        'email' => $email,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
}

function analyticsResearch(Agency $agency, User $user, string $title, int $downloads = 0, array $attributes = []): Research
{
    return Research::create(array_merge([
        'slug' => str($title)->slug()->append('-'.str()->random(6))->toString(),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => $title,
        'abstract' => "Abstract for {$title}",
        'authors' => ['Analytics Tester'],
        'publication_year' => 2026,
        'category' => 'Public Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['analytics'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => $downloads,
    ], $attributes));
}

function analyticsResearchFile(Research $research, User $user, string $fileType, array $attributes = []): ResearchFile
{
    return ResearchFile::create(array_merge([
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'uploaded_by' => $user->id,
        'original_name' => "{$fileType}.pdf",
        'stored_name' => str()->uuid().'.pdf',
        'disk' => 'local',
        'path' => 'tests/'.str()->uuid().'.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', $research->id.$fileType),
        'file_type' => $fileType,
        'visibility' => 'public',
        'access_level' => 'public',
        'status' => 'active',
        'uploaded_at' => now(),
    ], $attributes));
}

function analyticsEvent(Research $research, string $eventType, string $occurredAt): ResearchAnalyticsEvent
{
    return ResearchAnalyticsEvent::create([
        'research_id' => $research->id,
        'agency_id' => $research->agency_id,
        'event_type' => $eventType,
        'source' => 'public',
        'occurred_at' => $occurredAt,
    ]);
}

test('agency analytics reports recorded views and download activity in the month it occurred', function () {
    $agency = analyticsAgency('analytics-metrics');
    $user = analyticsAgencyUser($agency, 'analytics-metrics@example.test');
    $research = analyticsResearch($agency, $user, 'Event Backed Analytics', 9);
    analyticsResearchFile($research, $user, 'research_document');
    $research->forceFill(['created_at' => '2026-01-10 09:00:00'])->saveQuietly();

    analyticsEvent($research, 'view', '2026-03-03 10:00:00');
    analyticsEvent($research, 'view', '2026-07-04 11:00:00');
    analyticsEvent($research, 'download', '2026-08-05 12:00:00');
    analyticsEvent($research, 'download', '2025-12-20 12:00:00');

    AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_name' => 'Analytics Requester',
        'requester_email' => 'requester@example.test',
        'purpose' => 'Analytics verification',
        'status' => 'pending',
    ]);

    $otherAgency = analyticsAgency('analytics-other');
    $otherUser = analyticsAgencyUser($otherAgency, 'analytics-other@example.test');
    $otherResearch = analyticsResearch($otherAgency, $otherUser, 'Other Agency Analytics', 99);
    analyticsEvent($otherResearch, 'view', '2026-07-04 11:00:00');
    analyticsEvent($otherResearch, 'download', '2026-08-05 12:00:00');

    DB::flushQueryLog();
    DB::enableQueryLog();
    $response = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk();
    $downloadAggregationQueries = collect(DB::getQueryLog())
        ->filter(fn (array $query): bool => str_contains($query['query'], 'research_analytics_events')
            && str_contains($query['query'], 'occurred_at'));
    DB::disableQueryLog();
    $data = $response->json('data');
    $metrics = collect($data['summaryMetrics'])->keyBy('id');
    $record = collect($data['records'])->firstWhere('id', (string) $research->id);

    expect($metrics['total-views']['value'])->toBe(2)
        ->and($data['downloadTrends'][0]['downloads'])->toBe(0)
        ->and($data['downloadTrends'][7]['downloads'])->toBe(1)
        ->and($record['views'])->toBe(2)
        ->and($record['accessRequests'])->toBe(1)
        ->and($record['monthlyDownloads'][7])->toBe(1)
        ->and(array_sum($record['monthlyDownloads']))->toBe(1)
        ->and($data['mostAccessedResearch'][0]['views'])->toBe(2)
        ->and($downloadAggregationQueries)->toHaveCount(1);
});

test('agency analytics derives and applies document types without leaking other agency or archived records', function () {
    $agency = analyticsAgency('analytics-types');
    $user = analyticsAgencyUser($agency, 'analytics-types@example.test');

    $study = analyticsResearch($agency, $user, 'Research Study Record');
    analyticsResearchFile($study, $user, 'research_document');

    $terminal = analyticsResearch($agency, $user, 'Terminal Report Record');
    analyticsResearchFile($terminal, $user, 'terminal-report');

    $policy = analyticsResearch($agency, $user, 'Policy Brief Record');
    analyticsResearchFile($policy, $user, 'policy_brief');

    $archived = analyticsResearch($agency, $user, 'Archived Terminal Report');
    analyticsResearchFile($archived, $user, 'terminal-report');
    $archived->update(['archived_at' => now()]);

    $otherAgency = analyticsAgency('analytics-types-other');
    $otherUser = analyticsAgencyUser($otherAgency, 'analytics-types-other@example.test');
    $otherRecord = analyticsResearch($otherAgency, $otherUser, 'Other Agency Project Report');
    analyticsResearchFile($otherRecord, $otherUser, 'project-accomplishment');

    $unfiltered = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk()->json('data');

    expect($unfiltered['filterOptions']['documentTypes'])->toBe([
        'Policy Brief',
        'Research Study',
        'Terminal Report',
    ])->and(collect($unfiltered['records'])->pluck('documentType')->sort()->values()->all())->toBe([
        'Policy Brief',
        'Research Study',
        'Terminal Report',
    ]);

    $filtered = $this->actingAs($user)
        ->getJson('/api/agency/analytics?documentType=Terminal%20Report')
        ->assertOk()
        ->assertJsonPath('data.summaryMetrics.0.value', 1)
        ->json('data');

    expect($filtered['records'])->toHaveCount(1)
        ->and($filtered['records'][0]['id'])->toBe((string) $terminal->id)
        ->and($filtered['records'][0]['documentType'])->toBe('Terminal Report');
});

test('agency analytics csv export includes recorded view counts', function () {
    $agency = analyticsAgency('analytics-export');
    $user = analyticsAgencyUser($agency, 'analytics-export@example.test');
    $research = analyticsResearch($agency, $user, 'Analytics Export Record', 3);
    analyticsResearchFile($research, $user, 'research_document');
    analyticsEvent($research, 'view', '2026-04-01 10:00:00');
    analyticsEvent($research, 'view', '2026-04-02 10:00:00');

    $response = $this->actingAs($user)
        ->get('/api/agency/analytics/export?format=csv')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    expect($response->streamedContent())->toContain('Analytics Export Record')
        ->and($response->streamedContent())->toContain(',3,2');
});

test('agency analytics classifies and filters approved research consistently', function () {
    $agency = analyticsAgency('analytics-approved');
    $user = analyticsAgencyUser($agency, 'analytics-approved@example.test');
    $approved = analyticsResearch($agency, $user, 'Approved Research', attributes: ['status' => 'approved']);
    $published = analyticsResearch($agency, $user, 'Published Research');
    analyticsResearch($agency, $user, 'Pending Research', attributes: ['status' => 'under_review']);

    $data = $this->actingAs($user)
        ->getJson('/api/agency/analytics?status=approved')
        ->assertOk()
        ->json('data');

    expect(collect($data['records'])->pluck('id')->sort()->values()->all())->toBe(collect([
        (string) $approved->id,
        (string) $published->id,
    ])->sort()->values()->all())
        ->and(collect($data['records'])->pluck('status')->unique()->all())->toBe(['approved']);
});

test('agency analytics maps and filters stored repository access policies', function () {
    $agency = analyticsAgency('analytics-access');
    $user = analyticsAgencyUser($agency, 'analytics-access@example.test');
    $embargoed = analyticsResearch($agency, $user, 'Embargoed Research', attributes: ['access_level' => 'embargoed']);
    $requestRequired = analyticsResearch($agency, $user, 'Request Required Research', attributes: ['access_level' => 'request_required']);
    $external = analyticsResearch($agency, $user, 'External Research', attributes: [
        'access_level' => 'restricted',
        'external_url' => 'https://example.test/external-research',
    ]);

    $unfiltered = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk()->json('data');
    $records = collect($unfiltered['records'])->keyBy('id');

    expect($records[(string) $embargoed->id]['accessType'])->toBe('embargo')
        ->and($records[(string) $requestRequired->id]['accessType'])->toBe('request-access')
        ->and($records[(string) $external->id]['accessType'])->toBe('external-link')
        ->and($unfiltered['filterOptions']['accessTypes'])->toBe([
            'embargo',
            'external-link',
            'request-access',
        ]);

    foreach ([
        'embargo' => $embargoed,
        'request-access' => $requestRequired,
        'external-link' => $external,
    ] as $filter => $expected) {
        $filtered = $this->actingAs($user)
            ->getJson('/api/agency/analytics?accessType='.urlencode($filter))
            ->assertOk()
            ->json('data.records');

        expect($filtered)->toHaveCount(1)
            ->and($filtered[0]['id'])->toBe((string) $expected->id);
    }
});

test('agency analytics trends reapply filters and remain neutral for all years', function () {
    $agency = analyticsAgency('analytics-trends');
    $user = analyticsAgencyUser($agency, 'analytics-trends@example.test');

    analyticsResearch($agency, $user, 'Current One', attributes: ['publication_year' => 2026]);
    analyticsResearch($agency, $user, 'Current Two', attributes: ['publication_year' => 2026]);
    analyticsResearch($agency, $user, 'Prior Matching', attributes: ['publication_year' => 2025]);
    analyticsResearch($agency, $user, 'Prior Other Category', attributes: [
        'publication_year' => 2025,
        'category' => 'Agriculture',
    ]);

    $filteredMetrics = collect($this->actingAs($user)
        ->getJson('/api/agency/analytics?year=2026&category=Public%20Governance')
        ->assertOk()
        ->json('data.summaryMetrics'))
        ->keyBy('id');

    expect($filteredMetrics['total-research']['value'])->toBe(2)
        ->and($filteredMetrics['total-research']['trend'])->toBe(100)
        ->and($filteredMetrics['total-research']['trendDirection'])->toBe('up');

    $allYearMetrics = collect($this->actingAs($user)
        ->getJson('/api/agency/analytics')
        ->assertOk()
        ->json('data.summaryMetrics'));

    expect($allYearMetrics->pluck('trend')->unique()->all())->toBe([0])
        ->and($allYearMetrics->pluck('trendDirection')->unique()->all())->toBe(['neutral']);
});

test('agency analytics ignores inactive files and superseded research', function () {
    $agency = analyticsAgency('analytics-active-files');
    $user = analyticsAgencyUser($agency, 'analytics-active-files@example.test');
    $research = analyticsResearch($agency, $user, 'Active File Research');
    analyticsResearchFile($research, $user, 'research_document', ['uploaded_at' => now()->subMinute()]);
    analyticsResearchFile($research, $user, 'terminal-report', [
        'status' => 'failed',
        'uploaded_at' => now(),
    ]);

    $replacement = analyticsResearch($agency, $user, 'Replacement Research');
    $superseded = analyticsResearch($agency, $user, 'Superseded Research', attributes: [
        'superseded_by_id' => $replacement->id,
    ]);

    $data = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk()->json('data');
    $records = collect($data['records'])->keyBy('id');

    expect($records[(string) $research->id]['documentType'])->toBe('Research Study')
        ->and($records->has((string) $replacement->id))->toBeTrue()
        ->and($records->has((string) $superseded->id))->toBeFalse();
});

test('agency analytics access request breakdown includes every valid terminal status', function () {
    $agency = analyticsAgency('analytics-request-statuses');
    $user = analyticsAgencyUser($agency, 'analytics-request-statuses@example.test');
    $research = analyticsResearch($agency, $user, 'Access Request Status Research');

    foreach (['pending', 'approved', 'denied', 'expired', 'cancelled'] as $status) {
        AccessRequest::create([
            'research_id' => $research->id,
            'agency_id' => $agency->id,
            'requester_name' => str($status)->headline()->toString(),
            'requester_email' => "{$status}@example.test",
            'purpose' => 'Analytics status verification',
            'status' => $status,
        ]);
    }

    $response = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk();

    foreach (['pending', 'approved', 'denied', 'expired', 'cancelled'] as $status) {
        $response->assertJsonPath("data.accessRequestBreakdown.{$status}", 1);
    }

    $response->assertJsonPath('data.summaryMetrics.3.value', 5);
});

test('agency analytics preserves unknown publication years and includes uncategorized research', function () {
    $agency = analyticsAgency('analytics-unknown-values');
    $user = analyticsAgencyUser($agency, 'analytics-unknown-values@example.test');
    $research = analyticsResearch($agency, $user, 'Undated Uncategorized Research', 25, [
        'publication_year' => null,
        'category' => null,
    ]);

    $data = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk()->json('data');
    $record = collect($data['records'])->firstWhere('id', (string) $research->id);
    $mostAccessed = collect($data['mostAccessedResearch'])->firstWhere('id', (string) $research->id);
    $uncategorized = collect($data['categoryDistribution'])->firstWhere('category', 'Uncategorized');

    expect($record['year'])->toBeNull()
        ->and($mostAccessed['year'])->toBeNull()
        ->and($data['yearlyPublications'])->toBe([])
        ->and($uncategorized['count'])->toBe(1)
        ->and($data['summaryMetrics'][0]['value'])->toBe(1);
});

test('agency analytics rejects filter values outside the available options', function () {
    $agency = analyticsAgency('analytics-filter-validation');
    $user = analyticsAgencyUser($agency, 'analytics-filter-validation@example.test');
    $research = analyticsResearch($agency, $user, 'Validated Filter Research');
    analyticsResearchFile($research, $user, 'research_document');

    $query = http_build_query([
        'year' => 'not-a-year',
        'documentType' => 'Unknown Document',
        'category' => 'Unknown Category',
        'sdg' => 'SDG 99',
        'status' => 'unknown',
        'accessType' => 'unknown',
    ]);

    $this->actingAs($user)
        ->getJson('/api/agency/analytics?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'year',
            'documentType',
            'category',
            'sdg',
            'status',
            'accessType',
        ]);

    $this->actingAs($user)
        ->getJson('/api/agency/analytics/export?format=csv&status=unknown')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});
