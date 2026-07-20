<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->string('access_token_hash', 64)->nullable()->unique()->after('access_expires_at');
            $table->timestamp('access_token_generated_at')->nullable()->after('access_token_hash');
            $table->timestamp('access_token_last_used_at')->nullable()->after('access_token_generated_at');
            $table->timestamp('access_revoked_at')->nullable()->after('access_token_last_used_at');
        });
    }

    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->dropUnique(['access_token_hash']);
            $table->dropColumn(['access_token_hash', 'access_token_generated_at', 'access_token_last_used_at', 'access_revoked_at']);
        });
    }
};
