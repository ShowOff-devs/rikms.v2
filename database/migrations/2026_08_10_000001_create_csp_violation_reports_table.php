<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('csp_violation_reports', function (Blueprint $table) {
            $table->id();
            $table->char('fingerprint', 64)->unique();
            $table->string('document_uri', 2048);
            $table->string('blocked_uri', 1024);
            $table->string('effective_directive', 100)->index();
            $table->string('violated_directive', 255)->nullable();
            $table->string('source_file', 2048)->nullable();
            $table->unsignedInteger('line_number')->nullable();
            $table->unsignedInteger('column_number')->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('disposition', 20)->nullable();
            $table->string('browser', 30);
            $table->char('policy_hash', 64)->nullable();
            $table->unsignedBigInteger('occurrence_count')->default(1);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('csp_violation_reports');
    }
};
