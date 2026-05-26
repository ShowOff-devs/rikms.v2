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
        Schema::create('archive_records', function (Blueprint $table) {
            $table->id();
            $table->string('archivable_type');
            $table->unsignedBigInteger('archivable_id');
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('restored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();

            $table->index(['archivable_type', 'archivable_id'], 'archive_records_archivable_index');
            $table->index('archived_at', 'archive_records_archived_at_index');
            $table->index('restored_at', 'archive_records_restored_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archive_records');
    }
};
