<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DraftWriteConflictException;
use App\Exceptions\MalwareScanException;
use App\Exceptions\UploadConstraintException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Agency\DeleteResearchFileRequest;
use App\Http\Requests\Agency\StoreAgencyResearchRequest;
use App\Http\Requests\Agency\StoreReportHighlightFileRequest;
use App\Http\Requests\Agency\StoreResearchFileRequest;
use App\Http\Requests\Agency\SubmitAgencyResearchRequest;
use App\Http\Requests\Agency\UpdateAgencyResearchRequest;
use App\Http\Resources\ResearchFileResource;
use App\Http\Resources\ResearchResource;
use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\ResearchReportHighlight;
use App\Services\AiPipelineDispatcher;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use App\Services\QuarantinedUploadStorage;
use App\Services\Reports\PerformanceCalculationService;
use App\Services\Reports\TerminalReportSubmissionValidator;
use App\Services\ResearchFileStorage;
use App\Services\ResearchUploadCommitService;
use App\Services\UploadQuotaService;
use App\Services\UploadSecurityScanner;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\PublicMetadata;
use App\Support\ResearchSlugger;
use App\Support\SecurityEventLogger;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        private readonly AiPipelineDispatcher $aiPipelineDispatcher,
        private readonly UploadSecurityScanner $uploadSecurityScanner,
        private readonly QuarantinedUploadStorage $quarantinedUploadStorage,
        private readonly ResearchFileStorage $researchFileStorage,
        private readonly ResearchUploadCommitService $researchUploadCommitter,
        private readonly UploadQuotaService $uploadQuota,
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
        $expectedUpdatedAt = $request->validated('expected_updated_at');
        $actor = $request->user();

        try {
            DB::transaction(function () use ($request, $research, $actor, $expectedDraftVersion, $expectedUpdatedAt): void {
                $lockedResearch = Research::query()
                    ->whereKey($research->id)
                    ->where('agency_id', $actor?->agency_id)
                    ->lockForUpdate()
                    ->first();

                if (! $lockedResearch || ! $actor?->isActive() || ! $actor->can('updateAgencyDraft', $lockedResearch)) {
                    throw new AuthorizationException;
                }

                $lockedDetail = $lockedResearch->reportDetail()->lockForUpdate()->first();

                if ($lockedDetail) {
                    $lockedResearch->setRelation('reportDetail', $lockedDetail);
                }

                $currentDraftVersion = (int) ($lockedDetail?->draft_version ?? 0);

                if ($expectedDraftVersion !== null && (int) $expectedDraftVersion !== $currentDraftVersion) {
                    throw new DraftWriteConflictException('expected_draft_version');
                }

                if ($expectedDraftVersion === null && $expectedUpdatedAt
                    && $lockedResearch->updated_at?->toISOString() !== $expectedUpdatedAt) {
                    throw new DraftWriteConflictException('expected_updated_at');
                }

                $oldValues = $lockedResearch->only([
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
                $validated = $request->validated();
                $payload = $this->researchPayload($validated);

                if (! $lockedResearch->slug && ! empty($payload['title'])) {
                    $payload['slug'] = ResearchSlugger::generateUniqueResearchSlug((string) $payload['title'], (int) $lockedResearch->id);
                }

                $lockedResearch->update($payload);
                $this->syncReportData($lockedResearch->refresh(), $validated, (int) $actor->id);

                AuditLogger::record(
                    $request,
                    'research.updated',
                    $lockedResearch,
                    $oldValues,
                    $lockedResearch->fresh()->only(array_keys($oldValues)),
                );
            });
        } catch (DraftWriteConflictException $exception) {
            return ApiResponse::error(
                $exception->getMessage(),
                [$exception->field => ['The draft has changed since it was loaded.']],
                409,
            );
        }

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

        $copiedObjects = [];

        try {
            $result = DB::transaction(function () use ($request, $research, &$copiedObjects): array {
                $actor = $request->user();

                if (! $actor?->isActive() || $actor->agency_id === null) {
                    throw new AuthorizationException;
                }

                Agency::query()->whereKey($actor->agency_id)->lockForUpdate()->firstOrFail();
                $lockedResearch = Research::query()
                    ->whereKey($research->id)
                    ->where('agency_id', $actor->agency_id)
                    ->lockForUpdate()
                    ->first();

                if (! $lockedResearch || ! $actor->can('createRevision', $lockedResearch)) {
                    throw new AuthorizationException;
                }

                $existingRevision = Research::query()
                    ->where('active_revision_parent_id', $lockedResearch->id)
                    ->latest()
                    ->first();

                if ($existingRevision) {
                    return ['revision' => $existingRevision, 'created' => false];
                }

                $lockedResearch->load([
                    'reportHighlights.files' => fn ($query) => $query
                        ->where('status', 'active')
                        ->whereNull('archived_at'),
                ]);
                $revisionBytes = $lockedResearch->reportHighlights
                    ->flatMap->files
                    ->sum(fn (ResearchFile $file): int => max(0, (int) $file->size_bytes));

                if (! $this->uploadQuota->canStore((int) $lockedResearch->agency_id, $revisionBytes)) {
                    throw new UploadConstraintException($this->uploadQuota->message());
                }

                $revision = Research::create([
                    'slug' => ResearchSlugger::generateUniqueResearchSlug($lockedResearch->title.' revision '.((int) $lockedResearch->revision_number + 1)),
                    'agency_id' => $lockedResearch->agency_id,
                    'uploaded_by' => $actor->id,
                    'revision_parent_id' => $lockedResearch->id,
                    'revision_number' => (int) $lockedResearch->revision_number + 1,
                    'title' => $lockedResearch->title,
                    'abstract' => $lockedResearch->abstract,
                    'authors' => $lockedResearch->authors ?? [],
                    'publication_year' => $lockedResearch->publication_year,
                    'category' => $lockedResearch->category,
                    'sdgs' => $lockedResearch->sdgs ?? [],
                    'keywords' => $lockedResearch->keywords ?? [],
                    'public_metadata' => $lockedResearch->public_metadata ?? [],
                    'public_metadata_fields' => $lockedResearch->public_metadata_fields ?? [],
                    'status' => Statuses::RESEARCH_DRAFT,
                    'access_level' => $lockedResearch->access_level,
                    'downloads' => 0,
                    'embargo_until' => $lockedResearch->embargo_until,
                    'external_url' => $lockedResearch->external_url,
                    'research_owner_name' => $lockedResearch->research_owner_name,
                    'research_owner_email' => $lockedResearch->research_owner_email,
                    'notify_owner_access_requests' => $lockedResearch->notify_owner_access_requests,
                    'notify_owner_research_inquiries' => $lockedResearch->notify_owner_research_inquiries,
                    'send_owner_copy_to_admin' => $lockedResearch->send_owner_copy_to_admin,
                ]);

                $this->copyReportDataToRevision($lockedResearch, $revision, $copiedObjects);

                AuditLogger::record($request, 'research.revision_created', $revision, null, [
                    'source_research_id' => $lockedResearch->id,
                    'revision_number' => $revision->revision_number,
                    'status' => $revision->status,
                ]);

                return ['revision' => $revision, 'created' => true];
            });
        } catch (UploadConstraintException $exception) {
            $this->researchFileStorage->cleanup($copiedObjects);

            return ApiResponse::error($exception->getMessage(), [], $exception->statusCode);
        } catch (QueryException $exception) {
            $this->researchFileStorage->cleanup($copiedObjects);

            if ($this->isConstraintViolation($exception, 'research_active_revision_parent_unique')) {
                $existingRevision = Research::query()
                    ->where('active_revision_parent_id', $research->id)
                    ->latest()
                    ->first();

                if ($existingRevision) {
                    $result = ['revision' => $existingRevision, 'created' => false];
                } else {
                    return $this->databaseConflictResponse('The draft revision changed concurrently. Reload the record before trying again.');
                }
            } elseif ($this->isDeadlock($exception)) {
                return $this->databaseConflictResponse('The draft revision could not be created because another write completed first. Try again.');
            } else {
                throw $exception;
            }
        } catch (Throwable $exception) {
            $this->researchFileStorage->cleanup($copiedObjects);

            throw $exception;
        }

        /** @var Research $revision */
        $revision = $result['revision'];

        if (! $result['created']) {
            return ApiResponse::success(
                'Draft revision already exists.',
                (new ResearchResource($revision->load(['agency', 'uploader'])))->resolve($request),
            );
        }

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
        $quarantineDisk = (string) config('rikms.uploads.quarantine_disk', 'upload_quarantine');
        $storageDisk = (string) config('rikms.uploads.storage_disk', 'private_uploads');
        $quarantinePath = $uploadedFile->storeAs('research/quarantine', $storedName, $quarantineDisk);

        if (! is_string($quarantinePath) || $quarantinePath === '') {
            return ApiResponse::error('The uploaded PDF could not be staged safely. Please try again.', [], 500);
        }

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

        try {
            $researchFile = $this->researchUploadCommitter->commitMain($request, (int) $research->id, [
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
        } catch (UploadConstraintException $exception) {
            Storage::disk($storageDisk)->delete($path);

            return $this->uploadConstraintResponse($exception);
        } catch (QueryException $exception) {
            Storage::disk($storageDisk)->delete($path);

            if ($this->isDeadlock($exception)) {
                return $this->databaseConflictResponse('The upload conflicted with another agency upload. Try again.');
            }

            throw $exception;
        } catch (Throwable $exception) {
            Storage::disk($storageDisk)->delete($path);

            throw $exception;
        }

        $aiQueueFailed = false;

        if ($aiEnabled) {
            try {
                $this->aiPipelineDispatcher->dispatch($researchFile);
            } catch (Throwable $exception) {
                app(AiPipelineResultWriter::class)->markAiProcessingFailed(
                    (int) $researchFile->id,
                    'AI processing could not be queued. An administrator may retry it.',
                );
                Log::error('Research upload succeeded but AI processing could not be queued.', [
                    'research_id' => $research->id,
                    'file_id' => $researchFile->id,
                    'error' => $exception->getMessage(),
                ]);
                $aiQueueFailed = true;
            }
        } else {
            app(AiPipelineResultWriter::class)->markAiProcessingSkipped((int) $researchFile->id);
        }

        return ApiResponse::success(
            match (true) {
                $aiQueueFailed => 'Research file uploaded, but AI processing could not be queued. An administrator may retry it.',
                $aiEnabled => 'Research file uploaded and AI processing jobs queued.',
                default => 'Research file uploaded. AI-assisted processing is currently disabled.',
            },
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

        if ($highlight->files()->where('status', 'active')->whereNull('archived_at')->count() >= StoreReportHighlightFileRequest::MAX_FILES) {
            return ApiResponse::error(
                'A highlight may have at most '.StoreReportHighlightFileRequest::MAX_FILES.' supporting files.',
                ['file' => ['Remove a supporting file before uploading another.']],
                422,
            );
        }

        $uploadedFile = $request->file('file');
        $checksum = hash_file('sha256', $uploadedFile->getRealPath());

        if ($highlight->files()
            ->where('status', 'active')
            ->whereNull('archived_at')
            ->where('checksum', $checksum)
            ->exists()) {
            return ApiResponse::error(
                'This supporting file has already been uploaded.',
                ['file' => ['This supporting file has already been uploaded.']],
                422,
            );
        }

        $extension = mb_strtolower($uploadedFile->getClientOriginalExtension());
        $storedName = (string) Str::uuid().'.'.$extension;
        $quarantineDisk = (string) config('rikms.uploads.quarantine_disk', 'upload_quarantine');
        $storageDisk = (string) config('rikms.uploads.storage_disk', 'private_uploads');
        $quarantinePath = $uploadedFile->storeAs('research/quarantine', $storedName, $quarantineDisk);

        if (! is_string($quarantinePath) || $quarantinePath === '') {
            return ApiResponse::error('The supporting file could not be staged safely.', [], 500);
        }

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
            $researchFile = $this->researchUploadCommitter->commitSupporting(
                $request,
                (int) $research->id,
                (int) $highlight->id,
                StoreReportHighlightFileRequest::MAX_FILES,
                [
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
                ],
            );
        } catch (UploadConstraintException $exception) {
            Storage::disk($storageDisk)->delete($path);

            return $this->uploadConstraintResponse($exception);
        } catch (QueryException $exception) {
            Storage::disk($storageDisk)->delete($path);

            if ($this->isDeadlock($exception)) {
                return $this->databaseConflictResponse('The supporting upload conflicted with another agency upload. Try again.');
            }

            throw $exception;
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
            ArchiveRecord::create([
                'archivable_type' => $file->getMorphClass(),
                'archivable_id' => $file->id,
                'archived_by' => $request->user()->id,
                'reason' => 'Removed by agency administrator.',
                'metadata' => ['previous_status' => $file->status, 'scope' => 'agency'],
                'archived_at' => now(),
            ]);
            $file->update([
                'status' => 'archived',
                'archived_at' => now(),
                'archived_by' => $request->user()->id,
                'archive_reason' => 'Removed by agency administrator.',
            ]);

            AuditLogger::record(
                $request,
                'research_file.archived',
                $file,
                $oldValues,
                $file->fresh()?->only(['status', 'path', 'archived_at']),
            );
        });

        return ApiResponse::success('Research file moved to the archive.');
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

    /** @param array<int, array{disk: string, path: string}> $copiedObjects */
    private function copyReportDataToRevision(Research $source, Research $revision, array &$copiedObjects): void
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

            $highlight->files->each(function (ResearchFile $file) use ($revision, $revisionHighlight, &$copiedObjects): void {
                $copy = $this->researchFileStorage->copyForRevision($file, (int) $revision->id, (int) $revisionHighlight->id);
                $copiedObjects[] = ['disk' => $file->disk, 'path' => $copy['path']];

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
                    'stored_name' => $copy['stored_name'],
                    'path' => $copy['path'],
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

    private function uploadConstraintResponse(UploadConstraintException $exception): JsonResponse
    {
        return ApiResponse::error(
            $exception->getMessage(),
            [$exception->field => [$exception->getMessage()]],
            $exception->statusCode,
        );
    }

    private function databaseConflictResponse(string $message): JsonResponse
    {
        return ApiResponse::error($message, [
            'conflict' => [$message],
        ], 409);
    }

    private function isConstraintViolation(QueryException $exception, string $constraint): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $message = mb_strtolower($exception->getMessage());

        return in_array($sqlState, ['23000', '23505', '19'], true)
            && (
                str_contains($message, mb_strtolower($constraint))
                || str_contains($message, 'active_revision_parent_id')
            );
    }

    private function isDeadlock(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $driverCode = (int) ($exception->errorInfo[1] ?? 0);

        return in_array($sqlState, ['40001', '40P01'], true)
            || in_array($driverCode, [1205, 1213], true);
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
