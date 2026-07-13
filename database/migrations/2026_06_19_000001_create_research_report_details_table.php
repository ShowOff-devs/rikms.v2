<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('research_report_details', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('research_id')
                ->unique()
                ->constrained('research')
                ->cascadeOnDelete();
            $table->string('reporting_period')->nullable();
            $table->date('project_start_date')->nullable();
            $table->date('project_end_date')->nullable();
            $table->decimal('allotted_budget', 15, 2)->nullable();
            $table->decimal('released_amount', 15, 2)->nullable();
            $table->decimal('obligated_amount', 15, 2)->nullable();
            $table->decimal('utilized_amount', 15, 2)->nullable();
            $table->decimal('physical_accomplishment_percent', 5, 2)->nullable();
            $table->date('financial_as_of_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('research_report_details');
    }
};
