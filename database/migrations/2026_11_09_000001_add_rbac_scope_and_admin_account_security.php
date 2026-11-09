<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('access_scope', 20)->default('system')->after('description');
            $table->index(['access_scope', 'is_active'], 'roles_scope_active_index');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('mfa_required')->default(false)->after('status');
        });

        DB::table('roles')->where('slug', 'agency_admin')->update(['access_scope' => 'agency']);
        DB::table('users')->where('role', 'super_admin')->update(['mfa_required' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('mfa_required');
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->dropIndex('roles_scope_active_index');
            $table->dropColumn('access_scope');
        });
    }
};
