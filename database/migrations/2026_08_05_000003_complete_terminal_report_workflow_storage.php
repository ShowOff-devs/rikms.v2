<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research_report_details', function (Blueprint $table): void {
            $table->json('pap_categories')->nullable();
            $table->text('pap_description')->nullable();
            $table->json('beneficiary_sectors')->nullable();
            $table->text('performance_remarks')->nullable();
            $table->string('last_wizard_step', 80)->nullable();
            $table->unsignedInteger('draft_version')->default(0);
        });

        Schema::table('research_performance_items', function (Blueprint $table): void {
            $table->decimal('accomplishment_percentage', 10, 2)->nullable()->change();
            $table->decimal('target_numeric_value', 18, 4)->nullable();
            $table->decimal('actual_numeric_value', 18, 4)->nullable();
            $table->string('unit', 80)->nullable();
        });

        Schema::create('research_report_highlights', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('research_id')
                ->constrained('research')
                ->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['research_id', 'sort_order'], 'report_highlights_research_order_index');
        });

        Schema::table('research_files', function (Blueprint $table): void {
            $table->foreignId('report_highlight_id')
                ->nullable()
                ->after('research_id')
                ->constrained('research_report_highlights')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('research_files', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('report_highlight_id');
        });

        Schema::dropIfExists('research_report_highlights');

        Schema::table('research_performance_items', function (Blueprint $table): void {
            $table->dropColumn(['target_numeric_value', 'actual_numeric_value', 'unit']);
            $table->decimal('accomplishment_percentage', 5, 2)->nullable()->change();
        });

        Schema::table('research_report_details', function (Blueprint $table): void {
            $table->dropColumn([
                'pap_categories',
                'pap_description',
                'beneficiary_sectors',
                'performance_remarks',
                'last_wizard_step',
                'draft_version',
            ]);
        });
    }
};
