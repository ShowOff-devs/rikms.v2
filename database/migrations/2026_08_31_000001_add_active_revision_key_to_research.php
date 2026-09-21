<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ACTIVE_REVISION_STATUSES = [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
    ];

    public function up(): void
    {
        $revisionConflicts = DB::table('research')
            ->select('revision_parent_id', DB::raw('COUNT(*) AS aggregate'))
            ->whereNotNull('revision_parent_id')
            ->whereIn('status', self::ACTIVE_REVISION_STATUSES)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->groupBy('revision_parent_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('aggregate', 'revision_parent_id');

        if ($revisionConflicts->isNotEmpty()) {
            throw new RuntimeException(
                'Cannot add active revision uniqueness: conflicting revision parent IDs are '.$revisionConflicts->keys()->implode(', ').'.',
            );
        }

        Schema::table('research', function (Blueprint $table): void {
            $table->unsignedBigInteger('active_revision_parent_id')->nullable()->after('revision_parent_id');
        });

        DB::table('research')
            ->whereNotNull('revision_parent_id')
            ->whereIn('status', self::ACTIVE_REVISION_STATUSES)
            ->whereNull('archived_at')
            ->whereNull('deleted_at')
            ->update(['active_revision_parent_id' => DB::raw('revision_parent_id')]);

        if (DB::connection()->getDriverName() === 'sqlsrv') {
            DB::statement('CREATE UNIQUE INDEX research_active_revision_parent_unique ON research (active_revision_parent_id) WHERE active_revision_parent_id IS NOT NULL');
        } else {
            Schema::table('research', function (Blueprint $table): void {
                $table->unique('active_revision_parent_id', 'research_active_revision_parent_unique');
            });
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlsrv') {
            DB::statement('DROP INDEX research_active_revision_parent_unique ON research');
        }

        Schema::table('research', function (Blueprint $table): void {
            if (DB::connection()->getDriverName() !== 'sqlsrv') {
                $table->dropUnique('research_active_revision_parent_unique');
            }

            $table->dropColumn('active_revision_parent_id');
        });
    }
};
