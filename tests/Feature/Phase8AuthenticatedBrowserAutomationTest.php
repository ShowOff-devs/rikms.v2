<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use PragmaRX\Google2FA\Google2FA;

test('phase 8 authenticated web login and protected portal boundaries are covered by feature automation', function () {
    $this->seed(DatabaseSeeder::class);

    $this->get('/agency/dashboard')
        ->assertRedirect('/agency/login');

    $this->get('/admin/dashboard')
        ->assertRedirect('/admin/login');

    $this->post('/agency/login', [
        'agency' => 'dost-xi',
        'email' => 'agency@admin.com',
        'password' => 'agency admin',
    ])->assertRedirect('/agency/dashboard');

    $this->get('/agency/dashboard')->assertOk();
    $this->get('/admin/dashboard')->assertForbidden();

    $this->post('/logout')->assertRedirect('/');

    $secret = 'JBSWY3DPEHPK3PXP';
    $superAdmin = User::query()->where('email', 'super_admin@admin.com')->firstOrFail();
    $superAdmin->forceFill([
        'two_factor_secret' => encrypt($secret),
        'two_factor_recovery_codes' => encrypt(json_encode(['phase8-recovery-code'])),
        'two_factor_confirmed_at' => now(),
    ])->save();

    $this->post('/admin/login', [
        'email' => 'super_admin@admin.com',
        'password' => 'superadmin',
    ])->assertRedirect('/two-factor-challenge');

    $this->post('/two-factor-challenge', [
        'code' => app(Google2FA::class)->getCurrentOtp($secret),
    ])->assertRedirect('/admin/dashboard');

    $this->get('/admin/dashboard')->assertOk();
    $this->get('/agency/dashboard')->assertForbidden();
});
