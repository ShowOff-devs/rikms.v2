<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Support\Statuses;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Throwable;

class CreateSuperAdmin extends Command
{
    protected $signature = 'rikms:create-super-admin';

    protected $description = 'Securely create the initial RIKMS Super Admin account';

    public function handle(): int
    {
        if (! $this->databaseIsReady()) {
            return self::FAILURE;
        }

        $roleState = $this->superAdminRoleState();

        if ($roleState !== null) {
            $this->error($roleState);

            return self::FAILURE;
        }

        $input = [
            'first_name' => trim((string) $this->ask('First name')),
            'last_name' => trim((string) $this->ask('Last name')),
            'email' => Str::lower(trim((string) $this->ask('Email address'))),
            'password' => (string) $this->secret('Password'),
            'password_confirmation' => (string) $this->secret('Confirm password'),
        ];

        $validator = Validator::make($input, [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (User::withTrashed()->whereRaw('LOWER(email) = ?', [Str::lower((string) $value)])->exists()) {
                        $fail('The email address is already in use.');
                    }
                },
            ],
            'password' => [
                'required',
                'string',
                'max:255',
                Password::min(12)->mixedCase()->letters()->numbers()->symbols(),
                'confirmed',
            ],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        try {
            /** @var User $user */
            $user = DB::transaction(function () use ($input): User {
                // The seeded system role is the serialization point for concurrent bootstrap attempts.
                $role = Role::withTrashed()
                    ->where('slug', 'super_admin')
                    ->lockForUpdate()
                    ->first();

                if (! $role || $role->trashed()) {
                    throw new ProvisioningException(
                        'The Super Admin role is missing. Run: php artisan db:seed --class=RoleSeeder',
                    );
                }

                if (! $role->is_active) {
                    throw new ProvisioningException('The Super Admin role is inactive. Activate it before provisioning.');
                }

                $hasExistingSuperAdmin = User::withTrashed()
                    ->where(function (Builder $query) use ($role): void {
                        $query->where('role', 'super_admin')
                            ->orWhereHas('roles', fn (Builder $roles): Builder => $roles->whereKey($role->getKey()));
                    })
                    ->exists();

                if ($hasExistingSuperAdmin) {
                    throw new ProvisioningException(
                        'A Super Admin account already exists. Initial provisioning has been blocked.',
                    );
                }

                if (User::withTrashed()->whereRaw('LOWER(email) = ?', [$input['email']])->exists()) {
                    throw new ProvisioningException('The email address is already in use.');
                }

                $user = User::query()->create([
                    'agency_id' => null,
                    'first_name' => $input['first_name'],
                    'last_name' => $input['last_name'],
                    'name' => $input['first_name'].' '.$input['last_name'],
                    'email' => $input['email'],
                    'email_verified_at' => null,
                    'password' => $input['password'],
                    'role' => 'super_admin',
                    'status' => Statuses::USER_ACTIVE,
                    'mfa_required' => true,
                ]);

                $assignedAt = now();

                $user->roles()->attach($role->getKey(), [
                    'assigned_by' => null,
                    'assigned_at' => $assignedAt,
                ]);

                $user = $user->fresh(['roles']);

                if (! $user
                    || ! $user->roles->contains(fn (Role $assignedRole): bool => $assignedRole->getKey() === $role->getKey() && $assignedRole->is_active)
                    || ! $user->isSuperAdmin()
                    || ! $user->canAccessAdminPortal()
                    || ! $user->hasPermission('dashboard.view')
                    || $user->isAgencyAdmin()
                    || ! $user->isActive()
                    || ! $user->requiresAdminMfa()
                    || $user->adminAccessScope() !== 'system') {
                    throw new ProvisioningException(
                        'The account failed the RIKMS authorization verification. No account was created.',
                    );
                }

                AuditLog::query()->create([
                    'user_id' => null,
                    'agency_id' => null,
                    'event' => 'super_admin.bootstrap_created',
                    'auditable_type' => $user->getMorphClass(),
                    'auditable_id' => $user->getKey(),
                    'old_values' => null,
                    'new_values' => [
                        'id' => $user->getKey(),
                        'email' => $user->email,
                        'role' => 'super_admin',
                        'status' => $user->status,
                        'mfa_required' => true,
                    ],
                    'metadata' => [
                        'source' => 'artisan_cli',
                        'actor' => 'system_bootstrap',
                        'assigned_role' => 'super_admin',
                        'assigned_at' => $assignedAt->toIso8601String(),
                    ],
                    'created_at' => $assignedAt,
                ]);

                return $user;
            }, 3);
        } catch (ProvisioningException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Super Admin provisioning failed. No account was created. Review the application log for details.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('RIKMS — INITIAL SUPER ADMIN SETUP');
        $this->newLine();
        $this->info('Super Admin account created successfully.');
        $this->newLine();
        $this->line("Email: {$user->email}");
        $this->line('Role: super_admin');
        $this->line('Status: active');
        $this->line('MFA Required: Yes');
        $this->newLine();
        $this->line('Next Steps:');
        $this->line('1. Sign in through the Super Admin login page.');
        $this->line('2. Complete email verification.');
        $this->line('3. Complete MFA enrollment.');
        $this->line('4. Verify access to the Super Admin dashboard.');

        return self::SUCCESS;
    }

    private function databaseIsReady(): bool
    {
        try {
            DB::connection()->getPdo();

            $requiredColumns = [
                'users' => ['id', 'agency_id', 'first_name', 'last_name', 'name', 'email', 'email_verified_at', 'password', 'role', 'status', 'mfa_required', 'deleted_at'],
                'roles' => ['id', 'slug', 'is_active', 'deleted_at'],
                'role_user' => ['user_id', 'role_id', 'assigned_by', 'assigned_at'],
                'audit_logs' => ['user_id', 'event', 'auditable_type', 'auditable_id', 'new_values', 'metadata', 'created_at'],
            ];

            foreach ($requiredColumns as $table => $columns) {
                if (! Schema::hasTable($table) || ! Schema::hasColumns($table, $columns)) {
                    $this->error("Required database schema is missing for [{$table}]. Run: php artisan migrate --force");

                    return false;
                }
            }
        } catch (Throwable $exception) {
            report($exception);
            $this->error('The database is unavailable or its schema cannot be inspected. Check the database configuration and connectivity.');

            return false;
        }

        return true;
    }

    private function superAdminRoleState(): ?string
    {
        try {
            $role = Role::withTrashed()->where('slug', 'super_admin')->first();
        } catch (Throwable $exception) {
            report($exception);

            return 'The Super Admin role could not be read. Confirm migrations have completed.';
        }

        if (! $role || $role->trashed()) {
            return 'The Super Admin role is missing. Run: php artisan db:seed --class=RoleSeeder';
        }

        if (! $role->is_active) {
            return 'The Super Admin role is inactive. Activate it before provisioning.';
        }

        return null;
    }
}

class ProvisioningException extends \RuntimeException {}
