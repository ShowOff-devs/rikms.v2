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
        Schema::create('agencies', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('short_name')->nullable();
            $table->string('full_name')->nullable();
            $table->string('type')->default('Government Agency');
            $table->string('email')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('website')->nullable();
            $table->string('address')->nullable();
            $table->text('description')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agencies');
    }
};
