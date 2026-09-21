<?php

namespace App\Console\Commands;

use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use App\Models\Research;
use App\Models\ResearchFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReconcileStorage extends Command
{
    protected $signature = 'rikms:storage-reconcile
        {--repair : Remove unreferenced/stale objects and mark missing metadata records}
        {--quarantine-hours=24 : Minimum age for abandoned quarantine objects}';

    protected $description = 'Reconcile research metadata, private objects, quarantine objects, and MongoDB AI results';

    public function handle(): int
    {
        $repair = (bool) $this->option('repair');

        if ($repair && ! config('rikms.uploads.reconciliation_repair_enabled')) {
            $this->error('Repair is disabled. Review a dry run, then set STORAGE_RECONCILIATION_REPAIR_ENABLED=true.');

            return self::FAILURE;
        }

        $counts = [
            'missing_objects' => 0,
            'unreferenced_objects' => 0,
            'stale_quarantine_objects' => 0,
            'orphaned_ai_results' => 0,
            'ai_status_mismatches' => 0,
            'check_errors' => 0,
            'repaired' => 0,
        ];

        $references = $this->inspectMetadata($counts, $repair);
        $this->inspectPrivateObjects($references, $counts, $repair);
        $this->inspectQuarantine($counts, $repair);
        $this->inspectMongo($counts, $repair);

        $this->table(['Check', 'Count'], collect($counts)->map(fn (int $count, string $key): array => [$key, $count])->values()->all());

        $issues = $counts['missing_objects']
            + $counts['unreferenced_objects']
            + $counts['stale_quarantine_objects']
            + $counts['orphaned_ai_results']
            + $counts['ai_status_mismatches']
            + $counts['check_errors'];

        if ($issues === 0) {
            $this->info('Storage metadata and objects are consistent.');

            return self::SUCCESS;
        }

        $repair ? $this->warn('Storage inconsistencies were repaired where safe.') : $this->warn('Storage inconsistencies found; no changes were made.');

        return $repair && $counts['repaired'] >= $issues ? self::SUCCESS : self::FAILURE;
    }

    /** @param array<string, int> $counts @return array<string, true> */
    private function inspectMetadata(array &$counts, bool $repair): array
    {
        $references = [];

        ResearchFile::withTrashed()->orderBy('id')->chunkById(250, function ($files) use (&$counts, &$references, $repair): void {
            foreach ($files as $file) {
                $key = $file->disk.'|'.$file->path;

                if ($file->status !== 'deleted') {
                    $references[$key] = true;
                }

                if ($file->status === 'deleted') {
                    continue;
                }

                try {
                    $exists = Storage::disk($file->disk)->exists($file->path);
                } catch (Throwable) {
                    $exists = false;
                }

                if ($exists) {
                    continue;
                }

                $counts['missing_objects']++;

                if ($repair) {
                    $metadata = is_array($file->metadata) ? $file->metadata : [];
                    $metadata['storage_reconciliation'] = [
                        'status' => 'missing',
                        'checked_at' => now()->toISOString(),
                    ];
                    $file->forceFill(['status' => 'missing', 'metadata' => $metadata])->save();
                    $counts['repaired']++;
                }
            }
        });

        return $references;
    }

    /** @param array<string, true> $references @param array<string, int> $counts */
    private function inspectPrivateObjects(array $references, array &$counts, bool $repair): void
    {
        $diskName = (string) config('rikms.uploads.storage_disk', 'private_uploads');

        try {
            foreach (Storage::disk($diskName)->allFiles('research') as $path) {
                if ($diskName === (string) config('rikms.uploads.quarantine_disk')
                    && str_starts_with($path, 'research/quarantine/')) {
                    continue;
                }

                if (isset($references[$diskName.'|'.$path])) {
                    continue;
                }

                $counts['unreferenced_objects']++;

                if ($repair && Storage::disk($diskName)->delete($path)) {
                    $counts['repaired']++;
                }
            }
        } catch (Throwable $exception) {
            $counts['check_errors']++;
            $this->warn('Private storage could not be enumerated: '.$exception->getMessage());
        }
    }

    /** @param array<string, int> $counts */
    private function inspectQuarantine(array &$counts, bool $repair): void
    {
        $diskName = (string) config('rikms.uploads.quarantine_disk', 'upload_quarantine');
        $hours = max(1, (int) $this->option('quarantine-hours'));
        $cutoff = now()->subHours($hours)->timestamp;

        try {
            foreach (Storage::disk($diskName)->allFiles('research/quarantine') as $path) {
                if (Storage::disk($diskName)->lastModified($path) > $cutoff) {
                    continue;
                }

                $counts['stale_quarantine_objects']++;

                if ($repair && Storage::disk($diskName)->delete($path)) {
                    $counts['repaired']++;
                }
            }
        } catch (Throwable $exception) {
            $counts['check_errors']++;
            $this->warn('Quarantine storage could not be enumerated: '.$exception->getMessage());
        }
    }

    /** @param array<string, int> $counts */
    private function inspectMongo(array &$counts, bool $repair): void
    {
        if (! filled(config('database.connections.mongodb.dsn'))) {
            return;
        }

        try {
            foreach ($this->mongoPipelines() as $model => $pipeline) {
                $model::query()->orderBy('_id')->chunk(250, function ($results) use (&$counts, $repair, $pipeline): void {
                    foreach ($results as $result) {
                        $fileExists = $result->file_id && ResearchFile::withTrashed()->whereKey($result->file_id)->exists();
                        $researchExists = $result->research_id && Research::withTrashed()->whereKey($result->research_id)->exists();

                        if ($fileExists && $researchExists) {
                            $this->reconcileAiStatus((int) $result->file_id, $pipeline, (string) $result->processing_status, $counts, $repair);

                            continue;
                        }

                        $counts['orphaned_ai_results']++;

                        if ($repair) {
                            $result->delete();
                            $counts['repaired']++;
                        }
                    }
                });
            }
        } catch (Throwable $exception) {
            $counts['check_errors']++;
            $this->warn('MongoDB AI results could not be reconciled: '.$exception->getMessage());
        }
    }

    /** @param array<string, int> $counts */
    private function reconcileAiStatus(int $fileId, string $pipeline, string $status, array &$counts, bool $repair): void
    {
        $file = ResearchFile::withTrashed()->find($fileId);
        $metadata = is_array($file?->metadata) ? $file->metadata : [];
        $current = $metadata['ai_processing'][$pipeline]['status'] ?? null;

        if ($current === $status) {
            return;
        }

        $counts['ai_status_mismatches']++;

        if (! $repair || ! $file) {
            return;
        }

        $metadata['ai_processing'] = is_array($metadata['ai_processing'] ?? null) ? $metadata['ai_processing'] : [];
        $metadata['ai_processing'][$pipeline] = [
            'status' => $status,
            'message' => 'Reconciled from the stored AI result.',
            'updated_at' => now()->toISOString(),
        ];
        $file->forceFill(['metadata' => $metadata])->save();
        $counts['repaired']++;
    }

    /** @return array<class-string, string> */
    private function mongoPipelines(): array
    {
        return [
            PdfParsingResult::class => 'pdf_parsing',
            AiMetadata::class => 'ai_metadata',
            SdgClassification::class => 'sdg_classification',
        ];
    }
}
