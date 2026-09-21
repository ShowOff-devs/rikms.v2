<?php

use App\Models\Role;
use App\Models\User;
use App\Services\BackupReadinessService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\PlatformSettingSeeder;
use Database\Seeders\RoleSeeder;

function backupPreparationSuperAdmin(): User
{
    test()->seed([RoleSeeder::class, PermissionSeeder::class, PlatformSettingSeeder::class]);
    $role = Role::query()->where('slug', 'super_admin')->firstOrFail();
    $user = User::factory()->create([
        'role' => 'super_admin',
        'status' => 'active',
        'email_verified_at' => now(),
        'two_factor_secret' => encrypt('backup-test-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['backup-recovery-code'])),
        'two_factor_confirmed_at' => now(),
    ]);
    $user->roles()->syncWithoutDetaching([$role->id => ['assigned_at' => now()]]);

    return $user;
}

test('backup readiness starts safely disabled without a destination or key', function () {
    config()->set([
        'backup.execution_enabled' => false,
        'backup.destination_path' => null,
        'backup.encryption_key' => null,
    ]);

    $status = app(BackupReadinessService::class)->inspect();

    expect($status['status'])->toBe('destination_not_configured')
        ->and($status['ready_for_test_backup'])->toBeFalse()
        ->and($status['execution_enabled'])->toBeFalse()
        ->and($status['destination']['display'])->toBe('Not configured')
        ->and($status['encryption_key_configured'])->toBeFalse();
});

test('application directories are rejected as backup destinations', function () {
    config()->set([
        'backup.destination_path' => storage_path('app/private'),
        'backup.encryption_key' => str_repeat('k', 32),
        'backup.minimum_free_space_mb' => 1,
    ]);

    $status = app(BackupReadinessService::class)->inspect();

    expect($status['status'])->toBe('destination_is_not_external')
        ->and($status['ready_for_test_backup'])->toBeFalse()
        ->and($status['destination']['outside_application'])->toBeFalse();
});

test('a writable external path and dedicated key become ready only for a test backup', function () {
    $destination = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rikms-backup-readiness-'.str()->uuid();
    mkdir($destination, 0700, true);

    try {
        config()->set([
            'backup.execution_enabled' => false,
            'backup.destination_path' => $destination,
            'backup.encryption_key' => 'base64:'.base64_encode(random_bytes(32)),
            'backup.minimum_free_space_mb' => 1,
            'backup.require_separate_filesystem' => false,
        ]);

        $status = app(BackupReadinessService::class)->inspect(true);

        expect($status['status'])->toBe('ready_for_test_backup')
            ->and($status['ready_for_test_backup'])->toBeTrue()
            ->and($status['execution_enabled'])->toBeFalse()
            ->and($status['destination']['display'])->not->toBe($destination)
            ->and($status['destination']['writable'])->toBeTrue()
            ->and($status['encryption_key_configured'])->toBeTrue()
            ->and($status['write_probe']['performed'])->toBeTrue()
            ->and($status['write_probe']['succeeded'])->toBeTrue()
            ->and(glob($destination.DIRECTORY_SEPARATOR.'.rikms-backup-health-*'))->toBe([]);
    } finally {
        rmdir($destination);
    }
});

test('backup readiness API is protected and never exposes secrets or full paths', function () {
    $admin = backupPreparationSuperAdmin();
    $secret = str_repeat('s', 32);
    config()->set([
        'backup.destination_path' => 'Z:/Sensitive/RIKMS-Backups',
        'backup.encryption_key' => $secret,
    ]);

    $this->getJson('/api/admin/platform-settings/backup-readiness')->assertUnauthorized();

    $response = $this->actingAs($admin)
        ->getJson('/api/admin/platform-settings/backup-readiness')
        ->assertOk()
        ->assertJsonPath('data.status', 'destination_not_connected')
        ->assertJsonPath('data.destination.display', 'Z:/…/RIKMS-Backups')
        ->assertJsonPath('data.encryption_key_configured', true);

    expect($response->getContent())->not->toContain($secret)
        ->not->toContain('Sensitive');
});

test('backup preparation settings save valid schedule label and retention only', function () {
    $admin = backupPreparationSuperAdmin();

    $this->actingAs($admin)
        ->postJson('/api/admin/platform-settings/bulk-update', [
            'settings' => [
                'backup.frequency' => 'Weekly on Sunday',
                'backup.destination_label' => 'Pilot External Drive',
                'backup.retention_days' => 45,
            ],
        ])
        ->assertOk()
        ->assertJsonPath('meta.updated_count', 3);

    $this->actingAs($admin)
        ->postJson('/api/admin/platform-settings/bulk-update', [
            'settings' => ['backup.last_backup_at' => now()->toISOString()],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['settings.backup.last_backup_at']);
});
