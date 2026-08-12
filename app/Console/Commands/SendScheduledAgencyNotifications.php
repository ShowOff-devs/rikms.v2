<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\MonthlyAgencyAnalyticsReportNotification;
use App\Notifications\WeeklyAgencyDigestNotification;
use App\Services\AgencyScheduledReportService;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendScheduledAgencyNotifications extends Command
{
    protected $signature = 'agency:send-scheduled-notifications
        {frequency : The notification frequency: weekly or monthly}';

    protected $description = 'Queue opted-in weekly digests or monthly analytics reports for agency users';

    public function handle(AgencyScheduledReportService $reports): int
    {
        $frequency = strtolower((string) $this->argument('frequency'));

        if (! in_array($frequency, ['weekly', 'monthly'], true)) {
            $this->error('Frequency must be either weekly or monthly.');

            return self::INVALID;
        }

        $preference = $frequency === 'weekly' ? 'weeklyDigest' : 'monthlyAnalyticsReport';
        [$startsAt, $endsAt] = $this->period($frequency);
        $queued = 0;

        User::query()
            ->where('status', Statuses::USER_ACTIVE)
            ->whereNotNull('agency_id')
            ->whereNotNull('email')
            ->whereNotNull('email_verified_at')
            ->with('agency')
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($reports, $frequency, $preference, $startsAt, $endsAt, &$queued): void {
                foreach ($users as $user) {
                    if (! UserNotificationPreferences::wants($user, $preference, false)) {
                        continue;
                    }

                    $data = $reports->summary($user, $startsAt, $endsAt);
                    $notification = $frequency === 'weekly'
                        ? new WeeklyAgencyDigestNotification($data)
                        : new MonthlyAgencyAnalyticsReportNotification($data);

                    $user->notify($notification);
                    $queued++;
                }
            });

        $this->info("Queued {$queued} {$frequency} agency notification(s).");

        return self::SUCCESS;
    }

    /** @return array{CarbonImmutable, CarbonImmutable} */
    private function period(string $frequency): array
    {
        $timezone = (string) config('rikms.scheduled_notifications.timezone', 'Asia/Manila');
        $now = CarbonImmutable::now($timezone);
        $endsAt = $frequency === 'weekly' ? $now->startOfWeek() : $now->startOfMonth();
        $startsAt = $frequency === 'weekly' ? $endsAt->subWeek() : $endsAt->subMonth();

        return [$startsAt, $endsAt];
    }
}
