<?php

use App\Jobs\RecordQueueWorkerHeartbeat;
use App\Services\RuntimeHeartbeat;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(RuntimeHeartbeat::class)->recordScheduler())
    ->name('rikms:scheduler-heartbeat')
    ->everyMinute()
    ->withoutOverlapping();

$queueConnection = (string) config('queue.default');

Schedule::job(new RecordQueueWorkerHeartbeat, 'health', $queueConnection)
    ->name('rikms:queue-worker-heartbeat')
    ->everyMinute()
    ->withoutOverlapping();

Schedule::command("queue:monitor {$queueConnection}:health,{$queueConnection}:default --max=100")
    ->everyMinute()
    ->withoutOverlapping();

Schedule::command('csp:prune-reports')
    ->dailyAt('02:15')
    ->withoutOverlapping()
    ->onOneServer();

if (config('rikms.scheduled_notifications.enabled')) {
    $notificationTimezone = (string) config('rikms.scheduled_notifications.timezone', 'Asia/Manila');

    Schedule::command('agency:send-scheduled-notifications weekly')
        ->weeklyOn(
            (int) config('rikms.scheduled_notifications.weekly_digest.day', 1),
            (string) config('rikms.scheduled_notifications.weekly_digest.time', '08:00'),
        )
        ->timezone($notificationTimezone)
        ->withoutOverlapping()
        ->onOneServer();

    Schedule::command('agency:send-scheduled-notifications monthly')
        ->monthlyOn(
            (int) config('rikms.scheduled_notifications.monthly_analytics.day', 1),
            (string) config('rikms.scheduled_notifications.monthly_analytics.time', '08:00'),
        )
        ->timezone($notificationTimezone)
        ->withoutOverlapping()
        ->onOneServer();
}
