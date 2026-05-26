<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (! Schema::hasColumn('roles', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('name');
            }

            if (! Schema::hasColumn('roles', 'is_system')) {
                $table->boolean('is_system')->default(false)->after('description');
            }

            if (! Schema::hasColumn('roles', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_system');
            }

            if (! Schema::hasColumn('roles', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        $usedRoleSlugs = [];

        DB::table('roles')
            ->orderBy('id')
            ->get(['id', 'name'])
            ->each(function (object $role) use (&$usedRoleSlugs): void {
                $baseSlug = Str::slug((string) $role->name, '_') ?: 'role_'.$role->id;
                $slug = $baseSlug;
                $counter = 2;

                while (in_array($slug, $usedRoleSlugs, true)) {
                    $slug = $baseSlug.'_'.$counter;
                    $counter++;
                }

                $usedRoleSlugs[] = $slug;

                DB::table('roles')
                    ->where('id', $role->id)
                    ->whereNull('slug')
                    ->update(['slug' => $slug]);
            });

        Schema::table('permissions', function (Blueprint $table) {
            if (! Schema::hasColumn('permissions', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('name');
            }

            if (! Schema::hasColumn('permissions', 'module')) {
                $table->string('module')->nullable()->after('slug');
                $table->index('module', 'permissions_module_index');
            }
        });

        $usedPermissionSlugs = [];

        DB::table('permissions')
            ->orderBy('id')
            ->get(['id', 'name'])
            ->each(function (object $permission) use (&$usedPermissionSlugs): void {
                $baseSlug = Str::slug((string) $permission->name, '_') ?: 'permission_'.$permission->id;
                $slug = $baseSlug;
                $counter = 2;

                while (in_array($slug, $usedPermissionSlugs, true)) {
                    $slug = $baseSlug.'_'.$counter;
                    $counter++;
                }

                $usedPermissionSlugs[] = $slug;

                DB::table('permissions')
                    ->where('id', $permission->id)
                    ->whereNull('slug')
                    ->update(['slug' => $slug]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            if (Schema::hasColumn('permissions', 'module')) {
                $table->dropIndex('permissions_module_index');
                $table->dropColumn('module');
            }

            if (Schema::hasColumn('permissions', 'slug')) {
                $table->dropUnique('permissions_slug_unique');
                $table->dropColumn('slug');
            }
        });

        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'deleted_at')) {
                $table->dropSoftDeletes();
            }

            foreach (['is_active', 'is_system'] as $column) {
                if (Schema::hasColumn('roles', $column)) {
                    $table->dropColumn($column);
                }
            }

            if (Schema::hasColumn('roles', 'slug')) {
                $table->dropUnique('roles_slug_unique');
                $table->dropColumn('slug');
            }
        });
    }
};
