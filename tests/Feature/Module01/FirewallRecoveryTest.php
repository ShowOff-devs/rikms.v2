<?php

use Illuminate\Http\Request;

test('TEST 01-08 P0: health route and documented service startup units are present', function () {
    $healthRoute = app('router')->getRoutes()->match(Request::create('/up'));
    $queueUnit = file_get_contents(base_path('deploy/systemd/rikms-queue.service'));
    $schedulerTimer = file_get_contents(base_path('deploy/systemd/rikms-scheduler.timer'));
    $monitorTimer = file_get_contents(base_path('deploy/systemd/rikms-monitor.timer'));

    expect($healthRoute->uri())->toBe('up')
        ->and($queueUnit)->toContain('Restart=always')
        ->and($queueUnit)->toContain('WantedBy=multi-user.target')
        ->and($schedulerTimer)->toContain('Unit=rikms-scheduler.service')
        ->and($monitorTimer)->toContain('Unit=rikms-monitor.service');

    $this->get('/up')->assertOk();
})->group('module01', 'module01-app');
