<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('research_performance_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('research_id')
                ->constrained('research')
                ->cascadeOnDelete();
            $table->string('project_name')->nullable();
            $table->string('target_value')->nullable();
            $table->string('actual_value')->nullable();
            $table->decimal('accomplishment_percentage', 5, 2)->nullable();
            $table->string('project_status')->nullable();
            $table->text('remarks')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('research_id', 'research_performance_items_research_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('research_performance_items');
    }
};
