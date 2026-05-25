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
        Schema::create('research', function (Blueprint $table) {
            $table->id();

            $table->foreignId('agency_id')
                ->constrained('agencies')
                ->cascadeOnDelete();

            $table->foreignId('uploaded_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('title');
            $table->text('abstract')->nullable();
            $table->string('document_path')->nullable();
            $table->integer('publication_year')->nullable();

            $table->string('status')->default('draft');
            $table->string('access_level')->default('request_required');

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('research');
    }
};
