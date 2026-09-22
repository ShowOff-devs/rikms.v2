<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PlatformSettingsService
{
    public const ACCESS_REQUESTS_ENABLED = 'access_requests.enabled';

    public const AI_PROCESSING_ENABLED = 'ai.processing.enabled';

    public const MAINTENANCE_ENABLED = 'maintenance.enabled';

    public const MAINTENANCE_NOTICE_TEXT = 'maintenance.notice_text';

    public const REQUIRE_SUPER_ADMIN_MFA = 'security.require_mfa_super_admins';

    public const SESSION_TIMEOUT_MINUTES = 'security.session_timeout_minutes';

    public const UPLOAD_MAX_FILE_SIZE_MB = 'uploads.max_file_size_mb';

    /**
     * @return array<string, mixed>
     */
    public function allDefinitions(): array
    {
        return config('platform_settings.settings', []);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function definition(string $key): ?array
    {
        $definition = $this->allDefinitions()[$key] ?? null;

        return is_array($definition) ? $definition : null;
    }

    public function has(string $key): bool
    {
        return $this->definition($key) !== null;
    }

    /**
     * @return array<int, string>
     */
    public function keys(): array
    {
        return array_keys($this->allDefinitions());
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $definition = $this->definition($key);

        if (! $definition) {
            return $default;
        }

        $values = $this->cachedValues();

        return array_key_exists($key, $values)
            ? $values[$key]
            : ($default ?? ($definition['default'] ?? null));
    }

    public function boolean(string $key, bool $default = false): bool
    {
        $value = $this->get($key, $default);

        return is_bool($value) ? $value : $default;
    }

    public function enabled(string $key, bool $default = false): bool
    {
        return $this->boolean($key, $default);
    }

    public function integer(string $key, int $default = 0): int
    {
        $value = $this->get($key, $default);

        return is_int($value) ? $value : $default;
    }

    public function string(string $key, string $default = ''): string
    {
        $value = $this->get($key, $default);

        return is_string($value) ? $value : $default;
    }

    public function forgetCache(): void
    {
        Cache::forget($this->cacheKey());
    }

    public function accessRequestsEnabled(): bool
    {
        if (! (bool) config('rikms.public_access_requests.enabled', true)) {
            return false;
        }

        return $this->boolean(self::ACCESS_REQUESTS_ENABLED, true);
    }

    public function aiProcessingEnabled(): bool
    {
        return $this->boolean(self::AI_PROCESSING_ENABLED, false);
    }

    public function maintenanceEnabled(): bool
    {
        return $this->boolean(self::MAINTENANCE_ENABLED, false);
    }

    public function superAdminMfaRequired(): bool
    {
        return (bool) config('rikms.security.force_super_admin_mfa', true)
            || $this->boolean(self::REQUIRE_SUPER_ADMIN_MFA, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function metadataFor(string $key): array
    {
        $definition = $this->definition($key) ?? [];

        return [
            'default' => $definition['default'] ?? null,
            'min' => $definition['min'] ?? null,
            'max' => $definition['max'] ?? null,
            'options' => $definition['options'] ?? null,
            'operational' => (bool) ($definition['operational'] ?? false),
            'enforced' => (bool) ($definition['enforced'] ?? false),
            'requires_restart' => (bool) ($definition['requires_restart'] ?? false),
            'read_only' => (bool) ($definition['read_only'] ?? false),
            'status' => $definition['status'] ?? 'unknown',
            'effective_value' => $this->effectiveValue($key),
        ];
    }

    public function effectiveValue(string $key): mixed
    {
        if ($key === self::UPLOAD_MAX_FILE_SIZE_MB) {
            return app(UploadLimitService::class)->effectiveUploadLimitMb();
        }

        if ($key === self::ACCESS_REQUESTS_ENABLED) {
            return $this->accessRequestsEnabled();
        }

        if ($key === self::REQUIRE_SUPER_ADMIN_MFA) {
            return $this->superAdminMfaRequired();
        }

        return $this->get($key);
    }

    public function normalize(string $key, mixed $value): mixed
    {
        $definition = $this->definition($key);

        if (! $definition) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'Unknown platform setting.',
            ]);
        }

        if (($definition['read_only'] ?? false) === true) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'This platform setting is read-only.',
            ]);
        }

        $type = (string) ($definition['type'] ?? 'string');
        $normalized = match ($type) {
            'boolean' => $this->normalizeBoolean($key, $value),
            'integer' => $this->normalizeInteger($key, $value, $definition),
            'json' => $this->normalizeJson($key, $value),
            default => $this->normalizeString($key, $value, $definition),
        };

        if (isset($definition['options']) && is_array($definition['options'])) {
            $values = $type === 'json' && is_array($normalized) ? $normalized : [$normalized];
            $invalid = collect($values)
                ->reject(fn (mixed $item): bool => in_array($item, $definition['options'], true))
                ->values();

            if ($invalid->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'settings.'.$key => 'The selected value is not supported.',
                ]);
            }
        }

        return $normalized;
    }

    public function serialize(string $key, mixed $value): ?string
    {
        $type = (string) ($this->definition($key)['type'] ?? 'string');

        if ($value === null) {
            return null;
        }

        return match ($type) {
            'boolean' => $value ? 'true' : 'false',
            'json' => json_encode($value),
            default => (string) $value,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function cachedValues(): array
    {
        try {
            return Cache::remember($this->cacheKey(), $this->cacheTtl(), fn (): array => $this->loadValues());
        } catch (\Throwable $exception) {
            Log::warning('Platform settings cache unavailable; loading uncached settings.', [
                'error' => $exception->getMessage(),
            ]);

            return $this->loadValues();
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function loadValues(): array
    {
        $definitions = $this->allDefinitions();
        $records = PlatformSetting::query()
            ->whereIn('key', array_keys($definitions))
            ->get(['key', 'value', 'type'])
            ->keyBy('key');

        $values = [];

        foreach ($definitions as $key => $definition) {
            $record = $records->get($key);
            $rawValue = $record?->value;

            try {
                $values[$key] = $rawValue === null
                    ? ($definition['default'] ?? null)
                    : $this->castStoredValue($rawValue, (string) ($definition['type'] ?? 'string'), $definition);
            } catch (\Throwable $exception) {
                Log::warning('Malformed platform setting value ignored.', [
                    'key' => $key,
                    'error' => $exception->getMessage(),
                ]);

                $values[$key] = $definition['default'] ?? null;
            }
        }

        return $values;
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function castStoredValue(string $value, string $type, array $definition): mixed
    {
        return match ($type) {
            'boolean' => $this->castStoredBoolean($value),
            'integer' => $this->clampInteger((int) $this->validatedInteger($value), $definition),
            'json' => $this->validatedJson($value),
            default => $value,
        };
    }

    private function castStoredBoolean(string $value): bool
    {
        $result = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        if ($result === null) {
            throw new \UnexpectedValueException('Invalid boolean value.');
        }

        return $result;
    }

    private function validatedInteger(mixed $value): int
    {
        $result = filter_var($value, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE);

        if ($result === null) {
            throw new \UnexpectedValueException('Invalid integer value.');
        }

        return (int) $result;
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function clampInteger(int $value, array $definition): int
    {
        if (isset($definition['min']) && $value < (int) $definition['min']) {
            return (int) $definition['min'];
        }

        if (isset($definition['max']) && $value > (int) $definition['max']) {
            return (int) $definition['max'];
        }

        return $value;
    }

    private function validatedJson(string $value): mixed
    {
        $decoded = json_decode($value, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \UnexpectedValueException('Invalid JSON value.');
        }

        return $decoded;
    }

    private function normalizeBoolean(string $key, mixed $value): bool
    {
        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        if ($normalized === null) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'Enter a valid boolean value.',
            ]);
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function normalizeInteger(string $key, mixed $value, array $definition): int
    {
        $normalized = filter_var($value, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE);

        if ($normalized === null) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'Enter a valid integer value.',
            ]);
        }

        $normalized = (int) $normalized;

        if (isset($definition['min']) && $normalized < (int) $definition['min']) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'The value is below the supported minimum.',
            ]);
        }

        if (isset($definition['max']) && $normalized > (int) $definition['max']) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'The value is above the supported maximum.',
            ]);
        }

        return $normalized;
    }

    private function normalizeJson(string $key, mixed $value): mixed
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        if (is_array($value)) {
            return $value;
        }

        throw ValidationException::withMessages([
            'settings.'.$key => 'Enter a valid JSON value.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function normalizeString(string $key, mixed $value, array $definition): ?string
    {
        if ($value === null) {
            return null;
        }

        if (! is_scalar($value)) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'Enter a valid text value.',
            ]);
        }

        $value = trim((string) $value);
        $max = (int) ($definition['max_length'] ?? 2000);

        if (mb_strlen($value) > $max) {
            throw ValidationException::withMessages([
                'settings.'.$key => 'The value is too long.',
            ]);
        }

        if ($key === 'site.logo_url' && $value !== '') {
            $isRelativeUpload = str_starts_with($value, '/storage/platform/logos/');
            $isHttpsUrl = filter_var($value, FILTER_VALIDATE_URL)
                && parse_url($value, PHP_URL_SCHEME) === 'https';

            if (! $isRelativeUpload && ! $isHttpsUrl) {
                throw ValidationException::withMessages([
                    'settings.'.$key => 'Use an uploaded platform logo or a valid HTTPS image URL.',
                ]);
            }
        }

        return $value;
    }

    private function cacheKey(): string
    {
        return (string) config('platform_settings.cache_key', 'rikms.platform_settings');
    }

    private function cacheTtl(): int
    {
        return (int) config('platform_settings.cache_ttl_seconds', 300);
    }
}
