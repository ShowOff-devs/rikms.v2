<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ParsePdfDocumentJob implements ShouldQueue
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
        // Deferred: write PDF parsing output to MongoDB collection pdf_parsing_results.
    }
}
