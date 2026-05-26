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
        Schema::table('agencies', function (Blueprint $table) {
            if (! Schema::hasColumn('agencies', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('id');
            }

            if (! Schema::hasColumn('agencies', 'full_name')) {
                $table->string('full_name')->nullable()->after('short_name');
            }

            if (! Schema::hasColumn('agencies', 'type')) {
                $table->string('type')->default('Government Agency')->after('full_name');
            }

            if (! Schema::hasColumn('agencies', 'website')) {
                $table->string('website')->nullable()->after('contact_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            foreach (['slug', 'full_name', 'type', 'website'] as $column) {
                if (Schema::hasColumn('agencies', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
