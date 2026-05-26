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
        Schema::table('users', function (Blueprint $table) {
            $table->index('status', 'users_status_index');
            $table->index('created_at', 'users_created_at_index');
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->index('status', 'agencies_status_index');
            $table->index('created_at', 'agencies_created_at_index');
        });

        Schema::table('research', function (Blueprint $table) {
            if (! Schema::hasColumn('research', 'published_at')) {
                $table->timestamp('published_at')->nullable();
            }

            $table->index('status', 'research_status_index');
            $table->index('publication_year', 'research_publication_year_index');
            $table->index('access_level', 'research_access_level_index');
            $table->index('created_at', 'research_created_at_index');
            $table->index('published_at', 'research_published_at_index');
        });

        Schema::table('access_requests', function (Blueprint $table) {
            $table->index('status', 'access_requests_status_index');
            $table->index('created_at', 'access_requests_created_at_index');
        });

        Schema::table('research_approvals', function (Blueprint $table) {
            $table->index('status', 'research_approvals_status_index');
            $table->index('created_at', 'research_approvals_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('research_approvals', function (Blueprint $table) {
            $table->dropIndex('research_approvals_created_at_index');
            $table->dropIndex('research_approvals_status_index');
        });

        Schema::table('access_requests', function (Blueprint $table) {
            $table->dropIndex('access_requests_created_at_index');
            $table->dropIndex('access_requests_status_index');
        });

        Schema::table('research', function (Blueprint $table) {
            $table->dropIndex('research_published_at_index');
            $table->dropIndex('research_created_at_index');
            $table->dropIndex('research_access_level_index');
            $table->dropIndex('research_publication_year_index');
            $table->dropIndex('research_status_index');

            if (Schema::hasColumn('research', 'published_at')) {
                $table->dropColumn('published_at');
            }
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->dropIndex('agencies_created_at_index');
            $table->dropIndex('agencies_status_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_created_at_index');
            $table->dropIndex('users_status_index');
        });
    }
};
