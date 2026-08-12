<?php

namespace App\Console\Commands;

use App\Models\CspViolationReport;
use Illuminate\Console\Command;

class PruneCspReports extends Command
{
    protected $signature = 'csp:prune-reports';

    protected $description = 'Delete CSP violation aggregates older than the configured retention period';

    public function handle(): int
    {
        $retentionDays = max(1, (int) config('security_headers.csp.collector.retention_days', 30));
        $deleted = CspViolationReport::query()
            ->where('last_seen_at', '<', now()->subDays($retentionDays))
            ->delete();

        $this->info("Pruned {$deleted} expired CSP report aggregate(s).");

        return self::SUCCESS;
    }
}
