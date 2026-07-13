<?php

namespace App\Jobs;

use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\ResearchFile;
use App\Services\AI\OpenAiSdgClassifier;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ClassifyResearchSdgJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(AiPipelineResultWriter $writer, ?OpenAiSdgClassifier $classifier = null): void
    {
        if (! app(PlatformSettingsService::class)->aiProcessingEnabled()) {
            $writer->markAiProcessingSkipped($this->fileId);

            return;
        }

        $classifier ??= app(OpenAiSdgClassifier::class);

        try {
            $metadata = $this->latestCompletedAiMetadata();
            $pdf = $this->latestCompletedPdfParsingResult();

            if (! $metadata || ! $pdf || ! is_string($pdf->extracted_text) || trim($pdf->extracted_text) === '') {
                $writer->writeSdgClassificationFailure(
                    $this->researchId,
                    $this->fileId,
                    $this->agencyId,
                    $this->uploadedByUserId,
                    'Completed AI metadata and extracted PDF text are required for SDG classification.',
                );

                return;
            }

            $result = $classifier->classify($this->classificationPayload($metadata, $pdf));

            $writer->writeSdgClassificationResult(
                $this->researchId,
                $this->fileId,
                $this->agencyId,
                $this->uploadedByUserId,
                $result,
            );
        } catch (Throwable $exception) {
            Log::warning('OpenAI research SDG classification failed.', [
                'research_id' => $this->researchId,
                'file_id' => $this->fileId,
                'error' => $exception->getMessage(),
            ]);

            $writer->writeSdgClassificationFailure(
                $this->researchId,
                $this->fileId,
                $this->agencyId,
                $this->uploadedByUserId,
                $exception->getMessage(),
            );
        }
    }

    private function latestCompletedAiMetadata(): ?AiMetadata
    {
        return AiMetadata::query()
            ->where('research_id', $this->researchId)
            ->where('file_id', $this->fileId)
            ->when($this->agencyId !== null, fn ($query) => $query->where('agency_id', $this->agencyId))
            ->where('processing_status', 'completed')
            ->latest('processed_at')
            ->latest('created_at')
            ->first();
    }

    private function latestCompletedPdfParsingResult(): ?PdfParsingResult
    {
        return PdfParsingResult::query()
            ->where('research_id', $this->researchId)
            ->where('file_id', $this->fileId)
            ->when($this->agencyId !== null, fn ($query) => $query->where('agency_id', $this->agencyId))
            ->where('processing_status', 'completed')
            ->latest('processed_at')
            ->latest('created_at')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function classificationPayload(AiMetadata $metadata, PdfParsingResult $pdf): array
    {
        return [
            'document_type' => $this->documentType(),
            'title' => $metadata->title,
            'abstract' => $metadata->abstract,
            'keywords' => Arr::wrap($metadata->keywords ?? []),
            'methodology' => $metadata->methodology,
            'results_and_discussion' => $metadata->results_and_discussion,
            'research_category' => $metadata->research_category ?? $metadata->category,
            'pdf_text_excerpt' => Str::limit((string) $pdf->extracted_text, 12000, ''),
        ];
    }

    private function documentType(): ?string
    {
        $file = ResearchFile::query()->find($this->fileId);
        $metadata = $file?->metadata;

        if (! is_array($metadata)) {
            return null;
        }

        $documentType = $metadata['document_type']
            ?? $metadata['documentType']
            ?? $metadata['type']
            ?? null;

        return is_string($documentType) && trim($documentType) !== ''
            ? trim($documentType)
            : null;
    }
}
