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
        Schema::create('research_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('research_id')->nullable()->constrained('research')->nullOnDelete();
            $table->foreignId('agency_id')->nullable()->constrained('agencies')->nullOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('mime_type')->nullable();
            $table->string('extension', 32)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('checksum')->nullable();
            $table->string('file_type')->default('research_document');
            $table->string('visibility')->default('private');
            $table->string('access_level')->default('restricted');
            $table->string('status')->default('pending');
            $table->json('metadata')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->text('archive_reason')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->unsignedBigInteger('restored_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('file_type', 'research_files_file_type_index');
            $table->index('access_level', 'research_files_access_level_index');
            $table->index('status', 'research_files_status_index');
            $table->index('created_at', 'research_files_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('research_files');
    }
};
