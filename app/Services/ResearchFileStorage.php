<?php

namespace App\Services;

use App\Models\ResearchFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ResearchFileStorage
{
    public function exists(ResearchFile $file): bool
    {
        try {
            return Storage::disk($file->disk)->exists($file->path);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Delete the physical object only when no other metadata record references it.
     */
    public function deleteIfUnreferenced(ResearchFile $file): bool
    {
        $shared = ResearchFile::withTrashed()
            ->whereKeyNot($file->getKey())
            ->where('disk', $file->disk)
            ->where('path', $file->path)
            ->exists();

        if ($shared) {
            return true;
        }

        try {
            $disk = Storage::disk($file->disk);

            return ! $disk->exists($file->path) || $disk->delete($file->path);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array{stored_name: string, path: string}
     */
    public function copyForRevision(ResearchFile $source, int $researchId, int $highlightId): array
    {
        $extension = trim((string) ($source->extension ?: pathinfo($source->stored_name, PATHINFO_EXTENSION)));
        $storedName = (string) Str::uuid().($extension !== '' ? '.'.mb_strtolower($extension) : '');
        $path = "research/{$researchId}/highlights/{$highlightId}/{$storedName}";
        $disk = Storage::disk($source->disk);

        if (! $disk->exists($source->path)) {
            throw new RuntimeException('A supporting file required by this revision is missing from storage.');
        }

        if (! $disk->copy($source->path, $path)) {
            throw new RuntimeException('A supporting file could not be copied for the new revision.');
        }

        return [
            'stored_name' => $storedName,
            'path' => $path,
        ];
    }

    /** @param array<int, array{disk: string, path: string}> $objects */
    public function cleanup(array $objects): void
    {
        foreach ($objects as $object) {
            try {
                Storage::disk($object['disk'])->delete($object['path']);
            } catch (Throwable) {
                // Reconciliation reports any object that cannot be cleaned immediately.
            }
        }
    }
}
