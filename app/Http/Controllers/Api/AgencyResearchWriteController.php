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
use App\Models\Research;
use App\Models\ResearchFile;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AgencyResearchWriteController extends Controller
{
    public function store(StoreAgencyResearchRequest $request): JsonResponse
    {
        $user = $request->user();

        $research = DB::transaction(function () use ($request, $user): Research {
            $research = Research::create(array_merge(
                $this->researchPayload($request->validated()),
                [
                    'slug' => $this->uniqueSlug($request->string('title')->toString()),
                    'agency_id' => $user->agency_id,
                    'uploaded_by' => $user->id,
                    'status' => Statuses::RESEARCH_DRAFT,
                    'access_level' => $request->validated('access_level', 'request_required'),
                ],
            ));

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

        return ApiResponse::success(
            'Agency research draft created.',
            (new ResearchResource($research->load(['agency', 'uploader'])))->resolve($request),
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
            'access_level',
            'embargo_until',
            'external_url',
        ]);

        DB::transaction(function () use ($request, $research, $oldValues): void {
            $research->update($this->researchPayload($request->validated()));

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
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
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
            (new ResearchResource($research->refresh()->load(['agency', 'uploader'])))->resolve($request),
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
        $storedName = (string) Str::uuid().'.'.$uploadedFile->getClientOriginalExtension();
        // TODO Phase 9: Move production uploads through quarantine/scanning storage before final private storage.
        $path = $uploadedFile->storeAs('research/'.$research->id, $storedName, 'local');

        $researchFile = DB::transaction(function () use ($request, $research, $uploadedFile, $checksum, $storedName, $path): ResearchFile {
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
                    'ai_processing' => 'queued',
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

        Bus::chain([
            new ParsePdfDocumentJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
            new ExtractResearchMetadataJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
            new ClassifyResearchSdgJob($research->id, $researchFile->id, $research->agency_id, $request->user()->id),
        ])->dispatch();

        return ApiResponse::success(
            'Research file uploaded and AI processing jobs queued.',
            (new ResearchFileResource($researchFile->load(['research', 'uploader'])))->resolve($request),
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

        return collect($validated)->only([
            'title',
            'abstract',
            'authors',
            'publication_year',
            'category',
            'sdgs',
            'keywords',
            'access_level',
            'embargo_until',
            'external_url',
        ])->all();
    }

    private function uniqueSlug(string $title): string
    {
        $baseSlug = Str::slug($title) ?: 'research';
        $slug = $baseSlug;
        $suffix = 1;

        while (Research::query()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$suffix++;
        }

        return $slug;
    }
}
