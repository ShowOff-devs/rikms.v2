<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentAccountSeeder extends Seeder
{
    private const ALLOWED_ENVIRONMENTS = ['local', 'testing', 'pilot'];

    /**
     * Seed local and pilot-only development accounts.
     */
    public function run(): void
    {
        if (! $this->canSeedDevelopmentAccounts()) {
            $this->command?->warn('Skipped development account seeding outside local/testing/pilot environments.');

            return;
        }

        $dostAgency = $this->findOrCreateDostAgency();
        $superAdminRole = $this->findOrCreateRole(
            'super_admin',
            'Super Admin',
            'Regionwide platform administrator with full system access.',
        );
        $agencyAdminRole = $this->findOrCreateRole(
            'agency_admin',
            'Agency Admin',
            'Agency-level administrator for research uploads and access requests.',
        );

        $superAdmin = $this->findOrCreateUser('super_admin@admin.com', [
            'agency_id' => null,
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'name' => 'Super Admin',
            'password' => Hash::make('superadmin'),
            'role' => 'super_admin',
            'status' => 'active',
            'email_verified_at' => now(),
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $superAdmin->roles()->syncWithoutDetaching([
            $superAdminRole->id => ['assigned_at' => now()],
        ]);

        $agencyAdmin = $this->findOrCreateUser('agency@admin.com', [
            'agency_id' => $dostAgency->id,
            'first_name' => 'Agency',
            'last_name' => 'Admin',
            'name' => 'Agency Admin',
            'password' => Hash::make('agency admin'),
            'role' => 'agency_admin',
            'status' => 'active',
            'email_verified_at' => now(),
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $agencyAdmin->roles()->syncWithoutDetaching([
            $agencyAdminRole->id => ['assigned_at' => now()],
        ]);

        $this->command?->info('Development account seeding completed.');
    }

    private function canSeedDevelopmentAccounts(): bool
    {
        return app()->environment(self::ALLOWED_ENVIRONMENTS)
            || (bool) config('rikms.dev_seed_accounts.allow_outside_safe_environments', false);
    }

    private function findOrCreateDostAgency(): Agency
    {
        $agency = Agency::withTrashed()
            ->whereIn('slug', ['dost', 'dost-xi'])
            ->orWhereIn('short_name', ['DOST', 'DOST XI'])
            ->orWhere('name', 'like', '%Department of Science and Technology%')
            ->orWhere('full_name', 'like', '%Department of Science and Technology%')
            ->first();

        if (! $agency) {
            $agency = new Agency;
        }

        if ($agency->trashed()) {
            $agency->restore();
        }

        $agency->forceFill([
            'slug' => 'dost-xi',
            'name' => 'Department of Science and Technology XI',
            'short_name' => 'DOST XI',
            'full_name' => 'Department of Science and Technology XI',
            'type' => 'Government Agency',
            'status' => 'active',
        ])->save();

        return $agency;
    }

    private function findOrCreateRole(string $slug, string $name, string $description): Role
    {
        $role = Role::withTrashed()
            ->where('slug', $slug)
            ->orWhere('name', $name)
            ->first();

        if (! $role) {
            $role = new Role;
        }

        if ($role->trashed()) {
            $role->restore();
        }

        $role->forceFill([
            'slug' => $slug,
            'name' => $name,
            'display_name' => $name,
            'description' => $description,
            'is_system' => true,
            'is_active' => true,
        ])->save();

        return $role;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function findOrCreateUser(string $email, array $attributes): User
    {
        $user = User::query()->firstOrNew(['email' => $email]);

        $user->forceFill($attributes)->save();

        return $user;
    }
}
