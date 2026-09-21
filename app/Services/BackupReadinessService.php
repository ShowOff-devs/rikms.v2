<?php

namespace App\Services;

use Throwable;

class BackupReadinessService
{
    /** @return array<string, mixed> */
    public function inspect(bool $write = false): array
    {
        $configuredPath = trim((string) config('backup.destination_path'));
        $minimumFreeBytes = max(1, (int) config('backup.minimum_free_space_mb', 10240)) * 1024 * 1024;
        $pathConfigured = $configuredPath !== '';
        $destinationExists = $pathConfigured && is_dir($configuredPath);
        $destinationWritable = $destinationExists && is_writable($configuredPath);
        $outsideApplication = $destinationExists && $this->isOutsideApplication($configuredPath);
        $separateFilesystem = $destinationExists && $this->isSeparateFilesystem($configuredPath);
        $requireSeparateFilesystem = (bool) config('backup.require_separate_filesystem', true);
        $safeDestination = $outsideApplication && (! $requireSeparateFilesystem || $separateFilesystem);
        $freeBytes = $destinationExists ? $this->freeBytes($configuredPath) : null;
        $hasCapacity = $freeBytes !== null && $freeBytes >= $minimumFreeBytes;
        $encryptionReady = $this->validEncryptionKey((string) config('backup.encryption_key'));

        $ready = $pathConfigured
            && $destinationExists
            && $destinationWritable
            && $safeDestination
            && $hasCapacity
            && $encryptionReady;
        $writeProbeSucceeded = $write && $ready
            ? $this->writeProbe($configuredPath)
            : null;

        if ($write) {
            $ready = $ready && $writeProbeSucceeded === true;
        }

        return [
            'status' => $this->status(
                $pathConfigured,
                $destinationExists,
                $destinationWritable,
                $safeDestination,
                $hasCapacity,
                $encryptionReady,
                $write,
                $writeProbeSucceeded,
            ),
            'ready_for_test_backup' => $ready,
            'execution_enabled' => (bool) config('backup.execution_enabled', false),
            'destination' => [
                'configured' => $pathConfigured,
                'display' => $pathConfigured ? $this->maskedPath($configuredPath) : 'Not configured',
                'connected' => $destinationExists,
                'writable' => $destinationWritable,
                'outside_application' => $outsideApplication,
                'separate_filesystem' => $separateFilesystem,
                'separate_filesystem_required' => $requireSeparateFilesystem,
                'free_space_mb' => $freeBytes === null ? null : (int) floor($freeBytes / 1024 / 1024),
                'minimum_free_space_mb' => (int) floor($minimumFreeBytes / 1024 / 1024),
            ],
            'encryption_key_configured' => $encryptionReady,
            'write_probe' => [
                'performed' => $write && $writeProbeSucceeded !== null,
                'succeeded' => $writeProbeSucceeded,
            ],
            'checked_at' => now()->toISOString(),
        ];
    }

    private function status(
        bool $pathConfigured,
        bool $destinationExists,
        bool $destinationWritable,
        bool $safeDestination,
        bool $hasCapacity,
        bool $encryptionReady,
        bool $write,
        ?bool $writeProbeSucceeded,
    ): string {
        return match (true) {
            ! $pathConfigured => 'destination_not_configured',
            ! $destinationExists => 'destination_not_connected',
            ! $safeDestination => 'destination_is_not_external',
            ! $destinationWritable => 'destination_not_writable',
            ! $hasCapacity => 'insufficient_free_space',
            ! $encryptionReady => 'encryption_key_not_configured',
            $write && $writeProbeSucceeded !== true => 'destination_probe_failed',
            default => 'ready_for_test_backup',
        };
    }

    private function writeProbe(string $path): bool
    {
        $probe = rtrim($path, '\\/').DIRECTORY_SEPARATOR.'.rikms-backup-health-'.bin2hex(random_bytes(16)).'.tmp';
        $payload = random_bytes(32);

        try {
            $written = file_put_contents($probe, $payload, LOCK_EX);

            if ($written !== strlen($payload) || file_get_contents($probe) !== $payload) {
                return false;
            }

            return unlink($probe) && ! file_exists($probe);
        } catch (Throwable) {
            return false;
        } finally {
            if (is_file($probe)) {
                @unlink($probe);
            }
        }
    }

    private function isOutsideApplication(string $path): bool
    {
        $resolved = realpath($path);

        if ($resolved === false) {
            return false;
        }

        $candidate = $this->normalizePath($resolved);

        foreach ([base_path(), storage_path(), public_path()] as $applicationPath) {
            $root = $this->normalizePath((string) (realpath($applicationPath) ?: $applicationPath));

            if ($candidate === $root || str_starts_with($candidate, $root.'/')) {
                return false;
            }
        }

        return true;
    }

    private function normalizePath(string $path): string
    {
        $normalized = str_replace('\\', '/', rtrim($path, '\\/'));

        return PHP_OS_FAMILY === 'Windows' ? mb_strtolower($normalized) : $normalized;
    }

    private function isSeparateFilesystem(string $path): bool
    {
        try {
            $destination = stat($path);
            $application = stat(base_path());

            return is_array($destination)
                && is_array($application)
                && isset($destination['dev'], $application['dev'])
                && $destination['dev'] !== $application['dev'];
        } catch (Throwable) {
            return false;
        }
    }

    private function freeBytes(string $path): ?int
    {
        try {
            $bytes = disk_free_space($path);

            return $bytes === false ? null : max(0, (int) $bytes);
        } catch (Throwable) {
            return null;
        }
    }

    private function validEncryptionKey(string $key): bool
    {
        $key = trim($key);

        if ($key === '') {
            return false;
        }

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(mb_substr($key, 7), true);

            return is_string($decoded) && strlen($decoded) >= 32;
        }

        return strlen($key) >= 32;
    }

    private function maskedPath(string $path): string
    {
        $normalized = str_replace('\\', '/', rtrim($path, '\\/'));
        $leaf = basename($normalized);

        if (preg_match('/^[A-Za-z]:\//', $normalized) === 1) {
            return mb_substr($normalized, 0, 2).'/…/'.$leaf;
        }

        return '…/'.$leaf;
    }
}
