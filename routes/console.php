<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('queue:monitor database:default --max=100')
    ->everyMinute()
    ->withoutOverlapping();

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
