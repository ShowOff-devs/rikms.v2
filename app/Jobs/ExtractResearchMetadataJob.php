<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExtractResearchMetadataJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(): void
    {
        // Deferred: write AI metadata suggestions to MongoDB collection ai_metadata.
    }
}
