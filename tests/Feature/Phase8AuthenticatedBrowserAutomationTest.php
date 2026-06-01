<?php

use Database\Seeders\DatabaseSeeder;

test('phase 8 authenticated web login and protected portal boundaries are covered by feature automation', function () {
    $this->seed(DatabaseSeeder::class);

    $this->get('/agency/dashboard')
        ->assertRedirect('/agency/login');

    $this->get('/admin/dashboard')
        ->assertRedirect('/admin/login');

    $this->post('/agency/login', [
        'email' => 'agency@admin.com',
        'password' => 'agency admin',
    ])->assertRedirect('/agency/dashboard');

    $this->get('/agency/dashboard')->assertOk();
    $this->get('/admin/dashboard')->assertForbidden();

    $this->post('/logout')->assertRedirect('/');

    $this->post('/admin/login', [
        'email' => 'super_admin@admin.com',
        'password' => 'superadmin',
    ])->assertRedirect('/admin/dashboard');

    $this->get('/admin/dashboard')->assertOk();
    $this->get('/agency/dashboard')->assertForbidden();
});
