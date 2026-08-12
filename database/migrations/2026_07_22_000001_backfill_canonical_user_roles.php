<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNotNull('role')
            ->where('role', '!=', '')
            ->whereNotExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('role_user')
                ->whereColumn('role_user.user_id', 'users.id'))
            ->orderBy('id')
            ->eachById(function (object $user): void {
                $roleId = DB::table('roles')
                    ->where('slug', $user->role)
                    ->whereNull('deleted_at')
                    ->value('id');

                if (! $roleId) {
                    return;
                }

                DB::table('role_user')->insertOrIgnore([
                    'user_id' => $user->id,
                    'role_id' => $roleId,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        // A role assignment cannot be distinguished safely from later edits.
    }
};
