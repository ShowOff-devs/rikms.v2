<?php

test('agency login page can be rendered', function () {
    $response = $this->get('/agency/login');

    $response->assertOk();
});

test('agency forgot password page can be rendered', function () {
    $response = $this->get('/agency/forgot-password');

    $response->assertOk();
});

test('agency dashboard page can be rendered', function () {
    $response = $this->get('/agency/dashboard');

    $response->assertOk();
});
