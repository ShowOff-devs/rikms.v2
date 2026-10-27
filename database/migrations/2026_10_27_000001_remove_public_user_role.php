<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Retain any legacy accounts for audit purposes, but make them inactive
        // and remove the obsolete role identifier without granting new access.
        DB::table('users')
            ->where('role', 'public_user')
            ->update([
                'role' => 'retired',
                'status' => 'inactive',
                'updated_at' => now(),
            ]);

        $roleIds = DB::table('roles')
            ->where('slug', 'public_user')
            ->pluck('id');

        if ($roleIds->isEmpty()) {
            return;
        }

        DB::table('role_user')->whereIn('role_id', $roleIds)->delete();
        DB::table('permission_role')->whereIn('role_id', $roleIds)->delete();
        DB::table('roles')->whereIn('id', $roleIds)->delete();
    }

    public function down(): void
    {
        DB::table('roles')->insertOrIgnore([
            'slug' => 'public_user',
            'name' => 'Public User',
            'display_name' => 'Public User',
            'description' => 'Authenticated public user.',
            'is_system' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
