<?php

namespace App\Services;

use App\Models\ResearchFile;

class UploadQuotaService
{
    public function quotaBytes(): int
    {
        return max(1, (int) config('rikms.uploads.agency_quota_mb', 10240)) * 1024 * 1024;
    }

    public function usedBytes(int $agencyId): int
    {
        return ResearchFile::withTrashed()
            ->where('agency_id', $agencyId)
            ->whereNotIn('status', ['deleted', 'missing'])
            ->get(['disk', 'path', 'size_bytes'])
            ->unique(fn (ResearchFile $file): string => $file->disk.'|'.$file->path)
            ->sum(fn (ResearchFile $file): int => max(0, (int) $file->size_bytes));
    }

    public function canStore(int $agencyId, int $additionalBytes): bool
    {
        return $this->usedBytes($agencyId) + max(0, $additionalBytes) <= $this->quotaBytes();
    }

    public function message(): string
    {
        $quotaMb = (int) floor($this->quotaBytes() / 1024 / 1024);

        return "This upload would exceed the agency storage quota of {$quotaMb} MB.";
    }
}
