<?php

namespace App\Console\Commands;

use App\Services\RuntimeHeartbeat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class CheckRuntimeHealth extends Command
{
    protected $signature = 'rikms:runtime-check';

    protected $description = 'Verify the database queue, failed-job storage, scheduler, and queue worker heartbeats';

    public function handle(RuntimeHeartbeat $heartbeat): int
    {
        $connection = (string) config('queue.default');
        $databaseConnection = config('queue.connections.database.connection') ?: config('database.default');
        $checks = [
            ['Queue connection uses the pilot database driver', $connection === 'database'],
        ];

        try {
            DB::connection($databaseConnection)->getPdo();
            $databaseReachable = true;
        } catch (Throwable) {
            $databaseReachable = false;
        }

        $checks[] = ['Database is reachable', $databaseReachable];
        $checks[] = ['Jobs table exists', $databaseReachable && Schema::connection($databaseConnection)->hasTable('jobs')];
        $checks[] = ['Failed jobs table exists', $databaseReachable && Schema::connection($databaseConnection)->hasTable('failed_jobs')];

        $runtime = $heartbeat->status();
        $checks[] = ['Scheduler heartbeat is fresh', $runtime['scheduler']['healthy']];
        $checks[] = ['Queue worker heartbeat is fresh', $runtime['worker']['healthy']];

        $this->table(
            ['Check', 'Result'],
            array_map(fn (array $check): array => [$check[0], $check[1] ? 'PASS' : 'FAIL'], $checks),
        );

        $this->line('Scheduler last seen: '.($runtime['scheduler']['last_seen_at'] ?? 'never'));
        $this->line('Worker last seen: '.($runtime['worker']['last_seen_at'] ?? 'never'));

        if (collect($checks)->contains(fn (array $check): bool => $check[1] === false)) {
            $this->error('RIKMS queue/scheduler runtime check failed.');

            return self::FAILURE;
        }

        $this->info('RIKMS queue and scheduler are healthy.');

        return self::SUCCESS;
    }
}
