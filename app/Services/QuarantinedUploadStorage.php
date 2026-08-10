<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Throwable;

class QuarantinedUploadStorage
{
    public function cleanup(string $disk, string $path): bool
    {
        try {
            return ! Storage::disk($disk)->exists($path) || Storage::disk($disk)->delete($path);
        } catch (Throwable) {
            return false;
        }
    }

    public function promote(string $quarantineDisk, string $quarantinePath, string $storageDisk, string $path): bool
    {
        try {
            if ($quarantineDisk === $storageDisk) {
                return Storage::disk($quarantineDisk)->move($quarantinePath, $path);
            }

            $stream = Storage::disk($quarantineDisk)->readStream($quarantinePath);

            if (! is_resource($stream)) {
                return false;
            }

            try {
                $stored = Storage::disk($storageDisk)->writeStream($path, $stream);
            } finally {
                fclose($stream);
            }

            if (! $stored) {
                Storage::disk($storageDisk)->delete($path);

                return false;
            }

            if (! Storage::disk($quarantineDisk)->delete($quarantinePath)) {
                Storage::disk($storageDisk)->delete($path);

                return false;
            }

            return true;
        } catch (Throwable) {
            try {
                Storage::disk($storageDisk)->delete($path);
            } catch (Throwable) {
                // The caller records the sanitized promotion failure.
            }

            return false;
        }
    }
}
