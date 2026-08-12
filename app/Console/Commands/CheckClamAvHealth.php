<?php

namespace App\Console\Commands;

use App\Services\MalwareScanner\ClamAvReadinessService;
use Illuminate\Console\Command;

class CheckClamAvHealth extends Command
{
    protected $signature = 'rikms:clamav-check';

    protected $description = 'Verify ClamAV configuration, stream capacity, daemon response, and signature engine version';

    public function handle(ClamAvReadinessService $readiness): int
    {
        $status = $readiness->status();
        $checks = [
            ['ClamAV scanner is enabled', $status['enabled']],
            ['Endpoint configuration is valid', $status['configured']],
            ['Stream limit covers the effective upload limit', $status['stream_limit_compatible']],
            ['clamd responds to PING', $status['responding']],
        ];

        $this->table(
            ['Check', 'Result'],
            array_map(fn (array $check): array => [$check[0], $check[1] ? 'PASS' : 'FAIL'], $checks),
        );
        $this->line('Endpoint: '.$status['endpoint']);
        $this->line("Stream/upload limit: {$status['stream_max_mb']} MB / {$status['effective_upload_max_mb']} MB");
        $this->line('Engine: '.($status['version'] ?? 'unavailable'));

        if (! $status['healthy']) {
            $this->error('ClamAV readiness check failed: '.$status['reason'].'.');

            return self::FAILURE;
        }

        $this->info('ClamAV is ready for upload scanning.');

        return self::SUCCESS;
    }
}
