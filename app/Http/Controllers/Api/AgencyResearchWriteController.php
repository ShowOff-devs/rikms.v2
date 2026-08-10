<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MalwareScanException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Agency\DeleteResearchFileRequest;
use App\Http\Requests\Agency\StoreAgencyResearchRequest;
use App\Http\Requests\Agency\StoreReportHighlightFileRequest;
use App\Http\Requests\Agency\StoreResearchFileRequest;
use App\Http\Requests\Agency\SubmitAgencyResearchRequest;
use App\Http\Requests\Agency\UpdateAgencyResearchRequest;
use App\Http\Resources\ResearchFileResource;
use App\Http\Resources\ResearchResource;
use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\ResearchReportHighlight;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use App\Services\QuarantinedUploadStorage;
use App\Services\Reports\PerformanceCalculationService;
use App\Services\Reports\TerminalReportSubmissionValidator;
use App\Services\UploadSecurityScanner;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\PublicMetadata;
use App\Support\ResearchSlugger;
use App\Support\SecurityEventLogger;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AgencyResearchWriteController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly UploadSecurityScanner $uploadSecurityScanner,
        private readonly QuarantinedUploadStorage $quarantinedUploadStorage,
        private readonly PerformanceCalculationService $performanceCalculation,
        private readonly TerminalReportSubmissionValidator $terminalReportSubmissionValidator,
    ) {}

    public function store(StoreAgencyResearchRequest $request): JsonResponse
    {
        $user = $request->user();

        $research = DB::transaction(function () use ($request, $user): Research {
            $validated = $request->validated();
            $validated['research_owner_name'] = trim((string) ($validated['research_owner_name'] ?? '')) ?: $user->name;
            $validated['research_owner_email'] = mb_strtolower(trim((string) ($validated['research_owner_email'] ?? ''))) ?: $user->email;
            $validated['notify_owner_access_requests'] ??= true;
            $validated['notify_owner_research_inquiries'] ??= false;
            $validated['send_owner_copy_to_admin'] ??= false;
            $research = Research::create(array_merge(
                $this->researchPayload($validated),
                [
                    'slug' => ResearchSlugger::generateUniqueResearchSlug($request->string('title')->toString()),
                    'agency_id' => $user->agency_id,
                    'uploaded_by' => $user->id,
                    'status' => Statuses::RESEARCH_DRAFT,
                    'access_level' => $request->validated('access_level', 'request_required'),
                ],
            ));

            $this->syncReportData($research, $validated, (int) $user->id);

            AuditLogger::record($request, 'research.created', $research, null, $research->only([
                'id',
                'agency_id',
                'uploaded_by',
                'title',
                'status',
                'access_level',
            ]));

            return $research;
        });

        $this->notifyAgencyResearchCreated($research);

        return ApiResponse::success(
            'Agency research draft created.',
            (new ResearchResource($this->loadResearchResponseRelations($research)))->resolve($request),
            [],
            201,
        );
    }

    public function update(UpdateAgencyResearchRequest $request, Research $research): JsonResponse
    {
        $expectedDraftVersion = $request->validated('expected_draft_version');
        $currentDraftVersion = (int) ($research->reportDetail?->draft_version ?? 0);

        if ($expectedDraftVersion !== null
            && (int) $expectedDraftVersion !== $currentDraftVersion) {
            return ApiResponse::error(
                'This draft was updated in another session. Reload it before saving again.',
                ['expected_draft_version' => ['The draft has changed since it was loaded.']],
                409,
            );
        }

        $expectedUpdatedAt = $request->validated('expected_updated_at');

        if ($expectedDraftVersion === null && $expectedUpdatedAt
            && $research->updated_at?->toISOString() !== $expectedUpdatedAt) {
            return ApiResponse::error(
                'This draft was updated in another session. Reload it before saving again.',
                ['expected_updated_at' => ['The draft has changed since it was loaded.']],
                409,
            );
        }

        $oldValues = $research->only([
            'title',
            'abstract',
            'authors',
            'publication_year',
            'category',
            'sdgs',
            'keywords',
            'public_metadata',
            'public_metadata_fields',
            'access_level',
            'embargo_until',
            'external_url',
            'research_owner_name',
            'research_owner_email',
            'notify_owner_access_requests',
            'notify_owner_research_inquiries',
            'send_owner_copy_to_admin',
        ]);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            $validated = $request->validated();
            $payload = $this->researchPayload($validated);

            if (! $research->slug && ! empty($payload['title'])) {
                $payload['slug'] = ResearchSlugger::generateUniqueResearchSlug((string) $payload['title'], (int) $research->id);
            }

            $research->update($payload);
            $this->syncReportData($research->refresh(), $validated, (int) $request->user()->id);

            AuditLogger::record(
                $request,
                'research.updated',
                $research,
                $oldValues,
                $research->fresh()->only(array_keys($oldValues)),
            );
        });

        return ApiResponse::success(
            'Agency research draft updated.',
            (new ResearchResource($this->loadResearchResponseRelations($research->refresh())))->resolve($request),
        );
    }

    public function submit(SubmitAgencyResearchRequest $request, Research $research): JsonResponse
    {
        $this->terminalReportSubmissionValidator->validate($research);
        $oldValues = $research->only(['status', 'submitted_at']);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            $research->update([
                'status' => Statuses::RESEARCH_SUBMITTED,
                'submitted_at' => now(),
            ]);

            AuditLogger::record(
                $request,
                'research.submitted',
                $research,
                $oldValues,
                $research->fresh()->only(['status', 'submitted_at']),
                ['notes' => $request->validated('notes')],
            );
        });

        return ApiResponse::success(
            'Agency research submitted for moderation.',
            (new ResearchResource($this->loadResearchResponseRelations($research->refresh())))->resolve($request),
        );
    }

    public function createRevision(Request $request, Research $research): JsonResponse
    {
        if (! $request->user()?->can('createRevision', $research)) {
            return ApiResponse::error('Only published research from your agency can be revised.', [], 403);
        }

        $existingRevision = Research::query()
            ->where('revision_parent_id', $research->id)
            ->whereIn('status', [
                Statuses::RESEARCH_DRAFT,
                Statuses::RESEARCH_SUBMITTED,
                Statuses::RESEARCH_UNDER_REVIEW,
                'approved',
                'rejected',
            ])
            ->whereNull('archived_at')
            ->latest()
            ->first();

        if ($existingRevision) {
            return ApiResponse::success(
                'Draft revision already exists.',
                (new ResearchResource($existingRevision->load(['agency', 'uploader'])))->resolve($request),
            );
        }

        $revision = DB::transaction(function () use ($request, $research): Research {
            $revision = Research::create([
                'slug' => ResearchSlugger::generateUniqueResearchSlug($research->title.' revision '.((int) $research->revision_number + 1)),
                'agency_id' => $research->agency_id,
                'uploaded_by' => $request->user()->id,
                'revision_parent_id' => $research->id,
                'revision_number' => (int) $research->revision_number + 1,
                'title' => $research->title,
                'abstract' => $research->abstract,
                'authors' => $research->authors ?? [],
                'publication_year' => $research->publication_year,
                'category' => $research->category,
                'sdgs' => $research->sdgs ?? [],
                'keywords' => $research->keywords ?? [],
                'public_metadata' => $research->public_metadata ?? [],
                'public_metadata_fields' => $research->public_metadata_fields ?? [],
                'status' => Statuses::RESEARCH_DRAFT,
                'access_level' => $research->access_level,
                'downloads' => 0,
                'embargo_until' => $research->embargo_until,
                'external_url' => $research->external_url,
                'research_owner_name' => $research->research_owner_name,
                'research_owner_email' => $research->research_owner_email,
                'notify_owner_access_requests' => $research->notify_owner_access_requests,
                'notify_owner_research_inquiries' => $research->notify_owner_research_inquiries,
                'send_owner_copy_to_admin' => $research->send_owner_copy_to_admin,
            ]);

            $this->copyReportDataToRevision($research, $revision);

            AuditLogger::record($request, 'research.revision_created', $revision, null, [
                'source_research_id' => $research->id,
                'revision_number' => $revision->revision_number,
                'status' => $revision->status,
            ]);

            return $revision;
        });

        return ApiResponse::success(
            'Draft revision created.',
            (new ResearchResource($this->loadResearchResponseRelations($revision)))->resolve($request),
            [],
            201,
        );
    }

    public function files(Request $request, Research $research): JsonResponse
    {
        if (! $request->user()?->can('uploadFile', $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        return ApiResponse::success(
            'Agency research files retrieved.',
            ResearchFileResource::collection(
                $research->files()->whereNull('archived_at')->latest()->get(),
            )->resolve($request),
        );
    }

    public function storeFile(StoreResearchFileRequest $request, Research $research): JsonResponse
    {
        $uploadedFile = $request->file('file');
        $checksum = hash_file('sha256', $uploadedFile->getRealPath());

        if ($research->files()
            ->whereNull('archived_at')
            ->where('status', 'active')
            ->where('checksum', $checksum)
            ->exists()
        ) {
            return ApiResponse::error(
                'This PDF has already been uploaded for this research record.',
                ['file' => ['This PDF has already been uploaded for this research record.']],
                422,
            );
        }

        $storedName = (string) Str::uuid().'.'.$uploadedFile->getClientOriginalExtension();
        $quarantineDisk = (string) config('rikms.uploads.quarantine_disk', 'local');
        $storageDisk = (string) config('rikms.uploads.storage_disk', 'local');
        $quarantinePath = $uploadedFile->storeAs('research/quarantine', $storedName, $quarantineDisk);

        try {
            $scan = $this->uploadSecurityScanner->scanStoredFile($quarantineDisk, $quarantinePath);
        } catch (Throwable $exception) {
            $reason = $exception instanceof MalwareScanException ? $exception->reason : 'scan_failed';
            $this->logScannerFailure($request, $research, $quarantinePath, $reason);
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'scanner_error');
            $this->auditRejectedUpload($request, $research, $uploadedFile->getClientOriginalName(), $uploadedFile->getSize(), $checksum, [
                'status' => 'scanner_error',
                'engine' => (string) config('rikms.uploads.malware_scanner', 'none'),
            ]);

            return ApiResponse::error(
                'The uploaded file could not be accepted because it failed the document safety check.',
                ['file' => ['The uploaded file could not be accepted because it failed the document safety check.']],
                422,
            );
        }

        if (! $scan['clean']) {
            Log::warning('Upload rejected after malware detection.', [
                'event' => 'upload.infected_file',
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'engine' => $scan['engine'],
                'signature_count' => count($scan['signatures']),
                'quarantine_path_hash' => hash('sha256', $quarantinePath),
            ]);
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'infected');
            $this->auditRejectedUpload($request, $research, $uploadedFile->getClientOriginalName(), $uploadedFile->getSize(), $checksum, $scan);

            $encrypted = in_array('encrypted-pdf', $scan['signatures'], true);

            return ApiResponse::error(
                $encrypted
                    ? 'Password-protected or encrypted PDFs are not supported during the pilot release.'
                    : 'The uploaded file could not be accepted because it failed the document safety check.',
                ['file' => [$encrypted
                    ? 'Password-protected or encrypted PDFs are not supported during the pilot release.'
                    : 'The uploaded file could not be accepted because it failed the document safety check.']],
                422,
            );
        }

        $path = 'research/'.$research->id.'/'.$storedName;

        if (! $this->quarantinedUploadStorage->promote($quarantineDisk, $quarantinePath, $storageDisk, $path)) {
            Log::error('Clean upload could not be promoted from quarantine.', [
                'event' => 'upload.promotion_failed',
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'quarantine_disk' => $quarantineDisk,
                'storage_disk' => $storageDisk,
                'quarantine_path_hash' => hash('sha256', $quarantinePath),
                'destination_path_hash' => hash('sha256', $path),
            ]);
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'promotion_failed');

            AuditLogger::record($request, 'research_file.storage_failed', null, null, null, [
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'checksum' => $checksum,
            ]);

            return ApiResponse::error(
                'The uploaded PDF could not be stored safely. Please try again.',
                ['file' => ['The uploaded PDF could not be stored safely. Please try again.']],
                500,
            );
        }

        $aiEnabled = $this->settings->aiProcessingEnabled();

        $researchFile = DB::transaction(function () use ($request, $research, $uploadedFile, $checksum, $storedName, $storageDisk, $path, $scan, $aiEnabled): ResearchFile {
            $researchFile = ResearchFile::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'uploaded_by' => $request->user()->id,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'stored_name' => $storedName,
                'disk' => $storageDisk,
                'path' => $path,
                'mime_type' => $uploadedFile->getMimeType(),
                'extension' => $uploadedFile->getClientOriginalExtension(),
                'size_bytes' => $uploadedFile->getSize(),
                'checksum' => $checksum,
                'file_type' => $request->validated('file_type', 'research_document'),
                'visibility' => $request->validated('visibility', 'private'),
                'access_level' => $request->validated('access_level', 'restricted'),
                'status' => 'active',
                'metadata' => [
                    'security_scan' => [
                        'status' => 'passed',
                        'engine' => $scan['engine'],
                        'signatures' => $scan['signatures'],
                        'scanned_at' => $scan['scanned_at'],
                        'malware_scanner' => $scan['malware_scanner'],
                    ],
                    'ai_processing' => $aiEnabled
                        ? [
                            'pdf_parsing' => ['status' => 'queued'],
                            'ai_metadata' => ['status' => 'queued'],
                            'sdg_classification' => ['status' => 'queued'],
                        ]
                        : [
                            'pdf_parsing' => ['status' => 'skipped', 'message' => 'AI-assisted processing is currently disabled.'],
                            'ai_metadata' => ['status' => 'skipped', 'message' => 'AI-assisted processing is currently disabled.'],
                            'sdg_classification' => ['status' => 'skipped', 'message' => 'AI-assisted processing is currently disabled.'],
                        ],
                ],
                'uploaded_at' => now(),
            ]);

            AuditLogger::record($request, 'research_file.uploaded', $researchFile, null, $researchFile->only([
                'id',
                'research_id',
                'agency_id',
                'uploaded_by',
                'original_name',
                'mime_type',
                'size_bytes',
                'checksum',
                'status',
            ]));

            return $researchFile;
        });

        if ($aiEnabled) {
            Bus::chain([
                new ParsePdfDocumentJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
                new ExtractResearchMetadataJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
                new ClassifyResearchSdgJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
            ])->dispatch();
        } else {
            app(AiPipelineResultWriter::class)->markAiProcessingSkipped((int) $researchFile->id);
        }

        return ApiResponse::success(
            $aiEnabled
                ? 'Research file uploaded and AI processing jobs queued.'
                : 'Research file uploaded. AI-assisted processing is currently disabled.',
            (new ResearchFileResource($researchFile->load(['research', 'uploader'])))->resolve($request),
            [],
            201,
        );
    }

    public function downloadFile(Request $request, Research $research, ResearchFile $file): JsonResponse|StreamedResponse
    {
        if ((int) $file->research_id !== (int) $research->id) {
            return ApiResponse::error('The file does not belong to this research record.', [], 404);
        }

        if (! $this->canAccessAgencyResearch($request, $research)) {
            return ApiResponse::error('This research record is outside your agency scope.', [], 403);
        }

        if ($file->archived_at !== null || $file->status !== 'active') {
            return ApiResponse::error('This research file is not available for download.', [], 404);
        }

        if (! Storage::disk($file->disk)->exists($file->path)) {
            return ApiResponse::error('The stored research file could not be found.', [], 404);
        }

        return Storage::disk($file->disk)->download($file->path, $file->original_name);
    }

    public function storeHighlightFile(
        StoreReportHighlightFileRequest $request,
        Research $research,
        ResearchReportHighlight $highlight,
    ): JsonResponse {
        if ((int) $highlight->research_id !== (int) $research->id) {
            return ApiResponse::error('The highlight does not belong to this report.', [], 404);
        }

        if ($highlight->files()->count() >= StoreReportHighlightFileRequest::MAX_FILES) {
            return ApiResponse::error(
                'A highlight may have at most '.StoreReportHighlightFileRequest::MAX_FILES.' supporting files.',
                ['file' => ['Remove a supporting file before uploading another.']],
                422,
            );
        }

        $uploadedFile = $request->file('file');
        $checksum = hash_file('sha256', $uploadedFile->getRealPath());

        if ($highlight->files()->where('checksum', $checksum)->exists()) {
            return ApiResponse::error(
                'This supporting file has already been uploaded.',
                ['file' => ['This supporting file has already been uploaded.']],
                422,
            );
        }

        $extension = mb_strtolower($uploadedFile->getClientOriginalExtension());
        $storedName = (string) Str::uuid().'.'.$extension;
        $quarantineDisk = (string) config('rikms.uploads.quarantine_disk', 'local');
        $storageDisk = (string) config('rikms.uploads.storage_disk', 'local');
        $quarantinePath = $uploadedFile->storeAs('research/quarantine', $storedName, $quarantineDisk);

        try {
            $scan = $this->uploadSecurityScanner->scanStoredFile($quarantineDisk, $quarantinePath);
        } catch (Throwable $exception) {
            $reason = $exception instanceof MalwareScanException ? $exception->reason : 'scan_failed';
            $this->logScannerFailure($request, $research, $quarantinePath, $reason);
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'scanner_error');

            return ApiResponse::error(
                'The supporting file failed the document safety check.',
                ['file' => ['The supporting file failed the document safety check.']],
                422,
            );
        }

        if (! $scan['clean']) {
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'infected');
            $this->auditRejectedUpload($request, $research, $uploadedFile->getClientOriginalName(), $uploadedFile->getSize(), $checksum, $scan);

            return ApiResponse::error(
                'The supporting file failed the document safety check.',
                ['file' => ['The supporting file failed the document safety check.']],
                422,
            );
        }

        $path = 'research/'.$research->id.'/highlights/'.$highlight->id.'/'.$storedName;

        if (! $this->quarantinedUploadStorage->promote($quarantineDisk, $quarantinePath, $storageDisk, $path)) {
            $this->cleanupQuarantine($research, $quarantineDisk, $quarantinePath, 'promotion_failed');

            return ApiResponse::error(
                'The supporting file could not be stored safely.',
                ['file' => ['The supporting file could not be stored safely.']],
                500,
            );
        }

        try {
            $researchFile = DB::transaction(function () use ($request, $research, $highlight, $uploadedFile, $checksum, $storedName, $extension, $storageDisk, $path, $scan): ResearchFile {
                $file = ResearchFile::create([
                    'research_id' => $research->id,
                    'report_highlight_id' => $highlight->id,
                    'agency_id' => $research->agency_id,
                    'uploaded_by' => $request->user()->id,
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'stored_name' => $storedName,
                    'disk' => $storageDisk,
                    'path' => $path,
                    'mime_type' => $uploadedFile->getMimeType(),
                    'extension' => $extension,
                    'size_bytes' => $uploadedFile->getSize(),
                    'checksum' => $checksum,
                    'file_type' => 'report-highlight-supporting',
                    'visibility' => 'private',
                    'access_level' => 'restricted',
                    'status' => 'active',
                    'metadata' => [
                        'security_scan' => [
                            'status' => 'passed',
                            'engine' => $scan['engine'],
                            'signatures' => $scan['signatures'],
                            'scanned_at' => $scan['scanned_at'],
                            'malware_scanner' => $scan['malware_scanner'],
                        ],
                    ],
                    'uploaded_at' => now(),
                ]);

                AuditLogger::record($request, 'report_highlight_file.uploaded', $file, null, $file->only([
                    'id', 'research_id', 'report_highlight_id', 'agency_id', 'original_name', 'checksum', 'status',
                ]));

                return $file;
            });
        } catch (Throwable $exception) {
            Storage::disk($storageDisk)->delete($path);
            throw $exception;
        }

        return ApiResponse::success(
            'Highlight supporting file uploaded.',
            (new ResearchFileResource($researchFile))->resolve($request),
            [],
            201,
        );
    }

    public function destroyFile(DeleteResearchFileRequest $request, Research $research, ResearchFile $file): JsonResponse
    {
        if ((int) $file->research_id !== (int) $research->id) {
            return ApiResponse::error('The file does not belong to this research record.', [], 404);
        }

        $oldValues = $file->only(['status', 'path', 'archived_at']);

        DB::transaction(function () use ($request, $file, $oldValues): void {
            $file->update([
                'status' => 'deleted',
                'archived_at' => now(),
                'archived_by' => $request->user()->id,
                'archive_reason' => 'Deleted by agency administrator.',
            ]);
            $file->delete();

            AuditLogger::record(
                $request,
                'research_file.deleted',
                $file,
                $oldValues,
                $file->fresh()?->only(['status', 'path', 'archived_at']),
            );
        });

        Storage::disk($file->disk)->delete($file->path);

        return ApiResponse::success('Research file deleted.');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function researchPayload(array $validated): array
    {
        if (array_key_exists('sdg_tags', $validated) && ! array_key_exists('sdgs', $validated)) {
            $validated['sdgs'] = $validated['sdg_tags'];
        }

        unset($validated['sdg_tags']);

        if (array_key_exists('public_metadata', $validated)) {
            $validated['public_metadata'] = PublicMetadata::normalizeMetadataEntries($validated['public_metadata']);
        }

        if (array_key_exists('public_metadata_fields', $validated)) {
            $validated['public_metadata_fields'] = PublicMetadata::normalizeFieldList($validated['public_metadata_fields']);
        } elseif (array_key_exists('public_metadata', $validated)) {
            $validated['public_metadata_fields'] = PublicMetadata::fieldListFromMetadata($validated['public_metadata']);
        }

        return collect($validated)->only([
            'title',
            'abstract',
            'authors',
            'publication_year',
            'category',
            'sdgs',
            'keywords',
            'public_metadata',
            'public_metadata_fields',
            'access_level',
            'embargo_until',
            'external_url',
            'research_owner_name',
            'research_owner_email',
            'notify_owner_access_requests',
            'notify_owner_research_inquiries',
            'send_owner_copy_to_admin',
        ])->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncReportData(Research $research, array $validated, ?int $actorId = null): void
    {
        if (! $this->isReportResearch($research)) {
            return;
        }

        if (array_key_exists('report_details', $validated) && is_array($validated['report_details'])) {
            $detailPayload = collect($validated['report_details'])
                ->only([
                    'reporting_period',
                    'project_start_date',
                    'project_end_date',
                    'allotted_budget',
                    'released_amount',
                    'obligated_amount',
                    'utilized_amount',
                    'physical_accomplishment_percent',
                    'financial_as_of_date',
                    'pap_categories',
                    'pap_description',
                    'beneficiary_sectors',
                    'performance_remarks',
                    'last_wizard_step',
                ])
                ->all();

            if ($detailPayload !== []) {
                $detailPayload['draft_version'] = (int) ($research->reportDetail?->draft_version ?? 0) + 1;
                $research->reportDetail()->updateOrCreate([], $detailPayload);
            }
        }

        if (array_key_exists('performance_items', $validated) && is_array($validated['performance_items'])) {
            $research->performanceItems()->delete();

            foreach (array_values($validated['performance_items']) as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }

                if ($this->isBlankPerformanceItem($item)) {
                    continue;
                }

                $canonical = $this->performanceCalculation->canonicalize($item);
                $payload = collect($canonical)
                    ->only([
                        'project_name',
                        'target_value',
                        'actual_value',
                        'target_numeric_value',
                        'actual_numeric_value',
                        'unit',
                        'accomplishment_percentage',
                        'project_status',
                        'remarks',
                    ])
                    ->all();

                $research->performanceItems()->create(array_merge($payload, [
                    'sort_order' => (int) ($item['sort_order'] ?? $index),
                ]));
            }
        }

        if (array_key_exists('report_highlights', $validated) && is_array($validated['report_highlights'])) {
            $retainedIds = [];

            foreach (array_values($validated['report_highlights']) as $index => $highlight) {
                if (! is_array($highlight) || $this->isBlankHighlight($highlight)) {
                    continue;
                }

                $payload = collect($highlight)->only([
                    'title',
                    'description',
                    'is_featured',
                    'sort_order',
                ])->all();
                $payload['sort_order'] = (int) ($highlight['sort_order'] ?? $index);
                $highlightId = $highlight['id'] ?? null;

                if ($highlightId !== null) {
                    $record = $research->reportHighlights()->whereKey($highlightId)->first();

                    if (! $record) {
                        throw ValidationException::withMessages([
                            'report_highlights' => ['A highlight does not belong to this report.'],
                        ]);
                    }

                    $record->update($payload);
                } else {
                    $record = $research->reportHighlights()->create($payload);
                }

                $retainedIds[] = (int) $record->id;
            }

            $research->reportHighlights()
                ->when($retainedIds !== [], fn ($query) => $query->whereNotIn('id', $retainedIds))
                ->get()
                ->each(function (ResearchReportHighlight $highlight) use ($actorId): void {
                    $highlight->files()->update([
                        'status' => 'archived',
                        'archived_at' => now(),
                        'archived_by' => $actorId,
                        'archive_reason' => 'Highlight removed from report draft.',
                    ]);
                    $highlight->delete();
                });
        }
    }

    private function auditRejectedUpload(
        Request $request,
        Research $research,
        string $originalName,
        int $size,
        string $checksum,
        array $scan,
    ): void {
        $metadata = [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'original_name' => $originalName,
            'size_bytes' => $size,
            'checksum' => $checksum,
            'security_scan' => $scan,
        ];

        AuditLogger::record($request, 'research_file.security_rejected', null, null, null, $metadata);
        SecurityEventLogger::record($request, 'upload.security_rejected', $request->user(), 'high', $metadata);
    }

    private function cleanupQuarantine(Research $research, string $disk, string $path, string $reason): void
    {
        if ($this->quarantinedUploadStorage->cleanup($disk, $path)) {
            return;
        }

        Log::warning('Quarantined upload cleanup failed.', [
            'event' => 'upload.quarantine_cleanup_failed',
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'disk' => $disk,
            'reason' => $reason,
            'quarantine_path_hash' => hash('sha256', $path),
        ]);
    }

    private function logScannerFailure(Request $request, Research $research, string $path, string $reason): void
    {
        $context = [
            'event' => $reason === 'unavailable' ? 'upload.scanner_unavailable' : 'upload.scan_failed',
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'user_id' => $request->user()?->id,
            'scanner' => (string) config('rikms.uploads.malware_scanner', 'unknown'),
            'reason' => $reason,
            'quarantine_path_hash' => hash('sha256', $path),
        ];

        Log::warning(
            $reason === 'unavailable' ? 'Malware scanner unavailable.' : 'Malware scan failed.',
            $context,
        );
    }

    private function isBlankPerformanceItem(array $item): bool
    {
        foreach ([
            'project_name',
            'target_value',
            'actual_value',
            'target_numeric_value',
            'actual_numeric_value',
            'unit',
            'accomplishment_percentage',
            'remarks',
        ] as $key) {
            if (! array_key_exists($key, $item)) {
                continue;
            }

            $value = $item[$key];

            if ($value !== null && (! is_string($value) || trim($value) !== '')) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $highlight
     */
    private function isBlankHighlight(array $highlight): bool
    {
        return collect(['title', 'description'])->every(function (string $key) use ($highlight): bool {
            $value = $highlight[$key] ?? null;

            return $value === null || (is_string($value) && trim($value) === '');
        });
    }

    private function isReportResearch(Research $research): bool
    {
        $category = str((string) $research->category)->lower()->toString();

        if (str_contains($category, 'terminal report') || str_contains($category, 'project accomplishment')) {
            return true;
        }

        return $research->files()
            ->whereIn('file_type', ['terminal-report', 'project-accomplishment'])
            ->exists();
    }

    private function copyReportDataToRevision(Research $source, Research $revision): void
    {
        $source->loadMissing(['reportDetail', 'performanceItems', 'reportHighlights.files']);

        if ($source->reportDetail) {
            $revision->reportDetail()->create($source->reportDetail->only([
                'reporting_period',
                'project_start_date',
                'project_end_date',
                'allotted_budget',
                'released_amount',
                'obligated_amount',
                'utilized_amount',
                'physical_accomplishment_percent',
                'financial_as_of_date',
                'pap_categories',
                'pap_description',
                'beneficiary_sectors',
                'performance_remarks',
                'last_wizard_step',
            ]));
        }

        $source->performanceItems->each(function ($item) use ($revision): void {
            $revision->performanceItems()->create($item->only([
                'project_name',
                'target_value',
                'actual_value',
                'target_numeric_value',
                'actual_numeric_value',
                'unit',
                'accomplishment_percentage',
                'project_status',
                'remarks',
                'sort_order',
            ]));
        });

        $source->reportHighlights->each(function (ResearchReportHighlight $highlight) use ($revision): void {
            $revisionHighlight = $revision->reportHighlights()->create($highlight->only([
                'title',
                'description',
                'is_featured',
                'sort_order',
            ]));

            $highlight->files->each(function (ResearchFile $file) use ($revision, $revisionHighlight): void {
                $revision->files()->create(array_merge($file->only([
                    'agency_id',
                    'uploaded_by',
                    'original_name',
                    'stored_name',
                    'disk',
                    'path',
                    'mime_type',
                    'extension',
                    'size_bytes',
                    'checksum',
                    'file_type',
                    'visibility',
                    'access_level',
                    'status',
                    'metadata',
                    'uploaded_at',
                ]), [
                    'report_highlight_id' => $revisionHighlight->id,
                ]));
            });
        });
    }

    private function loadResearchResponseRelations(Research $research): Research
    {
        return Research::query()
            ->with(['agency', 'uploader', 'latestModerationDecision.reviewer', 'files', 'reportDetail', 'performanceItems', 'reportHighlights.files'])
            ->findOrFail($research->id);
    }

    private function canAccessAgencyResearch(Request $request, Research $research): bool
    {
        return $request->user()?->isSuperAdmin() === true
            || (
                $request->user()?->agency_id !== null
                && (int) $request->user()->agency_id === (int) $research->agency_id
            );
    }

    private function notifyAgencyResearchCreated(Research $research): void
    {
        UserNotificationPreferences::agencyAdmins(
            (int) $research->agency_id,
            'notifyNewResearchUploads',
        )->each(function ($user) use ($research): void {
            Notification::create([
                'user_id' => $user->id,
                'agency_id' => $research->agency_id,
                'type' => 'research.created',
                'title' => 'New research record',
                'message' => 'A new research record was created in your agency repository.',
                'data' => [
                    'research_id' => $research->id,
                    'status' => $research->status,
                ],
                'action_url' => '/agency/research/'.$research->id,
                'priority' => 'normal',
                'status' => Statuses::NOTIFICATION_UNREAD,
            ]);
        });
    }
}
