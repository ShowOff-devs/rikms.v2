<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

test('active-revision migration reports existing conflicts without rewriting records', function () {
    if (DB::connection()->getDriverName() !== 'sqlite') {
        $this->markTestSkipped('Conflict preflight is exercised on the isolated SQLite migration database.');
    }

    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
    $agency = Agency::create([
        'slug' => 'phase2-migration-conflicts',
        'name' => 'Phase 2 Migration Conflicts',
        'short_name' => 'P2MC',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $parent = Research::create([
        'slug' => 'phase2-migration-parent',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Phase 2 migration parent',
        'status' => 'published',
        'access_level' => 'restricted',
    ]);
    $migration = require database_path('migrations/2026_08_31_000001_add_active_revision_key_to_research.php');
    $migration->down();
    $now = now();

    foreach ([2, 3] as $number) {
        DB::table('research')->insert([
            'slug' => "phase2-conflicting-revision-{$number}",
            'agency_id' => $agency->id,
            'uploaded_by' => $user->id,
            'revision_parent_id' => $parent->id,
            'revision_number' => $number,
            'title' => "Conflicting revision {$number}",
            'status' => 'draft',
            'access_level' => 'restricted',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    expect(fn () => $migration->up())
        ->toThrow(RuntimeException::class, 'conflicting revision parent IDs')
        ->and(Schema::hasColumn('research', 'active_revision_parent_id'))->toBeFalse()
        ->and(DB::table('research')->where('revision_parent_id', $parent->id)->count())->toBe(2);

    DB::table('research')->where('revision_parent_id', $parent->id)->delete();
    $migration->up();
});
