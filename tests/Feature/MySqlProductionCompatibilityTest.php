<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchReportDetail;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function compatibilityAgency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'status' => 'active',
    ]);
}

function compatibilityUser(Agency $agency, string $email): User
{
    return User::factory()->create([
        'agency_id' => $agency->id,
        'email' => $email,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
}

test('required production seeders are repeatable', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(Role::query()->whereIn('slug', ['super_admin', 'agency_admin', 'public_user'])->count())->toBe(3)
        ->and(DB::table('permissions')->count())->toBeGreaterThan(0)
        ->and(DB::table('permission_role')->count())->toBeGreaterThan(0)
        ->and(DB::table('platform_settings')->count())->toBeGreaterThan(0);
});

test('foreign keys and unique constraints are enforced', function () {
    $agency = compatibilityAgency('mysql-constraints');
    compatibilityUser($agency, 'unique@example.test');

    expect(fn () => compatibilityUser($agency, 'unique@example.test'))
        ->toThrow(QueryException::class);

    expect(fn () => DB::table('research')->insert([
        'agency_id' => PHP_INT_MAX,
        'uploaded_by' => PHP_INT_MAX,
        'title' => 'Invalid foreign keys',
        'status' => 'draft',
        'access_level' => 'private',
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});

test('mysql rejects case insensitive duplicate user emails', function () {
    if (DB::connection()->getDriverName() !== 'mysql') {
        $this->markTestSkipped('MySQL collation behavior is verified by the MySQL integration job.');
    }

    $agency = compatibilityAgency('mysql-email-collation');
    compatibilityUser($agency, 'CaseSensitive@example.test');

    expect(fn () => compatibilityUser($agency, 'casesensitive@example.test'))
        ->toThrow(QueryException::class);
});

test('json predicates casts dates and timestamps work on supported databases', function () {
    $agency = compatibilityAgency('mysql-json-dates');
    $user = compatibilityUser($agency, 'json-dates@example.test');
    $research = Research::create([
        'slug' => 'mysql-json-dates-research',
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'JSON and date compatibility',
        'authors' => ['Researcher One'],
        'sdgs' => [9, 17],
        'keywords' => ['mysql', 'compatibility'],
        'public_metadata' => ['funding_source' => 'Regional Fund'],
        'status' => 'published',
        'access_level' => 'public',
        'published_at' => '2026-07-15 10:11:12',
    ]);

    ResearchReportDetail::create([
        'research_id' => $research->id,
        'reporting_period' => 'Final',
        'project_start_date' => '2025-01-02',
        'project_end_date' => '2026-06-30',
        'financial_as_of_date' => '2026-06-30',
    ]);

    $matched = Research::query()
        ->whereJsonContains('sdgs', 17)
        ->where('public_metadata->funding_source', 'Regional Fund')
        ->firstOrFail();

    expect($matched->authors)->toBe(['Researcher One'])
        ->and($matched->published_at?->format('Y-m-d H:i:s'))->toBe('2026-07-15 10:11:12')
        ->and($matched->reportDetail?->project_start_date?->format('Y-m-d'))->toBe('2025-01-02')
        ->and($matched->reportDetail?->project_end_date?->format('Y-m-d'))->toBe('2026-06-30');
});

test('database transactions roll back atomically', function () {
    $slug = 'mysql-transaction-rollback';

    DB::beginTransaction();

    try {
        compatibilityAgency($slug);
    } finally {
        DB::rollBack();
    }

    expect(Agency::query()->where('slug', $slug)->exists())->toBeFalse();
});
