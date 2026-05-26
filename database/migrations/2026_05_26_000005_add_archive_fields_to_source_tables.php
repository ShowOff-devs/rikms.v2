<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['users', 'agencies', 'research', 'access_requests'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if ($tableName === 'users' && ! Schema::hasColumn($tableName, 'deleted_at')) {
                    $table->softDeletes();
                }

                if (! Schema::hasColumn($tableName, 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->index($tableName.'_archived_at_index');
                }

                if (! Schema::hasColumn($tableName, 'archived_by')) {
                    $table->unsignedBigInteger('archived_by')->nullable()->index($tableName.'_archived_by_index');
                }

                if (! Schema::hasColumn($tableName, 'archive_reason')) {
                    $table->text('archive_reason')->nullable();
                }

                if (! Schema::hasColumn($tableName, 'restored_at')) {
                    $table->timestamp('restored_at')->nullable()->index($tableName.'_restored_at_index');
                }

                if (! Schema::hasColumn($tableName, 'restored_by')) {
                    $table->unsignedBigInteger('restored_by')->nullable()->index($tableName.'_restored_by_index');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['access_requests', 'research', 'agencies', 'users'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                foreach (['restored_by', 'restored_at', 'archived_by', 'archived_at'] as $column) {
                    if (Schema::hasColumn($tableName, $column)) {
                        $table->dropIndex($tableName.'_'.$column.'_index');
                    }
                }

                foreach (['restored_by', 'restored_at', 'archive_reason', 'archived_by', 'archived_at'] as $column) {
                    if (Schema::hasColumn($tableName, $column)) {
                        $table->dropColumn($column);
                    }
                }

                if ($tableName === 'users' && Schema::hasColumn($tableName, 'deleted_at')) {
                    $table->dropSoftDeletes();
                }
            });
        }
    }
};
