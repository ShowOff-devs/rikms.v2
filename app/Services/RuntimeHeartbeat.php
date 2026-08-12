<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Throwable;

class RuntimeHeartbeat
{
    public function recordScheduler(): void
    {
        Cache::forever(
            (string) config('rikms.runtime.scheduler_heartbeat_cache_key'),
            now()->toISOString(),
        );
    }

    public function recordWorker(): void
    {
        Cache::forever(
            (string) config('rikms.runtime.worker_heartbeat_cache_key'),
            now()->toISOString(),
        );
    }

    /**
     * @return array{
     *     stale_after_seconds: int,
     *     scheduler: array{last_seen_at: ?string, age_seconds: ?int, healthy: bool},
     *     worker: array{last_seen_at: ?string, age_seconds: ?int, healthy: bool}
     * }
     */
    public function status(): array
    {
        $staleAfter = max(60, (int) config('rikms.runtime.heartbeat_stale_after_seconds', 300));

        return [
            'stale_after_seconds' => $staleAfter,
            'scheduler' => $this->heartbeatStatus(
                (string) config('rikms.runtime.scheduler_heartbeat_cache_key'),
                $staleAfter,
            ),
            'worker' => $this->heartbeatStatus(
                (string) config('rikms.runtime.worker_heartbeat_cache_key'),
                $staleAfter,
            ),
        ];
    }

    /** @return array{last_seen_at: ?string, age_seconds: ?int, healthy: bool} */
    private function heartbeatStatus(string $key, int $staleAfter): array
    {
        $lastSeenAt = Cache::get($key);

        if (! is_string($lastSeenAt) || $lastSeenAt === '') {
            return ['last_seen_at' => null, 'age_seconds' => null, 'healthy' => false];
        }

        try {
            $timestamp = CarbonImmutable::parse($lastSeenAt);
            $ageSeconds = max(0, (int) floor($timestamp->diffInSeconds(now(), true)));
        } catch (Throwable) {
            return ['last_seen_at' => null, 'age_seconds' => null, 'healthy' => false];
        }

        return [
            'last_seen_at' => $timestamp->toISOString(),
            'age_seconds' => $ageSeconds,
            'healthy' => $ageSeconds <= $staleAfter,
        ];
    }
}
