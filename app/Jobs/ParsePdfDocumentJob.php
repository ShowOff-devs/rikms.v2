<?php

namespace App\Jobs;

use App\Models\ResearchFile;
use App\Services\AI\PdfTextExtractionService;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ParsePdfDocumentJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public int $tries = 1;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(AiPipelineResultWriter $writer, ?PdfTextExtractionService $extractor = null): void
    {
        if (! app(PlatformSettingsService::class)->aiProcessingEnabled()) {
            $writer->markAiProcessingSkipped($this->fileId);

            return;
        }

        $extractor ??= app(PdfTextExtractionService::class);
        $file = ResearchFile::query()->find($this->fileId);
        $disk = $file?->disk;
        $storedPath = $file?->path;
        $absolutePath = null;
        $fileExists = false;
        $fileSize = null;

        if (! $file) {
            $result = [
                'success' => false,
                'text' => '',
                'method' => 'smalot/pdfparser',
                'error' => 'Research file record was not found.',
                'page_count' => null,
            ];
        } else {
            try {
                $storage = Storage::disk($file->disk);
                $absolutePath = $storage->path($file->path);
                $fileExists = $storage->exists($file->path) || is_file($absolutePath);
                $fileSize = $fileExists ? $this->fileSize($file->disk, $file->path, $absolutePath) : null;

                Log::debug('Starting PDF text extraction.', [
                    'research_id' => $this->researchId,
                    'file_id' => $this->fileId,
                    'disk' => $disk,
                    'path' => $storedPath,
                    'absolute_path' => $absolutePath,
                    'file_exists' => $fileExists,
                    'file_size' => $fileSize,
                ]);

                $result = $extractor->extract($absolutePath);
            } catch (Throwable $exception) {
                $result = [
                    'success' => false,
                    'text' => '',
                    'method' => 'smalot/pdfparser',
                    'error' => $exception->getMessage(),
                    'page_count' => null,
                ];
            }
        }

        Log::debug('Finished PDF text extraction.', [
            'research_id' => $this->researchId,
            'file_id' => $this->fileId,
            'disk' => $disk,
            'path' => $storedPath,
            'absolute_path' => $absolutePath,
            'file_exists' => $fileExists,
            'file_size' => $fileSize,
            'extraction_success' => $result['success'] ?? false,
            'text_length' => strlen((string) ($result['text'] ?? '')),
            'extraction_error' => $result['error'] ?? null,
        ]);

        if (! ($result['success'] ?? false)) {
            Log::warning('PDF text extraction failed.', [
                'research_id' => $this->researchId,
                'file_id' => $this->fileId,
                'disk' => $disk,
                'path' => $storedPath,
                'absolute_path' => $absolutePath,
                'file_exists' => $fileExists,
                'file_size' => $fileSize,
                'error' => $result['error'] ?? 'Unknown PDF parsing error.',
            ]);
        }

        $writer->writePdfParsingResult(
            $this->researchId,
            $this->fileId,
            $this->agencyId,
            $this->uploadedByUserId,
            $result,
        );
    }

    private function fileSize(string $disk, string $path, string $absolutePath): ?int
    {
        try {
            $size = Storage::disk($disk)->size($path);

            if (is_numeric($size)) {
                return (int) $size;
            }
        } catch (Throwable) {
            // Fall back to the absolute path below.
        }

        $size = @filesize($absolutePath);

        return is_numeric($size) ? (int) $size : null;
    }
}
