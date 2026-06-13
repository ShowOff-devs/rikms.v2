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
        Schema::create('research_analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('research_id')->constrained('research')->cascadeOnDelete();
            $table->foreignId('agency_id')->nullable()->constrained('agencies')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('research_file_id')->nullable()->constrained('research_files')->nullOnDelete();
            $table->string('event_type', 32);
            $table->string('source', 32)->default('public');
            $table->string('session_hash', 128)->nullable();
            $table->string('ip_hash', 128)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();

            $table->index(['event_type', 'occurred_at'], 'research_analytics_events_type_occurred_index');
            $table->index(['research_id', 'event_type'], 'research_analytics_events_research_type_index');
            $table->index('agency_id', 'research_analytics_events_agency_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('research_analytics_events');
    }
};
