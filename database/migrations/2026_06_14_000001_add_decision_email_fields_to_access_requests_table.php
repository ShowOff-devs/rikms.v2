<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->text('public_denial_reason')->nullable()->after('review_notes');
            $table->text('internal_review_notes')->nullable()->after('public_denial_reason');
            $table->timestamp('access_expires_at')->nullable()->after('internal_review_notes');
        });
    }

    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->dropColumn([
                'public_denial_reason',
                'internal_review_notes',
                'access_expires_at',
            ]);
        });
    }
};
