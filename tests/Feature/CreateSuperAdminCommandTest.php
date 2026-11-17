<?php

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

function createBootstrapSuperAdminRole(array $attributes = []): Role
{
    return Role::query()->create(array_merge([
        'slug' => 'super_admin',
        'name' => 'Super Admin',
        'display_name' => 'Super Admin',
        'description' => 'Regionwide platform administrator with full system access.',
        'access_scope' => 'system',
        'is_system' => true,
        'is_active' => true,
    ], $attributes));
}

function superAdminCommand(
    string $email = 'admin@example.com',
    string $password = 'Strong!Password123',
    ?string $confirmation = null,
) {
    return test()->artisan('rikms:create-super-admin')
        ->expectsQuestion('First name', 'System')
        ->expectsQuestion('Last name', 'Administrator')
        ->expectsQuestion('Email address', $email)
        ->expectsQuestion('Password', $password)
        ->expectsQuestion('Confirm password', $confirmation ?? $password);
}

beforeEach(function () {
    createBootstrapSuperAdminRole();
});

test('it securely creates the initial super admin with the canonical role assignment', function () {
    superAdminCommand('  ADMIN@Example.COM  ')
        ->expectsOutputToContain('Super Admin account created successfully.')
        ->expectsOutputToContain('Email: admin@example.com')
        ->assertSuccessful();

    $user = User::query()->where('email', 'admin@example.com')->firstOrFail();

    expect($user->first_name)->toBe('System')
        ->and($user->last_name)->toBe('Administrator')
        ->and($user->name)->toBe('System Administrator')
        ->and($user->agency_id)->toBeNull()
        ->and($user->role)->toBe('super_admin')
        ->and($user->status)->toBe('active')
        ->and($user->mfa_required)->toBeTrue()
        ->and($user->email_verified_at)->toBeNull()
        ->and($user->two_factor_secret)->toBeNull()
        ->and($user->two_factor_recovery_codes)->toBeNull()
        ->and($user->two_factor_confirmed_at)->toBeNull()
        ->and($user->isSuperAdmin())->toBeTrue()
        ->and($user->canAccessAdminPortal())->toBeTrue()
        ->and($user->hasPermission('dashboard.view'))->toBeTrue()
        ->and($user->isAgencyAdmin())->toBeFalse()
        ->and($user->isActive())->toBeTrue()
        ->and($user->requiresAdminMfa())->toBeTrue()
        ->and($user->adminAccessScope())->toBe('system')
        ->and($user->roles()->where('slug', 'super_admin')->exists())->toBeTrue()
        ->and($user->roles()->where('slug', 'super_admin')->firstOrFail()->is_active)->toBeTrue()
        ->and($user->roles()->firstOrFail()->pivot->assigned_at)->not->toBeNull()
        ->and($user->roles()->firstOrFail()->pivot->assigned_by)->toBeNull()
        ->and(Hash::check('Strong!Password123', $user->password))->toBeTrue()
        ->and($user->password)->not->toBe('Strong!Password123');
});

test('it writes a secret-free bootstrap audit record', function () {
    superAdminCommand()->assertSuccessful();

    $user = User::query()->where('email', 'admin@example.com')->firstOrFail();
    $audit = AuditLog::query()->where('event', 'super_admin.bootstrap_created')->firstOrFail();

    expect($audit->user_id)->toBeNull()
        ->and($audit->auditable_type)->toBe($user->getMorphClass())
        ->and($audit->auditable_id)->toBe($user->id)
        ->and($audit->new_values)->toMatchArray([
            'email' => 'admin@example.com',
            'role' => 'super_admin',
            'status' => 'active',
            'mfa_required' => true,
        ])
        ->and($audit->metadata)->toMatchArray([
            'source' => 'artisan_cli',
            'actor' => 'system_bootstrap',
            'assigned_role' => 'super_admin',
        ])
        ->and(json_encode([$audit->new_values, $audit->metadata]))
        ->not->toContain('Strong!Password123');
});

test('its first admin login sends verification mail while mfa enrollment remains required', function () {
    Notification::fake();
    superAdminCommand()->assertSuccessful();

    $user = User::query()->where('email', 'admin@example.com')->firstOrFail();

    $this->post('/admin/login', [
        'email' => 'admin@example.com',
        'password' => 'Strong!Password123',
    ])->assertRedirect(route('two-factor.show', absolute: false));

    Notification::assertSentTo($user, VerifyEmail::class);

    expect($user->fresh()->email_verified_at)->toBeNull()
        ->and($user->fresh()->hasEnabledTwoFactorAuthentication())->toBeFalse()
        ->and($user->fresh()->mfa_required)->toBeTrue();
});

test('it fails actionably when the super admin role is missing', function () {
    Role::query()->where('slug', 'super_admin')->forceDelete();

    $this->artisan('rikms:create-super-admin')
        ->expectsOutputToContain('Run: php artisan db:seed --class=RoleSeeder')
        ->assertFailed();

    expect(User::query()->count())->toBe(0);
});

test('it fails when the super admin role is inactive', function () {
    Role::query()->where('slug', 'super_admin')->update(['is_active' => false]);

    $this->artisan('rikms:create-super-admin')
        ->expectsOutputToContain('Super Admin role is inactive')
        ->assertFailed();

    expect(User::query()->count())->toBe(0);
});

test('an existing canonical super admin assignment blocks provisioning regardless of account status', function () {
    $existing = User::factory()->create([
        'role' => 'other',
        'status' => 'inactive',
        'archived_at' => now(),
    ]);
    $existing->roles()->attach(Role::query()->where('slug', 'super_admin')->firstOrFail(), [
        'assigned_at' => now(),
    ]);
    $existing->delete();

    superAdminCommand()
        ->expectsOutputToContain('A Super Admin account already exists')
        ->assertFailed();

    expect(User::withTrashed()->count())->toBe(1);
});

test('an existing legacy super admin field blocks provisioning', function () {
    User::factory()->create(['role' => 'super_admin']);

    superAdminCommand()->assertFailed();

    expect(User::query()->count())->toBe(1);
});

test('an existing email including a soft deleted account blocks provisioning case insensitively', function () {
    User::factory()->create([
        'email' => 'Admin@Example.com',
        'role' => 'agency_admin',
    ])->delete();

    superAdminCommand('ADMIN@example.COM')
        ->expectsOutputToContain('email address is already in use')
        ->assertFailed();

    expect(User::withTrashed()->count())->toBe(1);
});

test('a weak password is rejected without creating an account', function () {
    superAdminCommand(password: 'weak-password')
        ->assertFailed();

    expect(User::query()->count())->toBe(0);
});

test('a password confirmation mismatch is rejected without creating an account', function () {
    superAdminCommand(confirmation: 'Different!Password123')
        ->expectsOutputToContain('confirmation does not match')
        ->assertFailed();

    expect(User::query()->count())->toBe(0);
});

test('a role assignment failure rolls back the account and audit record', function () {
    DB::statement("CREATE TRIGGER fail_super_admin_role_assignment BEFORE INSERT ON role_user BEGIN SELECT RAISE(FAIL, 'simulated role assignment failure'); END");

    superAdminCommand()->assertFailed();

    expect(User::query()->count())->toBe(0)
        ->and(AuditLog::query()->count())->toBe(0);
});

test('a failed effective authorization check rolls back the account and assignment', function () {
    DB::statement('CREATE TRIGGER disable_assigned_super_admin_role AFTER INSERT ON role_user BEGIN UPDATE roles SET is_active = 0 WHERE id = NEW.role_id; END');

    superAdminCommand()
        ->expectsOutputToContain('failed the RIKMS authorization verification')
        ->assertFailed();

    expect(User::query()->count())->toBe(0)
        ->and(DB::table('role_user')->count())->toBe(0)
        ->and(Role::query()->where('slug', 'super_admin')->value('is_active'))->toBeTrue()
        ->and(AuditLog::query()->count())->toBe(0);
});

test('an audit failure rolls back the account and role assignment', function () {
    DB::statement("CREATE TRIGGER fail_super_admin_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(FAIL, 'simulated audit failure'); END");

    superAdminCommand()->assertFailed();

    expect(User::query()->count())->toBe(0)
        ->and(DB::table('role_user')->count())->toBe(0);
});

test('repeated execution cannot create another administrator', function () {
    superAdminCommand()->assertSuccessful();

    superAdminCommand('second-admin@example.com')
        ->expectsOutputToContain('A Super Admin account already exists')
        ->assertFailed();

    expect(User::query()->where('role', 'super_admin')->count())->toBe(1)
        ->and(DB::table('role_user')->where('role_id', Role::query()->where('slug', 'super_admin')->value('id'))->count())->toBe(1);
});
