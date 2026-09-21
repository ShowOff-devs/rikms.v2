<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research_files', function (Blueprint $table): void {
            $table->index('research_id', 'research_files_research_id_index');
            $table->index('agency_id', 'research_files_agency_id_index');
            $table->index('uploaded_by', 'research_files_uploaded_by_index');
            $table->index('report_highlight_id', 'research_files_report_highlight_id_index');
            $table->index(['disk', 'path'], 'research_files_disk_path_index');
            $table->index(['agency_id', 'status', 'deleted_at'], 'research_files_agency_storage_index');
        });
    }

    public function down(): void
    {
        Schema::table('research_files', function (Blueprint $table): void {
            $table->dropIndex('research_files_research_id_index');
            $table->dropIndex('research_files_agency_id_index');
            $table->dropIndex('research_files_uploaded_by_index');
            $table->dropIndex('research_files_report_highlight_id_index');
            $table->dropIndex('research_files_disk_path_index');
            $table->dropIndex('research_files_agency_storage_index');
        });
    }
};
