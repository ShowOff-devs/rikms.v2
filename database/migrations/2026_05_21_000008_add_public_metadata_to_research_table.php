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
        Schema::table('research', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('id');
            $table->json('authors')->nullable()->after('abstract');
            $table->string('category')->nullable()->after('publication_year');
            $table->json('sdgs')->nullable()->after('category');
            $table->json('keywords')->nullable()->after('sdgs');
            $table->unsignedInteger('downloads')->default(0)->after('access_level');
            $table->date('embargo_until')->nullable()->after('downloads');
            $table->string('external_url')->nullable()->after('embargo_until');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('research', function (Blueprint $table) {
            $table->dropColumn([
                'slug',
                'authors',
                'category',
                'sdgs',
                'keywords',
                'downloads',
                'embargo_until',
                'external_url',
            ]);
        });
    }
};
