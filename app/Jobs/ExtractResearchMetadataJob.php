<?php

namespace App\Jobs;

use App\Services\AI\OpenAiResearchMetadataExtractor;
use App\Services\AiPipelineResultWriter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExtractResearchMetadataJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(AiPipelineResultWriter $writer, ?OpenAiResearchMetadataExtractor $extractor = null): void
    {
        $extractor ??= app(OpenAiResearchMetadataExtractor::class);
        $text = null;

        try {
            $text = $writer->latestExtractedPdfText($this->researchId, $this->fileId, $this->agencyId);
        } catch (Throwable $exception) {
            Log::warning('Unable to read latest PDF parsing result for metadata extraction.', [
                'research_id' => $this->researchId,
                'file_id' => $this->fileId,
                'error' => $exception->getMessage(),
            ]);
        }

        if (! is_string($text) || trim($text) === '') {
            $writer->writeAiMetadataFailure(
                $this->researchId,
                $this->fileId,
                $this->agencyId,
                $this->uploadedByUserId,
                'No extracted PDF text is available for metadata extraction.',
            );

            return;
        }

        try {
            $metadata = $extractor->extract($text);

            $writer->writeAiMetadataResult(
                $this->researchId,
                $this->fileId,
                $this->agencyId,
                $this->uploadedByUserId,
                $metadata,
            );
        } catch (Throwable $exception) {
            Log::warning('OpenAI research metadata extraction failed.', [
                'research_id' => $this->researchId,
                'file_id' => $this->fileId,
                'error' => $exception->getMessage(),
            ]);

            $writer->writeAiMetadataFailure(
                $this->researchId,
                $this->fileId,
                $this->agencyId,
                $this->uploadedByUserId,
                $exception->getMessage(),
            );
        }
    }
}
