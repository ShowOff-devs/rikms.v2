<?php

namespace App\Services;

use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use App\Models\ResearchFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class AiPipelineResultWriter
{
    /**
     * @param  array{success: bool, text: string, method: string, error: ?string, page_count: ?int}  $result
     */
    public function writePdfParsingResult(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, array $result): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'pdf_parsing', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        $file = ResearchFile::query()->find($fileId);
        $payload = $this->basePayload($researchId, $fileId, $agencyId, $uploadedByUserId, $file);

        try {
            PdfParsingResult::query()->create(array_merge($payload, [
                'page_count' => $result['page_count'] ?? null,
                'extracted_text' => ($result['success'] ?? false) ? Str::limit((string) $result['text'], 200000, '') : null,
                'sections' => [],
                'tables' => [],
                'figures' => [],
                'parser_version' => $result['method'] ?? 'smalot/pdfparser',
                'processing_status' => ($result['success'] ?? false) ? 'completed' : 'failed',
                'processing_errors' => ($result['success'] ?? false) ? [] : [($result['error'] ?? 'PDF text extraction failed.')],
                'processed_at' => now(),
            ]));

            $this->markFilePipeline(
                $fileId,
                'pdf_parsing',
                ($result['success'] ?? false) ? 'completed' : 'failed',
                ($result['success'] ?? false) ? null : ($result['error'] ?? 'PDF text extraction failed.'),
            );
        } catch (Throwable $exception) {
            $this->recordPdfFailure($payload, $fileId, $exception);
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function writeAiMetadataResult(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, array $metadata): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'ai_metadata', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        try {
            AiMetadata::query()->create([
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'title' => $metadata['title'] ?? null,
                'abstract' => $metadata['abstract'] ?? null,
                'authors' => $metadata['authors'] ?? [],
                'keywords' => $metadata['keywords'] ?? [],
                'publication_year' => $metadata['publication_year'] ?? null,
                'category' => $metadata['research_category'] ?? null,
                'research_category' => $metadata['research_category'] ?? null,
                'confidence_score' => $metadata['confidence_score'] ?? 0.0,
                'warnings' => $metadata['warnings'] ?? [],
                'extraction_source' => 'openai:'.config('services.openai.model', 'unknown'),
                'raw_ai_response' => $metadata['raw_response'] ?? [],
                'review_status' => 'pending_review',
                'processing_status' => 'completed',
                'processing_errors' => [],
                'processed_at' => now(),
            ]);

            $this->markFilePipeline($fileId, 'ai_metadata', 'completed');
        } catch (Throwable $exception) {
            $this->markFilePipeline($fileId, 'ai_metadata', 'failed', $exception->getMessage());
            Log::warning('Unable to write AI metadata MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $rawResponse
     */
    public function writeAiMetadataFailure(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, string $message, array $rawResponse = []): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'ai_metadata', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        try {
            AiMetadata::query()->create([
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'authors' => [],
                'keywords' => [],
                'confidence_score' => 0.0,
                'warnings' => [],
                'extraction_source' => 'openai:'.config('services.openai.model', 'unknown'),
                'raw_ai_response' => array_merge([
                    'status' => 'failed',
                    'error' => $message,
                ], $rawResponse),
                'review_status' => 'failed',
                'processing_status' => 'failed',
                'processing_errors' => [$message],
                'processed_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Unable to write failed AI metadata MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'error' => $exception->getMessage(),
            ]);
        }

        $this->markFilePipeline($fileId, 'ai_metadata', 'failed', $message);
    }

    public function latestExtractedPdfText(int $researchId, int $fileId, ?int $agencyId): ?string
    {
        if (! $this->mongodbConfigured()) {
            return null;
        }

        $query = PdfParsingResult::query()
            ->where('research_id', $researchId)
            ->where('file_id', $fileId)
            ->where('processing_status', 'completed');

        if ($agencyId !== null) {
            $query->where('agency_id', $agencyId);
        }

        $result = $query->latest('created_at')->first();
        $text = $result?->extracted_text;

        return is_string($text) && trim($text) !== '' ? $text : null;
    }

    public function writeSdgClassificationResult(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'sdg_classification', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        try {
            SdgClassification::query()->create([
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'sdg_results' => [],
                'confidence_score' => 0.0,
                'classification_source' => 'provider_unconfigured',
                'raw_ai_response' => [
                    'status' => 'skipped',
                    'reason' => 'No SDG classification provider is configured for this environment.',
                ],
                'review_status' => 'skipped',
                'processing_status' => 'skipped',
                'processing_errors' => ['No SDG classification provider is configured.'],
                'processed_at' => now(),
            ]);

            $this->markFilePipeline($fileId, 'sdg_classification', 'skipped', 'No SDG classification provider is configured.');
        } catch (Throwable $exception) {
            $this->markFilePipeline($fileId, 'sdg_classification', 'failed', $exception->getMessage());
            Log::warning('Unable to write SDG classification MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function recordPdfFailure(array $payload, int $fileId, Throwable $exception): void
    {
        try {
            PdfParsingResult::query()->create(array_merge($payload, [
                'page_count' => null,
                'extracted_text' => null,
                'sections' => [],
                'tables' => [],
                'figures' => [],
                'parser_version' => 'smalot/pdfparser',
                'processing_status' => 'failed',
                'processing_errors' => [$exception->getMessage()],
                'processed_at' => now(),
            ]));
        } catch (Throwable $mongoException) {
            Log::warning('Unable to write PDF parsing MongoDB failure result.', [
                'research_id' => $payload['research_id'],
                'file_id' => $fileId,
                'error' => $mongoException->getMessage(),
            ]);
        }

        $this->markFilePipeline($fileId, 'pdf_parsing', 'failed', $exception->getMessage());
    }

    public function mongodbConfigured(): bool
    {
        return filled(config('database.connections.mongodb.dsn'));
    }

    private function basePayload(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, ?ResearchFile $file): array
    {
        return [
            'research_id' => $researchId,
            'file_id' => $fileId,
            'agency_id' => $agencyId,
            'uploaded_by_user_id' => $uploadedByUserId,
            'file_name' => $file?->original_name,
            'file_path' => $file?->path,
            'file_mime_type' => $file?->mime_type,
            'file_size' => $file?->size_bytes,
        ];
    }

    private function markFilePipeline(int $fileId, string $pipeline, string $status, ?string $message = null): void
    {
        try {
            $file = ResearchFile::query()->find($fileId);

            if (! $file) {
                return;
            }

            $metadata = $file->metadata ?? [];
            $metadata['ai_processing'] = is_array($metadata['ai_processing'] ?? null)
                ? $metadata['ai_processing']
                : [];
            $metadata['ai_processing'][$pipeline] = array_filter([
                'status' => $status,
                'message' => $message ? Str::limit($message, 500) : null,
                'updated_at' => now()->toISOString(),
            ]);

            $file->forceFill(['metadata' => $metadata])->save();
        } catch (Throwable $exception) {
            Log::warning('Unable to update research file AI processing metadata.', [
                'file_id' => $fileId,
                'pipeline' => $pipeline,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
