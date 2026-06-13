<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research', function (Blueprint $table): void {
            $table->foreignId('revision_parent_id')
                ->nullable()
                ->after('uploaded_by')
                ->constrained('research')
                ->nullOnDelete();
            $table->foreignId('superseded_by_id')
                ->nullable()
                ->after('revision_parent_id')
                ->constrained('research')
                ->nullOnDelete();
            $table->unsignedInteger('revision_number')
                ->default(1)
                ->after('superseded_by_id');

            $table->index(['revision_parent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('research', function (Blueprint $table): void {
            $table->dropIndex(['revision_parent_id', 'status']);
            $table->dropConstrainedForeignId('revision_parent_id');
            $table->dropConstrainedForeignId('superseded_by_id');
            $table->dropColumn('revision_number');
        });
    }
};
