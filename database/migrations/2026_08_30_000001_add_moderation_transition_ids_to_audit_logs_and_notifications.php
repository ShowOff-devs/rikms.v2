<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->uuid('transition_id')->nullable()->after('id');
            $table->index('transition_id', 'audit_logs_transition_id_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->uuid('transition_id')->nullable()->after('id');
            $table->unique('transition_id', 'notifications_transition_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropUnique('notifications_transition_id_unique');
            $table->dropColumn('transition_id');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_transition_id_index');
            $table->dropColumn('transition_id');
        });
    }
};
