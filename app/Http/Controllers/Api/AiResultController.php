<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class AiResultController extends Controller
{
    private const SDG_NAMES = [
        1 => 'No Poverty',
        2 => 'Zero Hunger',
        3 => 'Good Health and Well-being',
        4 => 'Quality Education',
        5 => 'Gender Equality',
        6 => 'Clean Water and Sanitation',
        7 => 'Affordable and Clean Energy',
        8 => 'Decent Work and Economic Growth',
        9 => 'Industry, Innovation and Infrastructure',
        10 => 'Reduced Inequalities',
        11 => 'Sustainable Cities and Communities',
        12 => 'Responsible Consumption and Production',
        13 => 'Climate Action',
        14 => 'Life Below Water',
        15 => 'Life on Land',
        16 => 'Peace, Justice and Strong Institutions',
        17 => 'Partnerships for the Goals',
    ];

    public function agencyPdfParsingResult(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success(
            'Agency PDF parsing result retrieved.',
            $this->pdfPayload($research, false),
        );
    }

    public function agencyAiMetadata(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success(
            'Agency AI metadata retrieved.',
            $this->metadataPayload($research, false),
        );
    }

    public function agencySdgClassification(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success(
            'Agency SDG classification retrieved.',
            $this->sdgPayload($research, false),
        );
    }

    public function agencyAiResults(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success('Agency AI results retrieved.', $this->aiResultsData($research));
    }

    public function agencyProcessAiResults(Request $request, Research $research): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        $file = $this->latestResearchFile($research);

        if (! $file) {
            return ApiResponse::error('Upload a PDF research document before running AI analysis.', [], 422);
        }

        $uploadedByUserId = $file->uploaded_by ? (int) $file->uploaded_by : (int) $request->user()->id;

        app()->call([
            new ParsePdfDocumentJob($research->id, (int) $file->id, $research->agency_id, $uploadedByUserId),
            'handle',
        ]);
        app()->call([
            new ExtractResearchMetadataJob($research->id, (int) $file->id, $research->agency_id, $uploadedByUserId),
            'handle',
        ]);
        app()->call([
            new ClassifyResearchSdgJob($research->id, (int) $file->id, $research->agency_id, $uploadedByUserId),
            'handle',
        ]);

        return ApiResponse::success('Agency AI results processed.', $this->aiResultsData($research));
    }

    /**
     * @return array<string, mixed>
     */
    private function aiResultsData(Research $research): array
    {
        $startedAt = microtime(true);
        $file = $this->latestResearchFile($research);
        $fileId = $file?->id ? (int) $file->id : null;
        $pdfPayload = $this->pdfSummaryPayload($research, $fileId, $file);
        $metadataPayload = $this->metadataSummaryPayload($research, $fileId, $file);
        $sdgPayload = $this->sdgSummaryPayload($research, $fileId, $file);

        $this->logAiResultsPayload($research, $metadataPayload, $pdfPayload, $sdgPayload, $startedAt);

        return [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'status' => $metadataPayload['status'] ?? 'not_available',
            'pdf_parsing_result' => $pdfPayload,
            'ai_metadata' => $metadataPayload,
            'sdg_classification' => $sdgPayload,
        ];
    }

    public function agencyReview(Request $request, Research $research, string $result): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return $this->reviewResult($request, $research, $result, false);
    }

    public function agencyApply(Request $request, Research $research, string $result): JsonResponse
    {
        if (! $this->canViewAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return $this->applyResult($request, $research, $result);
    }

    public function adminPdfParsingResult(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success(
            'Admin PDF parsing result retrieved.',
            $this->pdfPayload($research, true),
        );
    }

    public function adminAiMetadata(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success(
            'Admin AI metadata retrieved.',
            $this->metadataPayload($research, true),
        );
    }

    public function adminSdgClassification(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success(
            'Admin SDG classification retrieved.',
            $this->sdgPayload($research, true),
        );
    }

    public function adminAiResults(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success('Admin AI results retrieved.', $this->aiResultsData($research));
    }

    public function adminReview(Request $request, Research $research, string $result): JsonResponse
    {
        return $this->reviewResult($request, $research, $result, true);
    }

    private function canViewAgencyResearch(Request $request, Research $research): bool
    {
        return (int) $research->agency_id === (int) $request->user()->agency_id;
    }

    private function reviewResult(Request $request, Research $research, string $resultId, bool $includeRawPayload): JsonResponse
    {
        $validated = $request->validate([
            'review_status' => ['required', 'string', Rule::in(['reviewed', 'accepted', 'rejected', 'needs_revision', 'flagged'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $resolved = $this->resolveMongoResult($research, $resultId);

        if (! $resolved) {
            return ApiResponse::error('AI result was not found for this research record.', [], 404);
        }

        [$resultType, $mongoResult] = $resolved;

        try {
            $mongoResult->forceFill([
                'review_status' => $validated['review_status'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['notes'] ?? null,
            ])->save();
        } catch (Throwable $exception) {
            Log::warning('Unable to update MongoDB AI review metadata.', [
                'research_id' => $research->id,
                'result_id' => $resultId,
                'error' => $exception->getMessage(),
            ]);

            return ApiResponse::error('Unable to update the AI review metadata.', [], 503);
        }

        AuditLogger::record(
            $request,
            'ai_result.reviewed',
            $research,
            null,
            [
                'result_id' => (string) $mongoResult->getKey(),
                'result_type' => $resultType,
                'review_status' => $validated['review_status'],
            ],
            ['notes' => $validated['notes'] ?? null],
        );

        return ApiResponse::success('AI result reviewed.', [
            'result_id' => (string) $mongoResult->getKey(),
            'result_type' => $resultType,
            'review_status' => $validated['review_status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now()->toISOString(),
            'result' => $this->payloadForResolvedResult($research, $resultType, $mongoResult, $includeRawPayload),
        ]);
    }

    private function applyResult(Request $request, Research $research, string $resultId): JsonResponse
    {
        $validated = $request->validate([
            'fields' => ['required', 'array', 'min:1'],
            'fields.*' => ['string', Rule::in(['title', 'abstract', 'authors', 'keywords', 'category', 'publication_year', 'sdg_tags'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $resolved = $this->resolveMongoResult($research, $resultId);

        if (! $resolved) {
            return ApiResponse::error('AI result was not found for this research record.', [], 404);
        }

        [$resultType, $mongoResult] = $resolved;
        $updates = $this->officialMetadataUpdates($mongoResult, $resultType, $validated['fields']);

        if ($updates === []) {
            return ApiResponse::error('No selected AI fields are available to apply.', [], 422);
        }

        $oldValues = $research->only(array_keys($updates));

        DB::transaction(function () use ($request, $research, $updates, $oldValues, $resultId, $resultType, $validated): void {
            $research->update($updates);

            AuditLogger::record(
                $request,
                'ai_result.applied',
                $research,
                $oldValues,
                $research->fresh()->only(array_keys($updates)),
                [
                    'result_id' => $resultId,
                    'result_type' => $resultType,
                    'fields' => array_keys($updates),
                    'notes' => $validated['notes'] ?? null,
                ],
            );
        });

        $mongoWarning = null;

        try {
            $mongoResult->forceFill([
                'review_status' => 'applied',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['notes'] ?? null,
            ])->save();
        } catch (Throwable $exception) {
            $mongoWarning = 'Official metadata was applied, but MongoDB review metadata could not be updated.';
            Log::warning('Unable to update MongoDB AI apply metadata after relational apply.', [
                'research_id' => $research->id,
                'result_id' => $resultId,
                'error' => $exception->getMessage(),
            ]);
        }

        return ApiResponse::success('AI result applied to official research metadata.', [
            'research' => $research->refresh()->only(array_merge(['id', 'agency_id', 'status'], array_keys($updates))),
            'applied_fields' => array_keys($updates),
            'source' => [
                'result_id' => (string) $mongoResult->getKey(),
                'result_type' => $resultType,
            ],
            'warning' => $mongoWarning,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function pdfPayload(Research $research, bool $includeRawPayload, ?int $fileId = null): array
    {
        $result = $this->latestMongoResult(PdfParsingResult::class, $research, $fileId ?? $this->latestResearchFileId($research));

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'pdf_parsing_result', 'pdf_parsing', $fileId);
        }

        return $this->pdfPayloadFromResult($research, $result, $includeRawPayload);
    }

    /**
     * @return array<string, mixed>
     */
    private function pdfPayloadFromResult(Research $research, mixed $result, bool $includeRawPayload): array
    {
        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'pdf_parsing_result',
            'status' => $result->processing_status ?? 'suggested_unverified',
            'confidence_score' => null,
            'page_count' => $result->page_count,
            'file_name' => $result->file_name,
            'extracted_text_preview' => str((string) $result->extracted_text)->limit(1200)->toString(),
            'sections' => $result->sections ?? [],
            'processing_errors' => $result->processing_errors ?? [],
            'generated_at' => $this->dateToIso($result->processed_at ?? $result->created_at),
            'reviewed_at' => null,
            'reviewed_by' => null,
            'raw_payload' => $includeRawPayload ? [
                'tables' => $result->tables ?? [],
                'figures' => $result->figures ?? [],
                'parser_version' => $result->parser_version,
            ] : null,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function pdfSummaryPayload(Research $research, ?int $fileId, ?ResearchFile $file = null): array
    {
        $result = $this->latestMongoResult(PdfParsingResult::class, $research, $fileId, [
            'research_id',
            'file_id',
            'agency_id',
            'processing_status',
            'page_count',
            'text_length',
            'processing_errors',
            'processed_at',
            'created_at',
        ]);

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'pdf_parsing_result', 'pdf_parsing', $fileId, $file);
        }

        $status = $result->processing_status ?? 'not_available';

        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'pdf_parsing_result',
            'status' => $status,
            'page_count' => $result->page_count,
            'text_length' => $result->text_length,
            'generated_at' => $this->dateToIso($result->processed_at ?? $result->created_at),
            'message' => $status === 'completed'
                ? 'PDF text extracted successfully.'
                : ($this->normalizeJsonArray($result->processing_errors ?? null)[0] ?? null),
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function metadataPayload(Research $research, bool $includeRawPayload, ?int $fileId = null): array
    {
        $result = $this->latestMongoResult(AiMetadata::class, $research, $fileId ?? $this->latestResearchFileId($research));

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'ai_metadata', 'ai_metadata', $fileId);
        }

        return $this->metadataPayloadFromResult($research, $result, $includeRawPayload);
    }

    /**
     * @return array<string, mixed>
     */
    private function metadataPayloadFromResult(Research $research, mixed $result, bool $includeRawPayload): array
    {
        $processingStatus = $result->processing_status ?? null;
        $reviewStatus = $result->review_status ?? null;
        $authors = $this->normalizeJsonArray($result->authors ?? null);
        $keywords = $this->normalizeJsonArray($result->keywords ?? null);
        $processingErrors = $this->normalizeJsonArray($result->processing_errors ?? null);
        $researchCategory = $result->research_category ?? $result->category ?? null;
        $status = $processingStatus ?: ($reviewStatus ?: 'not_available');

        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'ai_metadata',
            'status' => $status,
            'review_status' => $reviewStatus,
            'processing_status' => $processingStatus,
            'confidence_score' => $result->confidence_score,
            'extracted_title' => $result->title,
            'extracted_authors' => $authors,
            'extracted_keywords' => $keywords,
            'extracted_abstract' => $result->abstract,
            'extracted_methodology' => $result->methodology,
            'extracted_review_of_related_literature' => $result->review_of_related_literature,
            'extracted_theoretical_framework' => $result->theoretical_framework,
            'extracted_results_and_discussion' => $result->results_and_discussion,
            'publication_year' => $result->publication_year,
            'research_category' => $researchCategory,
            'extracted_publication_year' => $result->publication_year,
            'extracted_research_category' => $researchCategory,
            'warnings' => $this->normalizeJsonArray($result->warnings ?? null),
            'processing_errors' => $processingErrors,
            'detected_language' => $result->detected_language,
            'generated_at' => $this->dateToIso($result->created_at),
            'reviewed_at' => $this->dateToIso($result->reviewed_at),
            'reviewed_by' => $result->reviewed_by,
            'raw_payload' => $includeRawPayload ? $result->raw_ai_response : null,
            'message' => $processingStatus === 'completed'
                ? 'AI metadata extracted successfully.'
                : null,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function metadataSummaryPayload(Research $research, ?int $fileId, ?ResearchFile $file = null): array
    {
        $result = $this->latestMongoResult(AiMetadata::class, $research, $fileId, [
            'research_id',
            'file_id',
            'agency_id',
            'title',
            'abstract',
            'methodology',
            'review_of_related_literature',
            'theoretical_framework',
            'results_and_discussion',
            'authors',
            'keywords',
            'publication_year',
            'category',
            'research_category',
            'confidence_score',
            'review_status',
            'processing_status',
            'processing_errors',
            'processed_at',
            'created_at',
        ]);

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'ai_metadata', 'ai_metadata', $fileId, $file);
        }

        return $this->metadataPayloadFromResult($research, $result, false);
    }

    /**
     * @return array<int, mixed>
     */
    private function normalizeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $metadataPayload
     * @param  array<string, mixed>  $pdfPayload
     * @param  array<string, mixed>  $sdgPayload
     */
    private function logAiResultsPayload(
        Research $research,
        array $metadataPayload,
        array $pdfPayload,
        array $sdgPayload,
        float $startedAt
    ): void {
        $authors = $metadataPayload['extracted_authors'] ?? [];
        $keywords = $metadataPayload['extracted_keywords'] ?? [];

        Log::debug('Agency research AI results payload prepared.', [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'ai_metadata_found' => ($metadataPayload['status'] ?? 'not_available') !== 'not_available',
            'pdf_parsing_found' => ($pdfPayload['status'] ?? 'not_available') !== 'not_available',
            'sdg_found' => ($sdgPayload['status'] ?? 'not_available') !== 'not_available',
            'ai_metadata_status' => $metadataPayload['status'] ?? 'not_available',
            'ai_metadata_title_exists' => filled($metadataPayload['extracted_title'] ?? null),
            'extracted_authors_count' => is_array($authors) ? count($authors) : 0,
            'extracted_keywords_count' => is_array($keywords) ? count($keywords) : 0,
            'query_duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);
    }

    private function latestResearchFileId(Research $research): ?int
    {
        $file = $this->latestResearchFile($research);

        return $file?->id ? (int) $file->id : null;
    }

    private function latestResearchFile(Research $research): ?ResearchFile
    {
        return $research->files()
            ->whereNull('archived_at')
            ->orderByDesc('uploaded_at')
            ->orderByDesc('created_at')
            ->first(['id', 'research_id', 'agency_id', 'uploaded_by', 'metadata', 'uploaded_at', 'created_at']);
    }

    /**
     * @return array<string, mixed>
     */
    private function sdgPayload(Research $research, bool $includeRawPayload, ?int $fileId = null): array
    {
        $result = $this->latestMongoResult(SdgClassification::class, $research, $fileId ?? $this->latestResearchFileId($research));

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'sdg_classification', 'sdg_classification', $fileId);
        }

        return $this->sdgPayloadFromResult($research, $result, $includeRawPayload);
    }

    /**
     * @return array<string, mixed>
     */
    private function sdgPayloadFromResult(Research $research, mixed $result, bool $includeRawPayload): array
    {
        $processingStatus = $result->processing_status ?? null;
        $reviewStatus = $result->review_status ?? null;
        $processingErrors = $this->normalizeJsonArray($result->processing_errors ?? null);
        $suggestedTags = $this->normalizeSdgTags($result->suggested_sdg_tags ?? $result->sdg_results ?? []);
        $primarySdg = $this->normalizeSdgTag($result->primary_sdg ?? null)
            ?? ($suggestedTags[0] ?? null);
        $evidenceKeywords = $this->normalizeStringArray($result->evidence_keywords ?? []);
        $status = $processingStatus ?: ($reviewStatus ?: 'not_available');

        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'sdg_classification',
            'status' => $status,
            'processing_status' => $processingStatus,
            'review_status' => $reviewStatus,
            'confidence_score' => $result->confidence_score ?? $result->overall_confidence,
            'suggested_sdg_tags' => $suggestedTags,
            'primary_sdg' => $primarySdg,
            'evidence_keywords' => $evidenceKeywords,
            'processing_errors' => $processingErrors,
            'message' => $processingStatus === 'completed'
                ? 'SDG classification completed.'
                : ($processingErrors[0] ?? null),
            'generated_at' => $this->dateToIso($result->created_at),
            'reviewed_at' => $this->dateToIso($result->reviewed_at),
            'reviewed_by' => $result->reviewed_by,
            'raw_payload' => $includeRawPayload ? $result->raw_ai_response : null,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function sdgSummaryPayload(Research $research, ?int $fileId, ?ResearchFile $file = null): array
    {
        $result = $this->latestMongoResult(SdgClassification::class, $research, $fileId, [
            'research_id',
            'file_id',
            'agency_id',
            'primary_sdg',
            'primary_sdg_label',
            'suggested_sdg_tags',
            'sdg_results',
            'overall_confidence',
            'evidence_keywords',
            'confidence_score',
            'warnings',
            'review_status',
            'processing_status',
            'processing_errors',
            'processed_at',
            'created_at',
        ]);

        if (! $result) {
            return $this->pipelineFallbackPayload($research, 'sdg_classification', 'sdg_classification', $fileId, $file);
        }

        return $this->sdgPayloadFromResult($research, $result, false);
    }

    /**
     * @param  class-string  $modelClass
     * @param  array<int, string>|null  $fields
     */
    private function latestMongoResult(string $modelClass, Research $research, ?int $fileId = null, ?array $fields = null): mixed
    {
        if (app()->runningUnitTests()) {
            return null;
        }

        try {
            $query = $modelClass::query()
                ->where('research_id', (int) $research->id);

            if ($research->agency_id !== null) {
                $query->where('agency_id', (int) $research->agency_id);
            }

            if ($fileId !== null) {
                $query->where('file_id', (int) $fileId);
            }

            if ($fields !== null) {
                $query->select($fields);
            }

            return $query
                ->orderByDesc('processed_at')
                ->orderByDesc('created_at')
                ->first();
        } catch (Throwable $exception) {
            Log::warning('Unable to retrieve latest MongoDB AI result.', [
                'model' => $modelClass,
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'file_id' => $fileId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @return array{0: string, 1: mixed}|null
     */
    private function resolveMongoResult(Research $research, string $resultId): ?array
    {
        if (app()->runningUnitTests()) {
            return null;
        }

        foreach ([
            'ai_metadata' => AiMetadata::class,
            'sdg_classification' => SdgClassification::class,
            'pdf_parsing_result' => PdfParsingResult::class,
        ] as $resultType => $modelClass) {
            try {
                $result = $modelClass::query()
                    ->where('research_id', $research->id)
                    ->where('agency_id', $research->agency_id)
                    ->whereKey($resultId)
                    ->first();

                if ($result) {
                    return [$resultType, $result];
                }
            } catch (Throwable) {
                continue;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $fields
     * @return array<string, mixed>
     */
    private function officialMetadataUpdates(mixed $result, string $resultType, array $fields): array
    {
        $updates = [];

        foreach (array_unique($fields) as $field) {
            $value = match ($field) {
                'title' => $resultType === 'ai_metadata' ? $result->title : null,
                'abstract' => $resultType === 'ai_metadata' ? $result->abstract : null,
                'authors' => $resultType === 'ai_metadata' ? $result->authors : null,
                'keywords' => $resultType === 'ai_metadata' ? $result->keywords : null,
                'category' => $resultType === 'ai_metadata' ? ($result->category ?? null) : null,
                'publication_year' => $resultType === 'ai_metadata' ? ($result->publication_year ?? null) : null,
                'sdg_tags' => $this->sdgTagsFromResult($result, $resultType),
                default => null,
            };

            if ($value !== null && $value !== [] && $value !== '') {
                $updates[$field === 'sdg_tags' ? 'sdgs' : $field] = $value;
            }
        }

        return $updates;
    }

    /**
     * @return array<int, mixed>|null
     */
    private function sdgTagsFromResult(mixed $result, string $resultType): ?array
    {
        if ($resultType !== 'sdg_classification') {
            return null;
        }

        $sdgResults = $this->normalizeSdgTags($result->suggested_sdg_tags ?? $result->sdg_results ?? []);

        return collect($sdgResults)
            ->map(fn (mixed $item): mixed => is_array($item) ? ($item['sdg'] ?? null) : $item)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeSdgTags(mixed $value): array
    {
        return collect($this->normalizeJsonArray($value))
            ->map(fn (mixed $item): ?array => $this->normalizeSdgTag($item))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function normalizeSdgTag(mixed $value): ?array
    {
        if (is_string($value)) {
            $number = $this->sdgNumberFromValue($value);

            if ($number === null) {
                return null;
            }

            return [
                'sdg' => 'SDG '.$number,
                'label' => self::SDG_NAMES[$number],
            ];
        }

        if (! is_array($value)) {
            return null;
        }

        $number = $this->sdgNumberFromValue($value['sdg_number'] ?? $value['sdg'] ?? null);

        if ($number === null) {
            return null;
        }

        $label = $value['sdg_name'] ?? $value['label'] ?? self::SDG_NAMES[$number];
        $confidence = $value['confidence_score'] ?? null;
        $reason = $value['reason'] ?? null;

        return array_filter([
            'sdg' => 'SDG '.$number,
            'label' => is_string($label) && trim($label) !== ''
                ? trim($label)
                : self::SDG_NAMES[$number],
            'confidence_score' => is_numeric($confidence) ? (float) $confidence : null,
            'reason' => is_string($reason) && trim($reason) !== '' ? trim($reason) : null,
        ], fn (mixed $item): bool => $item !== null);
    }

    private function sdgNumberFromValue(mixed $value): ?int
    {
        if (is_int($value) || (is_string($value) && ctype_digit($value))) {
            $number = (int) $value;
        } elseif (is_string($value) && preg_match('/\d+/u', $value, $matches) === 1) {
            $number = (int) $matches[0];
        } else {
            return null;
        }

        return isset(self::SDG_NAMES[$number]) ? $number : null;
    }

    /**
     * @return array<int, string>
     */
    private function normalizeStringArray(mixed $value): array
    {
        return collect($this->normalizeJsonArray($value))
            ->filter(fn (mixed $item): bool => is_string($item) && trim($item) !== '')
            ->map(fn (string $item): string => trim($item))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadForResolvedResult(Research $research, string $resultType, mixed $result, bool $includeRawPayload): array
    {
        return match ($resultType) {
            'ai_metadata' => $this->metadataPayloadFromResult($research, $result, $includeRawPayload),
            'sdg_classification' => $this->sdgPayloadFromResult($research, $result, $includeRawPayload),
            'pdf_parsing_result' => $this->pdfPayloadFromResult($research, $result, $includeRawPayload),
            default => $this->emptyPayload($research, $resultType),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function pipelineFallbackPayload(
        Research $research,
        string $resultType,
        string $pipeline,
        ?int $fileId = null,
        ?ResearchFile $file = null
    ): array {
        $file ??= $this->fileForPipelineFallback($research, $fileId);
        $entry = $this->pipelineStatusEntry($file?->metadata ?? null, $pipeline);

        if (! $file || ! $entry) {
            return $this->emptyPayload($research, $resultType, $fileId);
        }

        $status = $this->normalizePipelineStatus($entry['status'] ?? 'queued');
        $message = $this->pipelineStatusMessage($pipeline, $status, $entry['message'] ?? null);
        $processingErrors = $status === 'failed' && $message ? [$message] : [];

        return [
            'research_id' => $research->id,
            'file_id' => (int) $file->id,
            'agency_id' => $research->agency_id,
            'result_type' => $resultType,
            'status' => $status,
            'processing_status' => $status,
            'confidence_score' => null,
            'generated_at' => null,
            'reviewed_at' => null,
            'reviewed_by' => null,
            'processing_errors' => $processingErrors,
            'message' => $message,
        ];
    }

    private function fileForPipelineFallback(Research $research, ?int $fileId): ?ResearchFile
    {
        if ($fileId === null) {
            return null;
        }

        return $research->files()
            ->whereKey($fileId)
            ->first(['id', 'research_id', 'agency_id', 'metadata']);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function pipelineStatusEntry(mixed $metadata, string $pipeline): ?array
    {
        if (! is_array($metadata)) {
            return null;
        }

        $aiProcessing = $metadata['ai_processing'] ?? null;

        if (is_string($aiProcessing)) {
            return ['status' => $aiProcessing];
        }

        if (! is_array($aiProcessing)) {
            return null;
        }

        $entry = $aiProcessing[$pipeline] ?? null;

        if (is_string($entry)) {
            return ['status' => $entry];
        }

        if (is_array($entry)) {
            return $entry;
        }

        return ['status' => 'queued'];
    }

    private function normalizePipelineStatus(mixed $status): string
    {
        $status = is_string($status) ? trim($status) : '';

        return $status !== '' ? $status : 'queued';
    }

    private function pipelineStatusMessage(string $pipeline, string $status, mixed $storedMessage = null): string
    {
        if (is_string($storedMessage) && trim($storedMessage) !== '') {
            return trim($storedMessage);
        }

        $label = match ($pipeline) {
            'pdf_parsing' => 'PDF parsing',
            'ai_metadata' => 'AI metadata extraction',
            'sdg_classification' => 'SDG classification',
            default => 'AI processing',
        };

        return match ($status) {
            'queued' => "{$label} is queued.",
            'processing' => "{$label} is still processing.",
            'skipped' => "{$label} is unavailable in this environment.",
            'failed' => "{$label} failed.",
            'completed' => "{$label} completed, but detailed results are not available yet.",
            default => "{$label} is not available yet.",
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyPayload(Research $research, string $resultType, ?int $fileId = null): array
    {
        return [
            'research_id' => $research->id,
            'file_id' => $fileId,
            'agency_id' => $research->agency_id,
            'result_type' => $resultType,
            'status' => 'not_available',
            'confidence_score' => null,
            'generated_at' => null,
            'reviewed_at' => null,
            'reviewed_by' => null,
            'message' => 'No AI/PDF/SDG result is available for this research record yet.',
        ];
    }

    private function dateToIso(mixed $value): ?string
    {
        return $value?->toISOString();
    }
}
