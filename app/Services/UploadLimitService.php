<?php

namespace App\Services;

class UploadLimitService
{
    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function configuredUploadLimitMb(): int
    {
        return $this->settings->integer(PlatformSettingsService::UPLOAD_MAX_FILE_SIZE_MB, 25);
    }

    public function effectiveUploadLimitMb(): int
    {
        $serverLimit = $this->serverUploadLimitMb();

        return max(1, min($this->configuredUploadLimitMb(), $serverLimit));
    }

    public function effectiveUploadLimitKb(): int
    {
        return $this->effectiveUploadLimitMb() * 1024;
    }

    public function message(): string
    {
        $limit = $this->effectiveUploadLimitMb();

        return "The PDF must not be larger than {$limit} MB.";
    }

    public function uploadedMessage(): string
    {
        $limit = $this->effectiveUploadLimitMb();

        return "The PDF could not be uploaded. Check that PHP upload_max_filesize and post_max_size allow at least {$limit}M, then restart the web server.";
    }

    /**
     * @return array<string, int>
     */
    public function limits(): array
    {
        return [
            'configured_mb' => $this->configuredUploadLimitMb(),
            'php_upload_max_filesize_mb' => $this->iniBytesToMb((string) ini_get('upload_max_filesize')),
            'php_post_max_size_mb' => $this->iniBytesToMb((string) ini_get('post_max_size')),
            'effective_mb' => $this->effectiveUploadLimitMb(),
        ];
    }

    private function serverUploadLimitMb(): int
    {
        $limits = collect([
            $this->iniBytesToMb((string) ini_get('upload_max_filesize')),
            $this->iniBytesToMb((string) ini_get('post_max_size')),
        ])->filter(fn (int $value): bool => $value > 0);

        return max(1, (int) ($limits->min() ?? 25));
    }

    private function iniBytesToMb(string $value): int
    {
        $value = trim($value);

        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = is_numeric($unit) ? (float) $value : (float) substr($value, 0, -1);

        $bytes = match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };

        return (int) max(1, floor($bytes / 1024 / 1024));
    }
}
