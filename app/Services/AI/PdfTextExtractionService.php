<?php

namespace App\Services\AI;

use Smalot\PdfParser\Parser;
use Throwable;

class PdfTextExtractionService
{
    /**
     * @return array{success: bool, text: string, method: string, error: ?string, page_count: ?int}
     */
    public function extract(string $path): array
    {
        $method = 'smalot/pdfparser';

        try {
            if (! is_file($path) || ! is_readable($path)) {
                return $this->failed($method, 'PDF file is missing or unreadable.');
            }

            $pdf = (new Parser)->parseFile($path);
            $text = $this->normalizeWhitespace($pdf->getText() ?? '');

            if ($text === '') {
                return $this->failed($method, 'No extractable text was found. The PDF may be scanned or image-only.');
            }

            return [
                'success' => true,
                'text' => $text,
                'method' => $method,
                'error' => null,
                'page_count' => count($pdf->getPages()),
            ];
        } catch (Throwable $exception) {
            return $this->failed($method, $exception->getMessage());
        }
    }

    private function normalizeWhitespace(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[ \t\f\v\x{00A0}]+/u', ' ', $text) ?? $text;
        $text = preg_replace("/\n[ \t]+/u", "\n", $text) ?? $text;
        $text = preg_replace("/\n{3,}/u", "\n\n", $text) ?? $text;

        return trim($text);
    }

    /**
     * @return array{success: false, text: string, method: string, error: string, page_count: null}
     */
    private function failed(string $method, string $error): array
    {
        return [
            'success' => false,
            'text' => '',
            'method' => $method,
            'error' => $error,
            'page_count' => null,
        ];
    }
}
