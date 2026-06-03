<?php

namespace App\Jobs;

use App\Models\ResearchFile;
use App\Services\AI\PdfTextExtractionService;
use App\Services\AiPipelineResultWriter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ParsePdfDocumentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $researchId,
        public int $fileId,
        public ?int $agencyId,
        public ?int $uploadedByUserId,
    ) {}

    public function handle(AiPipelineResultWriter $writer, ?PdfTextExtractionService $extractor = null): void
    {
        $extractor ??= app(PdfTextExtractionService::class);
        $file = ResearchFile::query()->find($this->fileId);

        if (! $file) {
            $result = [
                'success' => false,
                'text' => '',
                'method' => 'smalot/pdfparser',
                'error' => 'Research file record was not found.',
                'page_count' => null,
            ];
        } else {
            $path = Storage::disk($file->disk)->path($file->path);
            $result = $extractor->extract($path);
        }

        if (! ($result['success'] ?? false)) {
            Log::warning('PDF text extraction failed.', [
                'research_id' => $this->researchId,
                'file_id' => $this->fileId,
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
}
