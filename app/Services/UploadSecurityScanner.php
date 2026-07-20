<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use RuntimeException;

class UploadSecurityScanner
{
    /**
     * @return array{clean: bool, engine: string, signatures: list<string>, scanned_at: string}
     */
    public function scanStoredFile(string $disk, string $path): array
    {
        $absolutePath = Storage::disk($disk)->path($path);

        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            throw new RuntimeException('Stored upload is not readable for security scanning.');
        }

        $signatures = $this->matchingSignatures($absolutePath);

        return [
            'clean' => $signatures === [],
            'engine' => 'built_in_pdf_guard',
            'signatures' => $signatures,
            'scanned_at' => now()->toISOString(),
        ];
    }

    /**
     * @return list<string>
     */
    private function matchingSignatures(string $absolutePath): array
    {
        $patterns = [
            'eicar-test-signature' => 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE',
            'embedded-php-code' => '<?php',
            'pdf-javascript-action' => '/JavaScript',
            'pdf-short-javascript-action' => '/JS',
            'pdf-launch-action' => '/Launch',
            'pdf-embedded-file' => '/EmbeddedFile',
        ];

        $handle = fopen($absolutePath, 'rb');

        if ($handle === false) {
            throw new RuntimeException('Unable to open stored upload for security scanning.');
        }

        $matches = [];
        $carry = '';
        $maxPatternLength = max(array_map('strlen', $patterns));

        try {
            while (! feof($handle)) {
                $chunk = fread($handle, 1024 * 1024);

                if ($chunk === false) {
                    throw new RuntimeException('Unable to read stored upload for security scanning.');
                }

                $window = $carry.$chunk;

                foreach ($patterns as $signature => $pattern) {
                    if (! in_array($signature, $matches, true) && str_contains($window, $pattern)) {
                        $matches[] = $signature;
                    }
                }

                $carry = substr($window, -($maxPatternLength - 1));
            }
        } finally {
            fclose($handle);
        }

        return $matches;
    }
}
