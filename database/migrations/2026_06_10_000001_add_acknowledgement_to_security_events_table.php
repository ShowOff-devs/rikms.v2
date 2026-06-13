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
        Schema::table('security_events', function (Blueprint $table) {
            if (! Schema::hasColumn('security_events', 'acknowledged_at')) {
                $table->timestamp('acknowledged_at')->nullable()->after('resolved_by');
                $table->index('acknowledged_at', 'security_events_acknowledged_at_index');
            }

            if (! Schema::hasColumn('security_events', 'acknowledged_by')) {
                $table->foreignId('acknowledged_by')
                    ->nullable()
                    ->after('acknowledged_at')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('security_events', function (Blueprint $table) {
            if (Schema::hasColumn('security_events', 'acknowledged_by')) {
                $table->dropConstrainedForeignId('acknowledged_by');
            }

            if (Schema::hasColumn('security_events', 'acknowledged_at')) {
                $table->dropIndex('security_events_acknowledged_at_index');
                $table->dropColumn('acknowledged_at');
            }
        });
    }
};
