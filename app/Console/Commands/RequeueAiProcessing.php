<?php

namespace App\Console\Commands;

use App\Models\ResearchFile;
use App\Services\AiPipelineDispatcher;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use App\Services\ResearchFileStorage;
use Illuminate\Console\Command;
use Throwable;

class RequeueAiProcessing extends Command
{
    protected $signature = 'rikms:ai-requeue {file : Research file ID}';

    protected $description = 'Requeue the idempotent PDF, metadata, and SDG processing chain for a research file';

    public function handle(
        AiPipelineDispatcher $dispatcher,
        AiPipelineResultWriter $writer,
        PlatformSettingsService $settings,
        ResearchFileStorage $storage,
    ): int {
        $fileId = (string) $this->argument('file');

        if (! ctype_digit($fileId) || (int) $fileId < 1) {
            $this->error('The research file ID must be a positive integer.');

            return self::FAILURE;
        }

        $file = ResearchFile::query()->find((int) $fileId);

        if (! $file || $file->status !== 'active' || $file->archived_at !== null) {
            $this->error('Only an active, non-archived research file can be requeued.');

            return self::FAILURE;
        }

        if (! $storage->exists($file)) {
            $this->error('The research file object is missing from storage.');

            return self::FAILURE;
        }

        if (! $settings->aiProcessingEnabled()) {
            $this->error('AI-assisted processing is disabled in platform settings.');

            return self::FAILURE;
        }

        $writer->markAiProcessingQueued((int) $file->id);

        try {
            $dispatcher->dispatch($file);
        } catch (Throwable $exception) {
            $writer->markAiProcessingFailed((int) $file->id, 'AI processing could not be requeued.');
            report($exception);
            $this->error('AI processing could not be requeued.');

            return self::FAILURE;
        }

        $this->info("AI processing requeued for research file {$file->id}.");

        return self::SUCCESS;
    }
}
