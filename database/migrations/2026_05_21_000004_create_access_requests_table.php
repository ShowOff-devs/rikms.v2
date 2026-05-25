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
        Schema::create('access_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('research_id')
                ->constrained('research')
                ->cascadeOnDelete();

            $table->foreignId('requested_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('agency_id')
                ->nullable()
                ->constrained('agencies')
                ->nullOnDelete();

            $table->string('requester_name')->nullable();
            $table->string('requester_email')->nullable();
            $table->text('purpose')->nullable();

            $table->string('status')->default('pending');

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('access_requests');
    }
};
