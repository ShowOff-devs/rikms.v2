<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublicResponseCache
{
    private const RESEARCH_VERSION_KEY = 'public-cache:research-version';

    private const AGENCY_VERSION_KEY = 'public-cache:agency-version';

    public function rememberResearchList(array $parameters, Closure $callback): mixed
    {
        return Cache::remember(
            $this->key('research-list', $parameters, $this->version(self::RESEARCH_VERSION_KEY)),
            now()->addSeconds((int) config('rikms.public_cache.list_ttl_seconds', 60)),
            $callback,
        );
    }

    public function rememberResearchSummary(Closure $callback): mixed
    {
        return Cache::remember(
            $this->key('research-summary', [], $this->version(self::RESEARCH_VERSION_KEY)),
            now()->addSeconds((int) config('rikms.public_cache.summary_ttl_seconds', 300)),
            $callback,
        );
    }

    public function rememberAgency(string $endpoint, array $parameters, Closure $callback): mixed
    {
        return Cache::remember(
            $this->key($endpoint, $parameters, $this->version(self::AGENCY_VERSION_KEY).'-'.$this->version(self::RESEARCH_VERSION_KEY)),
            now()->addSeconds((int) config('rikms.public_cache.agency_ttl_seconds', 300)),
            $callback,
        );
    }

    public function invalidateResearch(): void
    {
        $this->increment(self::RESEARCH_VERSION_KEY);
    }

    public function invalidateAgencies(): void
    {
        $this->increment(self::AGENCY_VERSION_KEY);
    }

    public function key(string $endpoint, array $parameters, string|int $version): string
    {
        ksort($parameters);

        return 'public-cache:'.$endpoint.':'.$version.':'.hash('sha256', json_encode([
            'locale' => app()->getLocale(),
            'parameters' => $parameters,
        ], JSON_THROW_ON_ERROR));
    }

    private function version(string $key): int
    {
        return (int) Cache::get($key, 1);
    }

    private function increment(string $key): void
    {
        try {
            if (! Cache::has($key)) {
                Cache::forever($key, 1);
            }

            Cache::increment($key);
        } catch (Throwable $exception) {
            Log::warning('Public response cache invalidation failed.', [
                'key' => $key,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
