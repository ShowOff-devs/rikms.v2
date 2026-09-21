<?php

namespace App\Console\Commands;

use App\Services\QueueHealthService;
use App\Services\RuntimeHeartbeat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class CheckRuntimeHealth extends Command
{
    protected $signature = 'rikms:runtime-check';

    protected $description = 'Verify the queue backend, failed-job storage, scheduler, and queue worker heartbeats';

    public function handle(RuntimeHeartbeat $heartbeat, QueueHealthService $queueHealth): int
    {
        $connection = (string) config('queue.default');
        $driver = (string) config("queue.connections.{$connection}.driver");
        $checks = [
            ['Queue connection is asynchronous and supported', in_array($driver, ['database', 'redis'], true)],
        ];

        try {
            DB::connection()->getPdo();
            $databaseReachable = true;
        } catch (Throwable) {
            $databaseReachable = false;
        }

        $checks[] = ['Database is reachable', $databaseReachable];
        try {
            $queueHealth->snapshot();
            $queueReachable = true;
        } catch (Throwable) {
            $queueReachable = false;
        }

        $checks[] = ['Queue backend and failed-job storage are reachable', $queueReachable];

        try {
            $runtime = $heartbeat->status();
        } catch (Throwable) {
            $runtime = [
                'scheduler' => ['last_seen_at' => null, 'healthy' => false],
                'worker' => ['last_seen_at' => null, 'healthy' => false],
            ];
        }

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
