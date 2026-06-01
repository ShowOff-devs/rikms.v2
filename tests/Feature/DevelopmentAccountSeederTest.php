<?php

use App\Models\Agency;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DevelopmentAccountSeeder;
use Illuminate\Support\Facades\Hash;

test('development account seeder creates the agency admin account', function () {
    $this->seed(DevelopmentAccountSeeder::class);

    $agencyAdmin = User::query()
        ->where('email', 'agency@admin.com')
        ->with(['agency', 'roles'])
        ->first();

    expect($agencyAdmin)->not->toBeNull()
        ->and(Hash::check('agency admin', $agencyAdmin->password))->toBeTrue()
        ->and($agencyAdmin->status)->toBe('active')
        ->and($agencyAdmin->email_verified_at)->not->toBeNull()
        ->and($agencyAdmin->agency?->slug)->toBe('dost-xi')
        ->and($agencyAdmin->hasRole('agency_admin'))->toBeTrue()
        ->and($agencyAdmin->two_factor_secret)->toBeNull()
        ->and($agencyAdmin->two_factor_recovery_codes)->toBeNull()
        ->and($agencyAdmin->two_factor_confirmed_at)->toBeNull();
});

test('development account seeder creates the super admin account without storing an auth code', function () {
    $this->seed(DevelopmentAccountSeeder::class);

    $superAdmin = User::query()
        ->where('email', 'super_admin@admin.com')
        ->with('roles')
        ->first();

    expect($superAdmin)->not->toBeNull()
        ->and(Hash::check('superadmin', $superAdmin->password))->toBeTrue()
        ->and($superAdmin->status)->toBe('active')
        ->and($superAdmin->email_verified_at)->not->toBeNull()
        ->and($superAdmin->agency_id)->toBeNull()
        ->and($superAdmin->hasRole('super_admin'))->toBeTrue()
        ->and($superAdmin->two_factor_secret)->toBeNull()
        ->and($superAdmin->two_factor_recovery_codes)->toBeNull()
        ->and($superAdmin->two_factor_confirmed_at)->toBeNull();
});

test('development account seeder is idempotent', function () {
    $this->seed(DevelopmentAccountSeeder::class);
    $this->seed(DevelopmentAccountSeeder::class);

    expect(User::query()->where('email', 'agency@admin.com')->count())->toBe(1)
        ->and(User::query()->where('email', 'super_admin@admin.com')->count())->toBe(1)
        ->and(Role::query()->where('slug', 'agency_admin')->count())->toBe(1)
        ->and(Role::query()->where('slug', 'super_admin')->count())->toBe(1)
        ->and(Agency::query()->where('slug', 'dost-xi')->count())->toBe(1);

    $superAdmin = User::query()->where('email', 'super_admin@admin.com')->firstOrFail();
    $superAdminRole = Role::query()->where('slug', 'super_admin')->firstOrFail();
    $agencyAdmin = User::query()->where('email', 'agency@admin.com')->firstOrFail();
    $agencyAdminRole = Role::query()->where('slug', 'agency_admin')->firstOrFail();

    expect($superAdmin->roles()->whereKey($superAdminRole->id)->count())->toBe(1)
        ->and($agencyAdmin->roles()->whereKey($agencyAdminRole->id)->count())->toBe(1);
});

test('development account seeder reuses an existing dost agency', function () {
    $existingAgency = Agency::query()->create([
        'slug' => 'dost',
        'name' => 'Department of Science and Technology Region XI',
        'short_name' => 'DOST',
        'type' => 'Government Agency',
        'status' => 'inactive',
    ]);

    $this->seed(DevelopmentAccountSeeder::class);

    expect(Agency::query()->count())->toBe(1)
        ->and($existingAgency->fresh()->slug)->toBe('dost-xi')
        ->and($existingAgency->fresh()->status)->toBe('active');
});

test('seeded super admin can authenticate through the admin portal flow', function () {
    $this->seed(DevelopmentAccountSeeder::class);

    $superAdmin = User::query()->where('email', 'super_admin@admin.com')->firstOrFail();

    $this->get('/admin/login')->assertOk();

    $this->post(route('login.store'), [
        'email' => 'super_admin@admin.com',
        'password' => 'superadmin',
        'authentication_code' => '123456',
    ]);

    $this->assertAuthenticatedAs($superAdmin);
    $this->get('/admin/dashboard')->assertOk();
    $this->get('/agency/dashboard')->assertForbidden();
});
