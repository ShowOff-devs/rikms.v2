<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;
use RuntimeException;
use Throwable;

class BackfillSqlitePersistentTables extends Command
{
    protected $signature = 'rikms:backfill-sqlite-persistent';

    protected $description =
        'Backfill persistent SQLite event data into MySQL without overwriting newer MySQL records';

    public function handle(): int
    {
        if (config('database.default') !== 'mysql') {
            $this->error('Laravel must currently be connected to MySQL.');

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

        $tables = [
            'security_events',
            'research_analytics_events',
            'csp_violation_reports',
        ];

        $this->info('RIKMS collision-safe SQLite → MySQL backfill');
        $this->newLine();

        /*
         * Preflight
         */
        foreach ($tables as $table) {
            $sqliteCount = $this->sqliteCount($sqlite, $table);
            $mysqlCount = DB::table($table)->count();

            $this->line(
                str_pad($table, 32)
                ." SQLite={$sqliteCount} / MySQL={$mysqlCount}"
            );
        }

        /*
         * CSP reports use fingerprint as a unique business key.
         * Current audit says MySQL contains zero CSP rows.
         *
         * Refuse automatic merging if that changes, because occurrence_count
         * is aggregated data and should not be blindly summed.
         */
        if (DB::table('csp_violation_reports')->count() !== 0) {
            $this->error(
                'csp_violation_reports now contains MySQL data. '
                .'Automatic CSP merging is intentionally blocked.'
            );

            return self::FAILURE;
        }

        $remapped = [];

        try {
            DB::beginTransaction();

            foreach ($tables as $table) {
                $sourceColumns = $this->sqliteColumns($sqlite, $table);

                $mysqlColumnObjects = DB::select(
                    "SHOW COLUMNS FROM `{$table}`"
                );

                $mysqlColumns = array_map(
                    fn ($column) => $column->Field,
                    $mysqlColumnObjects
                );

                $commonColumns = array_values(
                    array_intersect($sourceColumns, $mysqlColumns)
                );

                if (! in_array('id', $commonColumns, true)) {
                    throw new RuntimeException(
                        "{$table}: shared ID column not found."
                    );
                }

                $sourceRows = $sqlite
                    ->query("SELECT * FROM \"{$table}\" ORDER BY id")
                    ->fetchAll();

                /*
                 * Existing MySQL IDs belong to data generated since MySQL
                 * became active. They must not be overwritten.
                 */
                $usedIds = DB::table($table)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->flip()
                    ->all();

                $sourceMax = $sourceRows === []
                    ? 0
                    : max(array_map(
                        'intval',
                        array_column($sourceRows, 'id')
                    ));

                $destinationMax = (int) (
                    DB::table($table)->max('id') ?? 0
                );

                /*
                 * Conflicting historical IDs are remapped above both
                 * the source and current MySQL ranges.
                 */
                $nextId = max($sourceMax, $destinationMax) + 1;

                $inserted = 0;
                $tableRemaps = [];

                foreach ($sourceRows as $sourceRow) {
                    $row = [];

                    foreach ($commonColumns as $column) {
                        $row[$column] = $sourceRow[$column];
                    }

                    $originalId = (int) $sourceRow['id'];

                    if (isset($usedIds[$originalId])) {
                        $newId = $nextId++;

                        $row['id'] = $newId;
                        $usedIds[$newId] = true;

                        $tableRemaps[] = [
                            'sqlite_id' => $originalId,
                            'mysql_id' => $newId,
                        ];
                    } else {
                        $row['id'] = $originalId;
                        $usedIds[$originalId] = true;
                    }

                    DB::table($table)->insert($row);

                    $inserted++;
                }

                $remapped[$table] = $tableRemaps;

                $this->line(
                    str_pad($table, 32)
                    ."{$inserted} historical rows added"
                );

                if ($tableRemaps !== []) {
                    $this->warn(
                        '  ID collisions remapped: '
                        .count($tableRemaps)
                    );

                    foreach ($tableRemaps as $mapping) {
                        $this->line(
                            "    SQLite ID {$mapping['sqlite_id']}"
                            ." → MySQL ID {$mapping['mysql_id']}"
                        );
                    }
                }
            }

            /*
             * Validate foreign keys on the backfilled event tables.
             */
            $foreignKeys = DB::select(
                "
                SELECT
                    TABLE_NAME AS child_table,
                    COLUMN_NAME AS child_column,
                    REFERENCED_TABLE_NAME AS parent_table,
                    REFERENCED_COLUMN_NAME AS parent_column
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                  AND TABLE_NAME IN (
                      'security_events',
                      'research_analytics_events',
                      'csp_violation_reports'
                  )
                "
            );

            foreach ($foreignKeys as $fk) {
                $result = DB::selectOne(
                    "
                    SELECT COUNT(*) AS total
                    FROM `{$fk->child_table}` child
                    LEFT JOIN `{$fk->parent_table}` parent
                      ON child.`{$fk->child_column}`
                       = parent.`{$fk->parent_column}`
                    WHERE child.`{$fk->child_column}` IS NOT NULL
                      AND parent.`{$fk->parent_column}` IS NULL
                    "
                );

                if ((int) $result->total !== 0) {
                    throw new RuntimeException(
                        "{$fk->child_table}.{$fk->child_column}: "
                        ."{$result->total} orphan record(s)."
                    );
                }
            }

            /*
             * Expected counts based on the state at the beginning of
             * this backfill.
             */
            $expected = [
                'security_events' => 83,
                'research_analytics_events' => 139,
                'csp_violation_reports' => 5,
            ];

            $this->newLine();
            $this->info('Final verification');

            foreach ($expected as $table => $expectedCount) {
                $actual = DB::table($table)->count();

                $this->line(
                    str_pad($table, 32)
                    ." expected={$expectedCount} / actual={$actual}"
                );

                if ($actual !== $expectedCount) {
                    throw new RuntimeException(
                        "{$table}: expected {$expectedCount} rows, "
                        ."found {$actual}."
                    );
                }
            }

            DB::commit();

            /*
             * Save collision mappings for migration auditability.
             */
            $reportPath = storage_path(
                'app/sqlite-mysql-backfill-id-map-'
                .now()->format('Ymd-His')
                .'.json'
            );

            file_put_contents(
                $reportPath,
                json_encode(
                    $remapped,
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
                )
            );

            $this->newLine();
            $this->info('Targeted backfill completed successfully.');

            $this->line("ID mapping report: {$reportPath}");

            return self::SUCCESS;
        } catch (Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            $this->newLine();
            $this->error('Targeted backfill failed.');
            $this->error($e->getMessage());

            $this->warn(
                'MySQL changes were rolled back. '
                .'SQLite was not modified.'
            );

            return self::FAILURE;
        }
    }

    private function sqliteColumns(PDO $sqlite, string $table): array
    {
        $columns = $sqlite
            ->query("PRAGMA table_info(\"{$table}\")")
            ->fetchAll();

        if ($columns === []) {
            throw new RuntimeException(
                "SQLite table '{$table}' does not exist."
            );
        }

        return array_column($columns, 'name');
    }

    private function sqliteCount(PDO $sqlite, string $table): int
    {
        return (int) $sqlite
            ->query("SELECT COUNT(*) FROM \"{$table}\"")
            ->fetchColumn();
    }
}
