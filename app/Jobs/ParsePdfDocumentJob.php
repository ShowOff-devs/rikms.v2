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
        $temporaryPath = null;
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
                $fileExists = $storage->exists($file->path);

                if (! $fileExists) {
                    throw new \RuntimeException('The stored research file was not found.');
                }

                $absolutePath = $this->extractionPath($file, $temporaryPath);
                $fileSize = $fileExists ? $this->fileSize($file->disk, $file->path, $absolutePath) : null;

                Log::debug('Starting PDF text extraction.', [
                    'research_id' => $this->researchId,
                    'file_id' => $this->fileId,
                    'disk' => $disk,
                    'path' => $storedPath,
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
            } finally {
                if (is_string($temporaryPath) && is_file($temporaryPath)) {
                    @unlink($temporaryPath);
                }
            }
        }

        Log::debug('Finished PDF text extraction.', [
            'research_id' => $this->researchId,
            'file_id' => $this->fileId,
            'disk' => $disk,
            'path' => $storedPath,
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

    private function extractionPath(ResearchFile $file, ?string &$temporaryPath): string
    {
        $configuration = config("filesystems.disks.{$file->disk}", []);
        $storage = Storage::disk($file->disk);

        if (($configuration['driver'] ?? null) === 'local') {
            return $storage->path($file->path);
        }

        $source = $storage->readStream($file->path);

        if (! is_resource($source)) {
            throw new \RuntimeException('The stored research file could not be opened.');
        }

        $temporaryPath = tempnam(sys_get_temp_dir(), 'rikms-pdf-');

        if (! is_string($temporaryPath) || $temporaryPath === '') {
            fclose($source);

            throw new \RuntimeException('A temporary PDF workspace could not be created.');
        }

        $destination = @fopen($temporaryPath, 'wb');

        if (! is_resource($destination)) {
            fclose($source);
            @unlink($temporaryPath);

            throw new \RuntimeException('The temporary PDF workspace could not be opened.');
        }

        try {
            if (stream_copy_to_stream($source, $destination) === false) {
                throw new \RuntimeException('The stored research file could not be materialized for processing.');
            }
        } finally {
            fclose($source);
            fclose($destination);
        }

        return $temporaryPath;
    }
}
