<?php

namespace App\Jobs;

use App\Services\RuntimeHeartbeat;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecordQueueWorkerHeartbeat implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 30;

    public function handle(RuntimeHeartbeat $heartbeat): void
    {
        $heartbeat->recordWorker();
    }
}
