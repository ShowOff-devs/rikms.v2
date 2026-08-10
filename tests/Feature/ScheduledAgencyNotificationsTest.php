<?php

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\User;
use App\Notifications\MonthlyAgencyAnalyticsReportNotification;
use App\Notifications\WeeklyAgencyDigestNotification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;

function scheduledNotificationAgency(string $suffix): Agency
{
    return Agency::create([
        'slug' => "scheduled-notifications-{$suffix}",
        'name' => 'Scheduled Notifications Agency',
        'short_name' => 'SNA',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function scheduledNotificationUser(Agency $agency, array $preferences): User
{
    return User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
        'notification_preferences' => $preferences,
    ]);
}

test('weekly digest queues an agency activity summary only for opted-in verified users', function () {
    Notification::fake();
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-10 08:00:00', 'Asia/Manila'));

    $agency = scheduledNotificationAgency('weekly');
    $recipient = scheduledNotificationUser($agency, ['weeklyDigest' => true]);
    $optedOut = scheduledNotificationUser($agency, ['weeklyDigest' => false]);

    $research = Research::create([
        'slug' => 'weekly-digest-research',
        'agency_id' => $agency->id,
        'uploaded_by' => $recipient->id,
        'title' => 'Weekly Digest Research',
        'status' => 'published',
        'access_level' => 'public',
        'published_at' => '2026-08-06 02:00:00',
    ]);
    $research->forceFill([
        'created_at' => '2026-08-05 02:00:00',
        'updated_at' => '2026-08-05 02:00:00',
    ])->saveQuietly();

    $accessRequest = AccessRequest::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'requester_email' => 'digest@example.test',
        'status' => 'approved',
        'reviewed_at' => '2026-08-07 02:00:00',
    ]);
    $accessRequest->forceFill([
        'created_at' => '2026-08-07 02:00:00',
        'updated_at' => '2026-08-07 02:00:00',
    ])->saveQuietly();

    ResearchAnalyticsEvent::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'event_type' => 'view',
        'source' => 'public',
        'occurred_at' => '2026-08-08 02:00:00',
    ]);

    $this->artisan('agency:send-scheduled-notifications', ['frequency' => 'weekly'])
        ->expectsOutput('Queued 1 weekly agency notification(s).')
        ->assertSuccessful();

    Notification::assertSentTo(
        $recipient,
        WeeklyAgencyDigestNotification::class,
        fn (WeeklyAgencyDigestNotification $notification): bool => $notification->data['researchAdded'] === 1
            && $notification->data['researchPublished'] === 1
            && $notification->data['accessRequestsReceived'] === 1
            && $notification->data['accessRequestsApproved'] === 1
            && $notification->data['views'] === 1,
    );
    Notification::assertNotSentTo($optedOut, WeeklyAgencyDigestNotification::class);
});

test('monthly report honors its separate preference and renders the analytics email', function () {
    Notification::fake();
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-01 08:00:00', 'Asia/Manila'));

    $agency = scheduledNotificationAgency('monthly');
    $recipient = scheduledNotificationUser($agency, [
        'weeklyDigest' => false,
        'monthlyAnalyticsReport' => true,
    ]);

    $this->artisan('agency:send-scheduled-notifications', ['frequency' => 'monthly'])
        ->expectsOutput('Queued 1 monthly agency notification(s).')
        ->assertSuccessful();

    Notification::assertSentTo(
        $recipient,
        MonthlyAgencyAnalyticsReportNotification::class,
        function (MonthlyAgencyAnalyticsReportNotification $notification) use ($recipient): bool {
            $mail = $notification->toMail($recipient);

            return $notification->data['periodStart'] === 'Jul 1, 2026'
                && $notification->data['periodEnd'] === 'Jul 31, 2026'
                && str_contains($mail->render(), 'Monthly analytics report');
        },
    );
});

test('scheduled notification command rejects an unsupported frequency', function () {
    $this->artisan('agency:send-scheduled-notifications', ['frequency' => 'daily'])
        ->expectsOutput('Frequency must be either weekly or monthly.')
        ->assertExitCode(2);
});
