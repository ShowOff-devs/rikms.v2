<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research', function (Blueprint $table): void {
            if (! Schema::hasColumn('research', 'public_metadata_fields')) {
                $table->json('public_metadata_fields')->nullable()->after('public_metadata');
            }
        });
    }

    public function down(): void
    {
        // This migration is a compatibility guard for environments that missed
        // the column in the preceding public metadata migration. In the normal
        // migration order, the previous migration owns the column rollback.
    }
};
