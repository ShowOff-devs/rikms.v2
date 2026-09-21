<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class QueueHealthService
{
    /**
     * @return array{
     *     connection: string,
     *     driver: string,
     *     pending_jobs: int,
     *     failed_jobs: int,
     *     oldest_pending_job_age_minutes: ?int
     * }
     */
    public function snapshot(): array
    {
        $connection = (string) config('queue.default');
        $driver = (string) config("queue.connections.{$connection}.driver");
        $queues = config('monitoring.queues', ['health', 'default']);
        $queues = is_array($queues) ? array_values(array_unique(array_filter($queues, 'is_string'))) : [];

        if ($connection === '' || $driver === '' || $queues === []) {
            throw new RuntimeException('Queue monitoring configuration is incomplete.');
        }

        $pending = array_sum(array_map(
            fn (string $queue): int => Queue::connection($connection)->size($queue),
            $queues,
        ));

        return [
            'connection' => $connection,
            'driver' => $driver,
            'pending_jobs' => $pending,
            'failed_jobs' => $this->failedJobCount(),
            'oldest_pending_job_age_minutes' => $driver === 'database'
                ? $this->oldestDatabaseJobAge($connection, $queues)
                : null,
        ];
    }

    /** @param array<int, string> $queues */
    private function oldestDatabaseJobAge(string $queueConnection, array $queues): ?int
    {
        $databaseConnection = config("queue.connections.{$queueConnection}.connection") ?: config('database.default');
        $table = (string) config("queue.connections.{$queueConnection}.table", 'jobs');

        if (! Schema::connection($databaseConnection)->hasTable($table)) {
            throw new RuntimeException('The configured queue table is missing.');
        }

        $createdAt = DB::connection($databaseConnection)
            ->table($table)
            ->whereIn('queue', $queues)
            ->min('created_at');

        return is_numeric($createdAt)
            ? max(0, (int) floor((now()->timestamp - (int) $createdAt) / 60))
            : null;
    }

    private function failedJobCount(): int
    {
        $driver = (string) config('queue.failed.driver');

        if (! str_starts_with($driver, 'database')) {
            throw new RuntimeException('Queue monitoring requires database-backed failed-job storage.');
        }

        $databaseConnection = config('queue.failed.database') ?: config('database.default');
        $table = (string) config('queue.failed.table', 'failed_jobs');

        if (! Schema::connection($databaseConnection)->hasTable($table)) {
            throw new RuntimeException('The configured failed-jobs table is missing.');
        }

        return DB::connection($databaseConnection)->table($table)->count();
    }
}
