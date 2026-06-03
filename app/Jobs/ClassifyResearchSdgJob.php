<?php

namespace App\Jobs;

use App\Services\AiPipelineResultWriter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ClassifyResearchSdgJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(AiPipelineResultWriter $writer): void
    {
        $writer->writeSdgClassificationResult(
            $this->researchId,
            $this->fileId,
            $this->agencyId,
            $this->uploadedByUserId,
        );
    }
}
