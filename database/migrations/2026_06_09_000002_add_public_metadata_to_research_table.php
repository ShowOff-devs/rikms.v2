<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research', function (Blueprint $table) {
            if (! Schema::hasColumn('research', 'public_metadata')) {
                $table->json('public_metadata')->nullable()->after('keywords');
            }

            if (! Schema::hasColumn('research', 'public_metadata_fields')) {
                $table->json('public_metadata_fields')->nullable()->after('public_metadata');
            }
        });
    }

    public function down(): void
    {
        Schema::table('research', function (Blueprint $table) {
            if (Schema::hasColumn('research', 'public_metadata')) {
                $table->dropColumn('public_metadata');
            }

            if (Schema::hasColumn('research', 'public_metadata_fields')) {
                $table->dropColumn('public_metadata_fields');
            }
        });
    }
};
