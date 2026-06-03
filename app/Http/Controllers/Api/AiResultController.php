<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use App\Models\Research;
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

        return ApiResponse::success('Agency AI results retrieved.', [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'status' => 'suggested_unverified',
            'pdf_parsing_result' => $this->pdfPayload($research, false),
            'ai_metadata' => $this->metadataPayload($research, false),
            'sdg_classification' => $this->sdgPayload($research, false),
        ]);
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
        return ApiResponse::success('Admin AI results retrieved.', [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'status' => 'suggested_unverified',
            'pdf_parsing_result' => $this->pdfPayload($research, true),
            'ai_metadata' => $this->metadataPayload($research, true),
            'sdg_classification' => $this->sdgPayload($research, true),
        ]);
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
    private function pdfPayload(Research $research, bool $includeRawPayload): array
    {
        $result = $this->latestMongoResult(PdfParsingResult::class, $research);

        if (! $result) {
            return $this->emptyPayload($research, 'pdf_parsing_result');
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
    private function metadataPayload(Research $research, bool $includeRawPayload): array
    {
        $result = $this->latestMongoResult(AiMetadata::class, $research);

        if (! $result) {
            return $this->emptyPayload($research, 'ai_metadata');
        }

        return $this->metadataPayloadFromResult($research, $result, $includeRawPayload);
    }

    /**
     * @return array<string, mixed>
     */
    private function metadataPayloadFromResult(Research $research, mixed $result, bool $includeRawPayload): array
    {
        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'ai_metadata',
            'status' => $result->review_status ?? 'suggested_unverified',
            'confidence_score' => $result->confidence_score,
            'extracted_title' => $result->title,
            'extracted_authors' => $result->authors ?? [],
            'extracted_keywords' => $result->keywords ?? [],
            'extracted_abstract' => $result->abstract,
            'extracted_publication_year' => $result->publication_year,
            'extracted_research_category' => $result->research_category ?? $result->category,
            'warnings' => $result->warnings ?? [],
            'processing_errors' => $result->processing_errors ?? [],
            'detected_language' => $result->detected_language,
            'generated_at' => $this->dateToIso($result->created_at),
            'reviewed_at' => $this->dateToIso($result->reviewed_at),
            'reviewed_by' => $result->reviewed_by,
            'raw_payload' => $includeRawPayload ? $result->raw_ai_response : null,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function sdgPayload(Research $research, bool $includeRawPayload): array
    {
        $result = $this->latestMongoResult(SdgClassification::class, $research);

        if (! $result) {
            return $this->emptyPayload($research, 'sdg_classification');
        }

        return $this->sdgPayloadFromResult($research, $result, $includeRawPayload);
    }

    /**
     * @return array<string, mixed>
     */
    private function sdgPayloadFromResult(Research $research, mixed $result, bool $includeRawPayload): array
    {
        return array_filter([
            'research_id' => $research->id,
            'file_id' => $result->file_id,
            'agency_id' => $research->agency_id,
            'result_type' => 'sdg_classification',
            'status' => $result->review_status ?? 'suggested_unverified',
            'confidence_score' => $result->confidence_score,
            'suggested_sdg_tags' => $result->sdg_results ?? [],
            'primary_sdg' => $result->primary_sdg,
            'primary_sdg_label' => $result->primary_sdg_label,
            'generated_at' => $this->dateToIso($result->created_at),
            'reviewed_at' => $this->dateToIso($result->reviewed_at),
            'reviewed_by' => $result->reviewed_by,
            'raw_payload' => $includeRawPayload ? $result->raw_ai_response : null,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @param  class-string  $modelClass
     */
    private function latestMongoResult(string $modelClass, Research $research): mixed
    {
        if (app()->runningUnitTests()) {
            return null;
        }

        try {
            return $modelClass::query()
                ->where('research_id', $research->id)
                ->where('agency_id', $research->agency_id)
                ->latest('created_at')
                ->first();
        } catch (Throwable) {
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

        $sdgResults = $result->sdg_results ?? [];

        return collect($sdgResults)
            ->map(fn (mixed $item): mixed => is_array($item) ? ($item['sdg'] ?? $item['label'] ?? null) : $item)
            ->filter()
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
    private function emptyPayload(Research $research, string $resultType): array
    {
        return [
            'research_id' => $research->id,
            'file_id' => null,
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
