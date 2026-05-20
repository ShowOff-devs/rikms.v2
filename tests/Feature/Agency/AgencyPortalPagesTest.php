<?php

use Inertia\Testing\AssertableInertia as Assert;

test('agency login page can be rendered', function () {
    $response = $this->get('/agency/login');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/login'),
    );
});

test('agency forgot password page can be rendered', function () {
    $response = $this->get('/agency/forgot-password');

    $response->assertOk();
});

test('agency research repository page can be rendered', function () {
    $response = $this->get('/agency/research-repository');

    $response->assertOk();
});

test('agency research repository edit page can be rendered', function () {
    $response = $this->get('/agency/research-repository/rr-001/edit');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/research-repository/edit')
        ->where('repositoryId', 'rr-001'),
    );
});

test('agency dashboard page can be rendered', function () {
    $response = $this->get('/agency/dashboard');

    $response->assertOk();
});

test('agency access requests page can be rendered', function () {
    $response = $this->get('/agency/access-requests');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/access-requests'),
    );
});

test('agency analytics page can be rendered', function () {
    $response = $this->get('/agency/analytics');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/analytics'),
    );
});

test('agency notifications page can be rendered', function () {
    $response = $this->get('/agency/notifications');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/notifications'),
    );
});

test('agency profile page can be rendered', function () {
    $response = $this->get('/agency/profile');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/profile'),
    );
});

test('agency settings page can be rendered', function () {
    $response = $this->get('/agency/settings');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('agency/settings'),
    );
});

test('agency upload pages can be rendered', function (string $path) {
    $response = $this->get($path);

    $response->assertOk();
})->with([
    '/agency/upload',
    '/agency/upload/research',
    '/agency/upload/terminal-report',
    '/agency/upload/project-accomplishment',
]);
