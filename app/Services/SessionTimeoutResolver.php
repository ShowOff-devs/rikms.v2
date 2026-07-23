<?php

namespace App\Services;

class SessionTimeoutResolver
{
    public const DEFAULT_MINUTES = 60;

    public function __construct(private readonly PlatformSettingsService $settings) {}

    /** @param array<string, mixed> $preferences */
    public function resolve(array $preferences = []): int
    {
        $userTimeout = $this->valid($preferences['sessionTimeout'] ?? null);
        if ($userTimeout !== null) {
            return $userTimeout;
        }

        $platformTimeout = $this->valid(
            $this->settings->integer(PlatformSettingsService::SESSION_TIMEOUT_MINUTES, 0),
        );
        if ($platformTimeout !== null) {
            return $platformTimeout;
        }

        $configuredTimeout = $this->valid(config('session.lifetime'));

        return $configuredTimeout ?? self::DEFAULT_MINUTES;
    }

    private function valid(mixed $value): ?int
    {
        $value = filter_var($value, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE);

        return $value !== null && $value >= 5 && $value <= 240 ? (int) $value : null;
    }
}
