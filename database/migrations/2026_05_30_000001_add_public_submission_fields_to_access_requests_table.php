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
        Schema::table('access_requests', function (Blueprint $table) {
            $table->string('requester_affiliation')->nullable()->after('requester_email');
            $table->text('message')->nullable()->after('purpose');
            $table->text('intended_use')->nullable()->after('message');
            $table->timestamp('requested_at')->nullable()->after('status');

            $table->index(['research_id', 'status'], 'access_requests_research_status_index');
            $table->index(['requester_email', 'status'], 'access_requests_email_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table) {
            $table->dropIndex('access_requests_research_status_index');
            $table->dropIndex('access_requests_email_status_index');
            $table->dropColumn([
                'requester_affiliation',
                'message',
                'intended_use',
                'requested_at',
            ]);
        });
    }
};
