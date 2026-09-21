<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class InfrastructureReadinessService
{
    public function __construct(
        private readonly QueueHealthService $queueHealth,
        private readonly BackupReadinessService $backupReadiness,
        private readonly MongoIndexReadinessService $mongoIndexes,
    ) {}

    /** @return array{status: string, checks: array<int, array<string, string>>, checked_at: string} */
    public function report(bool $write = false): array
    {
        $checks = [];
        $this->databaseCheck($checks);
        $this->migrationCheck($checks);
        $this->mongoCheck($checks, $write);
        $this->redisCheck($checks, $write);
        $this->queueCheck($checks);
        $this->storageChecks($checks, $write);
        $this->backupCheck($checks, $write);

        return [
            'status' => collect($checks)->contains(fn (array $check): bool => $check['status'] === 'failed')
                ? 'failed'
                : 'ready',
            'checks' => $checks,
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /** @param array<int, array<string, string>> $checks */
    private function backupCheck(array &$checks, bool $write): void
    {
        if (! config('infrastructure.require_backup_ready')) {
            $this->add($checks, 'backup', 'skipped', 'Backup readiness is not required in this environment.');

            return;
        }

        try {
            $status = $this->backupReadiness->inspect($write);
            $ready = ($status['ready_for_test_backup'] ?? false) === true;

            $this->add(
                $checks,
                'backup',
                $ready ? 'ready' : 'failed',
                $ready
                    ? ($write ? 'Backup destination write/read/delete probe succeeded.' : 'Backup destination and encryption configuration are ready.')
                    : 'Backup destination, capacity, encryption, or write-probe readiness failed.',
            );
        } catch (Throwable) {
            $this->add($checks, 'backup', 'failed', 'Backup readiness could not be inspected.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function databaseCheck(array &$checks): void
    {
        try {
            DB::connection()->getPdo();
            $this->add($checks, 'database', 'ready', 'Relational database connection succeeded.');
        } catch (Throwable) {
            $this->add($checks, 'database', 'failed', 'Relational database connection failed.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function migrationCheck(array &$checks): void
    {
        try {
            $migrator = app('migrator');
            $files = array_keys($migrator->getMigrationFiles(database_path('migrations')));
            $ran = $migrator->repositoryExists() ? $migrator->getRepository()->getRan() : [];
            $pending = array_values(array_diff($files, $ran));
            $this->add(
                $checks,
                'migrations',
                $pending === [] ? 'ready' : 'failed',
                $pending === [] ? 'All repository migrations are applied.' : count($pending).' migration(s) are pending.',
            );
        } catch (Throwable) {
            $this->add($checks, 'migrations', 'failed', 'Migration state could not be inspected.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function mongoCheck(array &$checks, bool $write): void
    {
        $configured = filled(config('database.connections.mongodb.dsn'));
        $required = (bool) config('infrastructure.require_mongodb');

        if (! $configured) {
            $this->add(
                $checks,
                'mongodb',
                $required ? 'failed' : 'skipped',
                $required ? 'MongoDB is required but MONGODB_URI is missing.' : 'MongoDB is optional and not configured.',
            );

            return;
        }

        try {
            DB::connection('mongodb')->getDatabase()->command(['ping' => 1])->toArray();
            $indexes = $this->mongoIndexes->inspect($write);

            if (! $indexes['ready']) {
                $issueCount = count($indexes['missing']) + count($indexes['mismatched']);
                $this->add($checks, 'mongodb', 'failed', "MongoDB is reachable but {$issueCount} required index definition(s) are missing or mismatched.");

                return;
            }

            $created = count($indexes['created']);
            $message = $created > 0
                ? "MongoDB connection succeeded and {$created} missing index(es) were created."
                : 'MongoDB connection and required indexes are ready.';
            $this->add($checks, 'mongodb', 'ready', $message);
        } catch (Throwable) {
            $this->add($checks, 'mongodb', 'failed', 'MongoDB connection or index verification failed.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function redisCheck(array &$checks, bool $write): void
    {
        $usesRedis = config('queue.connections.'.config('queue.default').'.driver') === 'redis'
            || config('cache.stores.'.config('cache.default').'.driver') === 'redis'
            || config('session.driver') === 'redis';

        if (! $usesRedis) {
            $this->add($checks, 'redis', 'skipped', 'Redis is not selected by queue, cache, or session configuration.');

            return;
        }

        try {
            Redis::connection()->ping();

            if ($write) {
                $key = 'rikms:health:'.Str::uuid();
                Cache::put($key, 'ready', 30);
                $roundTrip = Cache::get($key) === 'ready';
                Cache::forget($key);

                if (! $roundTrip) {
                    throw new \RuntimeException('Cache round-trip failed.');
                }
            }

            $this->add($checks, 'redis', 'ready', $write ? 'Redis ping and cache round-trip succeeded.' : 'Redis ping succeeded.');
        } catch (Throwable) {
            $this->add($checks, 'redis', 'failed', 'Redis connectivity check failed.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function queueCheck(array &$checks): void
    {
        try {
            $snapshot = $this->queueHealth->snapshot();
            $this->add($checks, 'queue', 'ready', "Queue [{$snapshot['connection']}] is reachable using {$snapshot['driver']}.");
        } catch (Throwable) {
            $this->add($checks, 'queue', 'failed', 'Queue backend or failed-job storage is unavailable.');
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function storageChecks(array &$checks, bool $write): void
    {
        $disks = array_unique([
            (string) config('rikms.uploads.quarantine_disk'),
            (string) config('rikms.uploads.storage_disk'),
        ]);

        foreach ($disks as $disk) {
            $configuration = config("filesystems.disks.{$disk}");

            if (! is_array($configuration)) {
                $this->add($checks, 'storage_'.$disk, 'failed', "Storage disk [{$disk}] is not configured.");

                continue;
            }

            if ((bool) config('infrastructure.require_remote_storage') && ($configuration['driver'] ?? null) === 'local') {
                $this->add($checks, 'storage_'.$disk, 'failed', "Storage disk [{$disk}] must use a remote driver.");

                continue;
            }

            if (! $write) {
                try {
                    Storage::disk($disk);
                    $this->add($checks, 'storage_'.$disk, 'ready', "Storage disk [{$disk}] configuration loaded; write probe was not requested.");
                } catch (Throwable) {
                    $this->add($checks, 'storage_'.$disk, 'failed', "Storage disk [{$disk}] could not be initialized.");
                }

                continue;
            }

            $this->storageRoundTrip($checks, $disk);
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function storageRoundTrip(array &$checks, string $disk): void
    {
        $prefix = (string) config('infrastructure.healthcheck_prefix', '.rikms-health');
        $path = trim($prefix, '/').'/'.Str::uuid().'.txt';
        $filesystem = Storage::disk($disk);

        try {
            $stored = $filesystem->put($path, 'rikms-readiness');
            $verified = $stored && $filesystem->get($path) === 'rikms-readiness';

            if (! $verified) {
                throw new \RuntimeException('Storage round-trip failed.');
            }

            if (! $filesystem->delete($path) || $filesystem->exists($path)) {
                throw new \RuntimeException('Storage cleanup failed.');
            }

            $this->add($checks, 'storage_'.$disk, 'ready', "Storage disk [{$disk}] write/read/delete probe succeeded.");
        } catch (Throwable) {
            $this->add($checks, 'storage_'.$disk, 'failed', "Storage disk [{$disk}] write/read probe failed.");
        } finally {
            try {
                if ($filesystem->exists($path)) {
                    $filesystem->delete($path);
                }
            } catch (Throwable) {
                // Reconciliation will report a health probe object if cleanup is interrupted.
            }
        }
    }

    /** @param array<int, array<string, string>> $checks */
    private function add(array &$checks, string $id, string $status, string $message): void
    {
        $checks[] = compact('id', 'status', 'message');
    }
}
