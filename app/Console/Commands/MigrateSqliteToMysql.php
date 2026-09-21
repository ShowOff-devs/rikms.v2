<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;
use Throwable;

class MigrateSqliteToMysql extends Command
{
    /**
     * Persistent application data that must survive the SQLite to MySQL cutover.
     *
     * Keep this list explicit so the copy order continues to satisfy parent-child
     * relationships while foreign-key validation remains deterministic.
     *
     * @var list<string>
     */
    public const PERSISTENT_TABLES = [
        'agencies',
        'roles',
        'permissions',
        'users',

        'role_user',
        'permission_role',
        'permission_user',

        'research',

        'research_report_details',
        'research_performance_items',
        'research_report_highlights',
        'research_files',
        'research_approvals',
        'research_analytics_events',

        'access_requests',
        'archive_records',
        'notifications',
        'audit_logs',
        'security_events',
        'csp_violation_reports',
        'platform_settings',
    ];

    /**
     * Runtime state is intentionally invalidated during a database cutover.
     *
     * Copying these rows can resurrect expired credentials, authenticated
     * sessions, stale locks, duplicate jobs, or environment-specific cache data.
     * Failed jobs remain available in the read-only SQLite source for audit.
     *
     * @var list<string>
     */
    public const EXCLUDED_RUNTIME_TABLES = [
        'cache',
        'cache_locks',
        'sessions',
        'jobs',
        'job_batches',
        'failed_jobs',
        'password_reset_tokens',
        'migrations',
    ];

    protected $signature = 'rikms:migrate-sqlite-to-mysql';

    protected $description = 'Safely migrate persistent RIKMS data from SQLite to MySQL';

    public function handle(): int
    {
        if (config('database.default') !== 'mysql') {
            $this->error('Laravel is not currently using MySQL.');

            return self::FAILURE;
        }

        $sqlitePath = database_path('database.sqlite');

        if (! file_exists($sqlitePath)) {
            $this->error("SQLite database not found: {$sqlitePath}");

            return self::FAILURE;
        }

        $sqlite = new PDO('sqlite:'.$sqlitePath);
        $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $sqlite->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $tables = self::PERSISTENT_TABLES;

        $this->info('RIKMS SQLite → MySQL migration');
        $this->line(
            'Runtime tables are intentionally reset during cutover: '
            .implode(', ', self::EXCLUDED_RUNTIME_TABLES)
        );
        $this->newLine();

        /*
         * PRE-FLIGHT #1:
         * Make sure every source and destination table exists.
         */
        foreach ($tables as $table) {
            $sourceColumns = $this->sqliteColumns($sqlite, $table);

            if ($sourceColumns === []) {
                $this->error("SQLite source table '{$table}' does not exist.");

                return self::FAILURE;
            }

            try {
                $mysqlColumns = DB::select("SHOW COLUMNS FROM `{$table}`");
            } catch (Throwable $e) {
                $this->error("MySQL destination table '{$table}' does not exist.");

                return self::FAILURE;
            }

            if ($mysqlColumns === []) {
                $this->error("MySQL destination table '{$table}' has no columns.");

                return self::FAILURE;
            }
        }

        /*
         * PRE-FLIGHT #2:
         * Destination business tables must be empty.
         *
         * This prevents duplicate IDs and duplicate records.
         */
        foreach ($tables as $table) {
            $count = DB::table($table)->count();

            if ($count > 0) {
                $this->error(
                    "Migration stopped: MySQL table '{$table}' already contains {$count} row(s)."
                );

                $this->warn(
                    'Do not clear it manually until you know why data is already present.'
                );

                return self::FAILURE;
            }
        }

        /*
         * PRE-FLIGHT #3:
         * Make sure destination-only columns can safely be omitted.
         */
        foreach ($tables as $table) {
            $sourceColumns = $this->sqliteColumns($sqlite, $table);
            $mysqlColumns = DB::select("SHOW COLUMNS FROM `{$table}`");

            foreach ($mysqlColumns as $column) {
                if (in_array($column->Field, $sourceColumns, true)) {
                    continue;
                }

                $isNullable = strtoupper($column->Null) === 'YES';
                $hasDefault = $column->Default !== null;
                $isAutoIncrement = str_contains(
                    strtolower((string) $column->Extra),
                    'auto_increment'
                );
                $isGenerated = str_contains(
                    strtolower((string) $column->Extra),
                    'generated'
                );

                if (
                    ! $isNullable &&
                    ! $hasDefault &&
                    ! $isAutoIncrement &&
                    ! $isGenerated
                ) {
                    $this->error(
                        "Unsafe schema difference: {$table}.{$column->Field} "
                        .'exists only in MySQL and has no usable default.'
                    );

                    return self::FAILURE;
                }

                $this->line(
                    '<comment>MySQL-only column:</comment> '
                    ."{$table}.{$column->Field} "
                    .'(will use its default/NULL value)'
                );
            }
        }

        $this->newLine();
        $this->info('Pre-flight checks passed.');

        $currentTable = null;

        try {
            /*
             * Some RIKMS records contain self-references such as:
             *
             * research.revision_parent_id
             * research.superseded_by_id
             *
             * Foreign-key checks are temporarily disabled while the complete,
             * ID-preserving dataset is copied.
             */
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            DB::beginTransaction();

            foreach ($tables as $table) {
                $currentTable = $table;

                $sourceColumns = $this->sqliteColumns($sqlite, $table);

                $mysqlColumnObjects = DB::select(
                    "SHOW COLUMNS FROM `{$table}`"
                );

                $mysqlColumns = array_map(
                    fn ($column) => $column->Field,
                    $mysqlColumnObjects
                );

                /*
                 * Only columns present in BOTH databases are copied.
                 *
                 * This handles cases such as:
                 *
                 * research.active_revision_parent_id
                 *
                 * which exists in MySQL but not the old SQLite database.
                 */
                $copyColumns = array_values(
                    array_intersect($sourceColumns, $mysqlColumns)
                );

                $rows = $sqlite
                    ->query("SELECT * FROM \"{$table}\"")
                    ->fetchAll();

                $sourceCount = count($rows);

                if ($sourceCount === 0) {
                    $this->line(
                        str_pad($table, 35)
                        .' 0 rows — skipped'
                    );

                    continue;
                }

                $filteredRows = [];

                foreach ($rows as $row) {
                    $filtered = [];

                    foreach ($copyColumns as $column) {
                        $filtered[$column] = $row[$column];
                    }

                    $filteredRows[] = $filtered;
                }

                /*
                 * Insert in batches while preserving the original IDs.
                 */
                foreach (array_chunk($filteredRows, 200) as $chunk) {
                    DB::table($table)->insert($chunk);
                }

                $destinationCount = DB::table($table)->count();

                if ($destinationCount !== $sourceCount) {
                    throw new \RuntimeException(
                        "Count mismatch for {$table}: "
                        ."SQLite={$sourceCount}, "
                        ."MySQL={$destinationCount}"
                    );
                }

                $this->line(
                    str_pad($table, 35)
                    ." {$destinationCount} rows copied"
                );
            }

            /*
             * Validate foreign-key relationships before committing.
             */
            $this->newLine();
            $this->info('Checking foreign-key relationships...');

            $foreignKeys = DB::select(
                '
                SELECT
                    TABLE_NAME AS child_table,
                    COLUMN_NAME AS child_column,
                    REFERENCED_TABLE_NAME AS parent_table,
                    REFERENCED_COLUMN_NAME AS parent_column
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                ORDER BY TABLE_NAME, COLUMN_NAME
                '
            );

            foreach ($foreignKeys as $fk) {
                $childTable = $fk->child_table;
                $childColumn = $fk->child_column;
                $parentTable = $fk->parent_table;
                $parentColumn = $fk->parent_column;

                $result = DB::selectOne(
                    "
                    SELECT COUNT(*) AS orphan_count
                    FROM `{$childTable}` child
                    LEFT JOIN `{$parentTable}` parent
                      ON child.`{$childColumn}` = parent.`{$parentColumn}`
                    WHERE child.`{$childColumn}` IS NOT NULL
                      AND parent.`{$parentColumn}` IS NULL
                    "
                );

                if ((int) $result->orphan_count > 0) {
                    throw new \RuntimeException(
                        'Foreign-key validation failed: '
                        ."{$childTable}.{$childColumn} → "
                        ."{$parentTable}.{$parentColumn} has "
                        ."{$result->orphan_count} orphan record(s)."
                    );
                }
            }

            /*
             * Final source/target count verification.
             */
            $this->newLine();
            $this->info('Final row-count verification...');

            foreach ($tables as $table) {
                $sourceCount = (int) $sqlite
                    ->query("SELECT COUNT(*) FROM \"{$table}\"")
                    ->fetchColumn();

                $mysqlCount = DB::table($table)->count();

                if ($sourceCount !== $mysqlCount) {
                    throw new \RuntimeException(
                        "Final verification failed for {$table}: "
                        ."SQLite={$sourceCount}, "
                        ."MySQL={$mysqlCount}"
                    );
                }

                $this->line(
                    str_pad($table, 35)
                    ." SQLite={$sourceCount} / MySQL={$mysqlCount}"
                );
            }

            DB::commit();

            $this->newLine();
            $this->info('Migration completed successfully.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            $this->newLine();
            $this->error(
                'Migration failed'
                .($currentTable ? " while processing '{$currentTable}'" : '')
                .'.'
            );

            $this->error($e->getMessage());

            $this->warn(
                'The MySQL transaction was rolled back. '
                .'The SQLite source database was not modified.'
            );

            return self::FAILURE;
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private function sqliteColumns(PDO $sqlite, string $table): array
    {
        $columns = $sqlite
            ->query("PRAGMA table_info(\"{$table}\")")
            ->fetchAll(PDO::FETCH_ASSOC);

        return array_map(
            fn (array $column) => $column['name'],
            $columns
        );
    }
}
