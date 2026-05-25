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
        Schema::create('research_approvals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('research_id')
                ->constrained('research')
                ->cascadeOnDelete();

            $table->foreignId('reviewed_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('status')->default('pending');
            $table->text('remarks')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('research_approvals');
    }
};
