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
        $result = $this->sanitizeForMongo($result);
        $payload = $this->sanitizeForMongo($payload);
        $text = (string) ($result['text'] ?? '');
        $succeeded = (bool) ($result['success'] ?? false);
        $error = (string) ($result['error'] ?? 'PDF text extraction failed.');
        $method = (string) ($result['method'] ?? 'smalot/pdfparser');

        try {
            PdfParsingResult::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'pdf_parsing'),
            ], array_merge($payload, [
                'page_count' => $result['page_count'] ?? null,
                'extracted_text' => $text,
                'text_length' => strlen($text),
                'sections' => [],
                'tables' => [],
                'figures' => [],
                'extraction_method' => $method,
                'parser_version' => $method,
                'processing_status' => $succeeded ? 'completed' : 'failed',
                'processing_errors' => $succeeded ? [] : [$error],
                'processed_at' => now(),
            ]));

            $this->markFilePipeline(
                $fileId,
                'pdf_parsing',
                $succeeded ? 'completed' : 'failed',
                $succeeded ? null : $error,
            );
        } catch (Throwable $exception) {
            Log::warning('Unable to write PDF parsing MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'text_length' => strlen($text),
                'error' => $this->sanitizeString($exception->getMessage()),
            ]);

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

        $metadata = $this->sanitizeForMongo($metadata);

        try {
            AiMetadata::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'ai_metadata'),
            ], [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'title' => $metadata['title'] ?? null,
                'abstract' => $metadata['abstract'] ?? null,
                'methodology' => $metadata['methodology'] ?? null,
                'review_of_related_literature' => $metadata['review_of_related_literature'] ?? null,
                'theoretical_framework' => $metadata['theoretical_framework'] ?? null,
                'results_and_discussion' => $metadata['results_and_discussion'] ?? null,
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

            Log::info('AI metadata saved successfully.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'processing_status' => 'completed',
            ]);

            $this->markFilePipeline($fileId, 'ai_metadata', 'completed');
        } catch (Throwable $exception) {
            $message = $this->sanitizeString($exception->getMessage());

            $this->markFilePipeline($fileId, 'ai_metadata', 'failed', $message);
            Log::warning('Unable to write AI metadata MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'text_length' => 0,
                'error' => $message,
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

        $message = $this->sanitizeString($message);
        $rawResponse = $this->sanitizeForMongo($rawResponse);

        try {
            AiMetadata::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'ai_metadata'),
            ], [
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
                'text_length' => 0,
                'error' => $this->sanitizeString($exception->getMessage()),
            ]);
        }

        $this->markFilePipeline($fileId, 'ai_metadata', 'failed', $message);
    }

    public function latestExtractedPdfText(int $researchId, int $fileId, ?int $agencyId): ?string
    {
        if (! $this->mongodbConfigured()) {
            return null;
        }

        $latestForFile = PdfParsingResult::query()
            ->where('research_id', $researchId)
            ->where('file_id', $fileId)
            ->latest('created_at')
            ->first();

        $storedAgencyId = $latestForFile?->agency_id;
        $shouldFilterByAgency = $agencyId !== null
            && $storedAgencyId !== null
            && $this->agencyIdsMatch($storedAgencyId, $agencyId);

        $query = PdfParsingResult::query()
            ->where('research_id', $researchId)
            ->where('file_id', $fileId)
            ->where('processing_status', 'completed');

        if ($shouldFilterByAgency) {
            $query->where('agency_id', $agencyId);
        }

        $result = $query->latest('created_at')->first();
        $text = $result?->extracted_text;

        Log::debug('Looked up latest extracted PDF text for metadata extraction.', [
            'research_id' => $researchId,
            'file_id' => $fileId,
            'requested_agency_id' => $agencyId,
            'pdf_parsing_result_exists_without_filters' => $latestForFile !== null,
            'stored_agency_id' => $storedAgencyId,
            'stored_processing_status' => $latestForFile?->processing_status,
            'stored_extracted_text_length' => is_string($latestForFile?->extracted_text)
                ? strlen($latestForFile->extracted_text)
                : null,
            'agency_filter_applied' => $shouldFilterByAgency,
            'final_filtered_query_found_record' => $result !== null,
            'final_extracted_text_length' => is_string($text) ? strlen($text) : null,
        ]);

        return is_string($text) && trim($text) !== '' ? $text : null;
    }

    /**
     * @param  array<string, mixed>  $classification
     */
    public function writeSdgClassificationResult(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, array $classification): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'sdg_classification', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        $classification = $this->sanitizeForMongo($classification);
        $model = (string) ($classification['model'] ?? config('services.openai.model', 'unknown'));
        $suggestedSdgs = $classification['suggested_sdgs'] ?? [];
        $overallConfidence = min(1.0, max(0.0, (float) ($classification['overall_confidence'] ?? 0.0)));

        try {
            SdgClassification::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'sdg_classification'),
            ], $this->sanitizeForMongo([
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'primary_sdg' => $classification['primary_sdg'] ?? null,
                'suggested_sdg_tags' => is_array($suggestedSdgs) ? $suggestedSdgs : [],
                'sdg_results' => is_array($suggestedSdgs) ? $suggestedSdgs : [],
                'overall_confidence' => $overallConfidence,
                'evidence_keywords' => $classification['evidence_keywords'] ?? [],
                'confidence_score' => $overallConfidence,
                'warnings' => $classification['warnings'] ?? [],
                'extraction_source' => 'openai:'.$model,
                'classification_source' => 'openai:'.$model,
                'raw_ai_response' => $classification['raw_response'] ?? [],
                'review_status' => 'pending_review',
                'processing_status' => 'completed',
                'processing_errors' => [],
                'processed_at' => now(),
            ]));

            $this->markFilePipeline($fileId, 'sdg_classification', 'completed');
        } catch (Throwable $exception) {
            $message = $this->sanitizeString($exception->getMessage());

            $this->markFilePipeline($fileId, 'sdg_classification', 'failed', $message);
            Log::warning('Unable to write SDG classification MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'text_length' => 0,
                'error' => $message,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $rawResponse
     */
    public function writeSdgClassificationFailure(int $researchId, int $fileId, ?int $agencyId, ?int $uploadedByUserId, string $message, array $rawResponse = []): void
    {
        if (! $this->mongodbConfigured()) {
            $this->markFilePipeline($fileId, 'sdg_classification', 'skipped', 'MONGODB_URI is not configured.');

            return;
        }

        $message = $this->sanitizeString($message);
        $rawResponse = $this->sanitizeForMongo($rawResponse);

        try {
            SdgClassification::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'sdg_classification'),
            ], $this->sanitizeForMongo([
                'research_id' => $researchId,
                'file_id' => $fileId,
                'agency_id' => $agencyId,
                'uploaded_by_user_id' => $uploadedByUserId,
                'primary_sdg' => null,
                'suggested_sdg_tags' => [],
                'sdg_results' => [],
                'overall_confidence' => 0.0,
                'evidence_keywords' => [],
                'confidence_score' => 0.0,
                'warnings' => [],
                'extraction_source' => 'openai:'.config('services.openai.model', 'unknown'),
                'classification_source' => 'openai:'.config('services.openai.model', 'unknown'),
                'raw_ai_response' => array_merge([
                    'status' => 'failed',
                    'error' => $message,
                ], $rawResponse),
                'review_status' => 'failed',
                'processing_status' => 'failed',
                'processing_errors' => [$message],
                'processed_at' => now(),
            ]));
        } catch (Throwable $exception) {
            Log::warning('Unable to write failed SDG classification MongoDB result.', [
                'research_id' => $researchId,
                'file_id' => $fileId,
                'text_length' => 0,
                'error' => $this->sanitizeString($exception->getMessage()),
            ]);
        }

        $this->markFilePipeline($fileId, 'sdg_classification', 'failed', $message);
    }

    private function recordPdfFailure(array $payload, int $fileId, Throwable $exception): void
    {
        $payload = $this->sanitizeForMongo($payload);
        $message = $this->sanitizeString($exception->getMessage());

        try {
            PdfParsingResult::query()->updateOrCreate([
                'idempotency_key' => $this->pipelineKey($fileId, 'pdf_parsing'),
            ], array_merge($payload, [
                'page_count' => null,
                'extracted_text' => '',
                'text_length' => 0,
                'sections' => [],
                'tables' => [],
                'figures' => [],
                'extraction_method' => 'smalot/pdfparser',
                'parser_version' => 'smalot/pdfparser',
                'processing_status' => 'failed',
                'processing_errors' => [$message],
                'processed_at' => now(),
            ]));
        } catch (Throwable $mongoException) {
            Log::warning('Unable to write PDF parsing MongoDB failure result.', [
                'research_id' => $payload['research_id'],
                'file_id' => $fileId,
                'text_length' => 0,
                'error' => $this->sanitizeString($mongoException->getMessage()),
            ]);
        }

        $this->markFilePipeline($fileId, 'pdf_parsing', 'failed', $message);
    }

    public function mongodbConfigured(): bool
    {
        return filled(config('database.connections.mongodb.dsn'));
    }

    private function pipelineKey(int $fileId, string $pipeline): string
    {
        return $pipeline.':'.$fileId;
    }

    public function markAiProcessingSkipped(int $fileId, string $message = 'AI-assisted processing is currently disabled.'): void
    {
        foreach (['pdf_parsing', 'ai_metadata', 'sdg_classification'] as $pipeline) {
            $this->markFilePipeline($fileId, $pipeline, 'skipped', $message);
        }
    }

    public function markAiProcessingFailed(int $fileId, string $message): void
    {
        foreach (['pdf_parsing', 'ai_metadata', 'sdg_classification'] as $pipeline) {
            $this->markFilePipeline($fileId, $pipeline, 'failed', $message);
        }
    }

    public function markAiProcessingQueued(int $fileId): void
    {
        foreach (['pdf_parsing', 'ai_metadata', 'sdg_classification'] as $pipeline) {
            $this->markFilePipeline($fileId, $pipeline, 'queued');
        }
    }

    private function agencyIdsMatch(mixed $storedAgencyId, int $agencyId): bool
    {
        if (is_numeric($storedAgencyId)) {
            return (int) $storedAgencyId === $agencyId;
        }

        return (string) $storedAgencyId === (string) $agencyId;
    }

    private function sanitizeForMongo(mixed $value): mixed
    {
        try {
            if (is_array($value)) {
                $sanitized = [];

                foreach ($value as $key => $item) {
                    $safeKey = is_string($key) ? $this->sanitizeString($key) : $key;
                    $sanitized[$safeKey] = $this->sanitizeForMongo($item);
                }

                return $sanitized;
            }

            if (is_string($value)) {
                return $this->sanitizeString($value);
            }

            return $value;
        } catch (Throwable) {
            return is_string($value) ? '' : $value;
        }
    }

    private function sanitizeString(string $value): string
    {
        try {
            if (! $this->isValidUtf8($value)) {
                $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $value);

                if (is_string($converted)) {
                    $value = $converted;
                } else {
                    $converted = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
                    $value = is_string($converted) ? $converted : '';
                }
            }

            $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);

            if (is_string($cleaned)) {
                return $cleaned;
            }

            $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
            $value = is_string($converted) ? $converted : '';
            $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);

            return is_string($cleaned) ? $cleaned : '';
        } catch (Throwable) {
            return '';
        }
    }

    private function isValidUtf8(string $value): bool
    {
        try {
            if (function_exists('mb_check_encoding')) {
                return mb_check_encoding($value, 'UTF-8');
            }

            return preg_match('//u', $value) === 1;
        } catch (Throwable) {
            return false;
        }
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
