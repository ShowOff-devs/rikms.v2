<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchFile;
use App\Models\User;
use Illuminate\Support\Facades\Date;

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

function analyticsResearch(Agency $agency, User $user, string $title, int $downloads = 0): Research
{
    return Research::create([
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
    ]);
}

function analyticsResearchFile(Research $research, User $user, string $fileType): ResearchFile
{
    return ResearchFile::create([
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
    ]);
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

    $response = $this->actingAs($user)->getJson('/api/agency/analytics')->assertOk();
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
        ->and($data['mostAccessedResearch'][0]['views'])->toBe(2);
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
