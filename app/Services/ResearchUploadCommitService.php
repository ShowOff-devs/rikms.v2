<?php

namespace App\Services;

use App\Exceptions\UploadConstraintException;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\ResearchReportHighlight;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResearchUploadCommitService
{
    public function __construct(
        private readonly UploadQuotaService $quota,
        private readonly UploadAuditWriter $auditWriter,
    ) {}

    /** @param array<string, mixed> $attributes */
    public function commitMain(Request $request, int $researchId, array $attributes): ResearchFile
    {
        return DB::transaction(function () use ($request, $researchId, $attributes): ResearchFile {
            [$research, $user] = $this->lockScope($request, $researchId, 'uploadFile');
            $checksum = (string) ($attributes['checksum'] ?? '');

            if ($this->activeFiles($research)->where('checksum', $checksum)->exists()) {
                throw new UploadConstraintException('This PDF has already been uploaded for this research record.');
            }

            $this->assertQuota((int) $research->agency_id, (int) ($attributes['size_bytes'] ?? 0));

            return $this->createFile($request, $research, $user, $attributes, 'research_file.uploaded');
        });
    }

    /** @param array<string, mixed> $attributes */
    public function commitSupporting(
        Request $request,
        int $researchId,
        int $highlightId,
        int $maximumFiles,
        array $attributes,
    ): ResearchFile {
        return DB::transaction(function () use ($request, $researchId, $highlightId, $maximumFiles, $attributes): ResearchFile {
            [$research, $user] = $this->lockScope($request, $researchId, 'updateAgencyDraft');
            $highlight = ResearchReportHighlight::query()
                ->whereKey($highlightId)
                ->where('research_id', $research->id)
                ->lockForUpdate()
                ->first();

            if (! $highlight) {
                throw new UploadConstraintException('The highlight does not belong to this report.', 'file', 404);
            }

            $activeFiles = $this->activeFiles($research)
                ->where('report_highlight_id', $highlight->id);

            if ((clone $activeFiles)->count() >= $maximumFiles) {
                throw new UploadConstraintException(
                    "A highlight may have at most {$maximumFiles} supporting files.",
                );
            }

            if ((clone $activeFiles)->where('checksum', (string) ($attributes['checksum'] ?? ''))->exists()) {
                throw new UploadConstraintException('This supporting file has already been uploaded.');
            }

            $this->assertQuota((int) $research->agency_id, (int) ($attributes['size_bytes'] ?? 0));

            return $this->createFile(
                $request,
                $research,
                $user,
                array_merge($attributes, ['report_highlight_id' => $highlight->id]),
                'report_highlight_file.uploaded',
            );
        });
    }

    /** @return array{Research, User} */
    private function lockScope(Request $request, int $researchId, string $ability): array
    {
        $user = $request->user();

        if (! $user instanceof User || $user->agency_id === null || ! $user->isActive()) {
            throw new AuthorizationException;
        }

        Agency::query()->whereKey($user->agency_id)->lockForUpdate()->firstOrFail();

        $research = Research::query()
            ->whereKey($researchId)
            ->where('agency_id', $user->agency_id)
            ->lockForUpdate()
            ->first();

        if (! $research || ! $user->can($ability, $research)) {
            throw new AuthorizationException;
        }

        return [$research, $user];
    }

    private function activeFiles(Research $research)
    {
        return ResearchFile::query()
            ->where('research_id', $research->id)
            ->where('agency_id', $research->agency_id)
            ->where('status', 'active')
            ->whereNull('archived_at');
    }

    private function assertQuota(int $agencyId, int $additionalBytes): void
    {
        if (! $this->quota->canStore($agencyId, $additionalBytes)) {
            throw new UploadConstraintException($this->quota->message());
        }
    }

    /** @param array<string, mixed> $attributes */
    private function createFile(
        Request $request,
        Research $research,
        User $user,
        array $attributes,
        string $auditEvent,
    ): ResearchFile {
        $file = ResearchFile::create(array_merge($attributes, [
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'uploaded_by' => $user->id,
        ]));

        $this->auditWriter->record($request, $auditEvent, $file, null, $file->only([
            'id',
            'research_id',
            'report_highlight_id',
            'agency_id',
            'uploaded_by',
            'original_name',
            'mime_type',
            'size_bytes',
            'checksum',
            'status',
        ]));

        return $file;
    }
}
