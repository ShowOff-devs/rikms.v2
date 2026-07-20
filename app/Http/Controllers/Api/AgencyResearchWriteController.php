<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Agency\DeleteResearchFileRequest;
use App\Http\Requests\Agency\StoreAgencyResearchRequest;
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
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use App\Services\UploadSecurityScanner;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\PublicMetadata;
use App\Support\ResearchSlugger;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AgencyResearchWriteController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly UploadSecurityScanner $uploadSecurityScanner,
    ) {}

    public function store(StoreAgencyResearchRequest $request): JsonResponse
    {
        $user = $request->user();

        $research = DB::transaction(function () use ($request, $user): Research {
            $validated = $request->validated();
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

            $this->syncReportData($research, $validated);

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
        ]);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            $validated = $request->validated();
            $payload = $this->researchPayload($validated);

            if (! $research->slug && ! empty($payload['title'])) {
                $payload['slug'] = ResearchSlugger::generateUniqueResearchSlug((string) $payload['title'], (int) $research->id);
            }

            $research->update($payload);
            $this->syncReportData($research->refresh(), $validated);

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
        $quarantinePath = $uploadedFile->storeAs('research/quarantine', $storedName, 'local');
        $scan = $this->uploadSecurityScanner->scanStoredFile('local', $quarantinePath);

        if (! $scan['clean']) {
            Storage::disk('local')->delete($quarantinePath);

            AuditLogger::record($request, 'research_file.security_rejected', null, null, null, [
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'size_bytes' => $uploadedFile->getSize(),
                'checksum' => $checksum,
                'security_scan' => $scan,
            ]);

            return ApiResponse::error(
                'The uploaded PDF did not pass security screening.',
                ['file' => ['The uploaded PDF did not pass security screening.']],
                422,
            );
        }

        $path = 'research/'.$research->id.'/'.$storedName;

        if (! Storage::disk('local')->move($quarantinePath, $path)) {
            Storage::disk('local')->delete($quarantinePath);

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

        $researchFile = DB::transaction(function () use ($request, $research, $uploadedFile, $checksum, $storedName, $path, $scan, $aiEnabled): ResearchFile {
            $researchFile = ResearchFile::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'uploaded_by' => $request->user()->id,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'stored_name' => $storedName,
                'disk' => 'local',
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

        if ($file->archived_at !== null || $file->status === 'deleted') {
            return ApiResponse::error('This research file is not available for download.', [], 404);
        }

        if (! Storage::disk($file->disk)->exists($file->path)) {
            return ApiResponse::error('The stored research file could not be found.', [], 404);
        }

        return Storage::disk($file->disk)->download($file->path, $file->original_name);
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
        ])->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncReportData(Research $research, array $validated): void
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
                ])
                ->all();

            if ($detailPayload !== []) {
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

                $payload = collect($item)
                    ->only([
                        'project_name',
                        'target_value',
                        'actual_value',
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
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function isBlankPerformanceItem(array $item): bool
    {
        foreach ([
            'project_name',
            'target_value',
            'actual_value',
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
        $source->loadMissing(['reportDetail', 'performanceItems']);

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
            ]));
        }

        $source->performanceItems->each(function ($item) use ($revision): void {
            $revision->performanceItems()->create($item->only([
                'project_name',
                'target_value',
                'actual_value',
                'accomplishment_percentage',
                'project_status',
                'remarks',
                'sort_order',
            ]));
        });
    }

    private function loadResearchResponseRelations(Research $research): Research
    {
        return Research::query()
            ->with(['agency', 'uploader', 'reportDetail', 'performanceItems'])
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
