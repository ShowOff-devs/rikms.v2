<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use App\Models\ResearchReportHighlight;
use App\Services\UploadLimitService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class StoreReportHighlightFileRequest extends FormRequest
{
    public const MAX_FILES = 5;

    public const MAX_MB = 20;

    public function authorize(): bool
    {
        $research = $this->route('research');
        $highlight = $this->route('highlight');

        return $research instanceof Research
            && $highlight instanceof ResearchReportHighlight
            && (int) $highlight->research_id === (int) $research->id
            && $this->user()?->can('updateAgencyDraft', $research) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $platformMaxKb = app(UploadLimitService::class)->effectiveUploadLimitKb();
        $maxKb = min(self::MAX_MB * 1024, $platformMaxKb);

        return [
            'file' => [
                'required',
                'file',
                'mimes:pdf,png,jpg,jpeg',
                'mimetypes:application/pdf,image/png,image/jpeg',
                "max:{$maxKb}",
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $value instanceof UploadedFile || ! $this->hasAllowedEnvelope($value)) {
                        $fail('Upload a valid PDF, PNG, or JPEG supporting file.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxMb = min(
            self::MAX_MB,
            (int) floor(app(UploadLimitService::class)->effectiveUploadLimitKb() / 1024),
        );

        return [
            'file.required' => 'Choose a supporting file.',
            'file.mimes' => 'Supporting files must be PDF, PNG, or JPEG.',
            'file.mimetypes' => 'Supporting files must be a valid PDF, PNG, or JPEG.',
            'file.max' => "Supporting files may not exceed {$maxMb} MB.",
        ];
    }

    private function hasAllowedEnvelope(UploadedFile $file): bool
    {
        $path = $file->getRealPath();

        if (! is_string($path) || $path === '') {
            return false;
        }

        $mime = $file->getMimeType();
        $head = @file_get_contents($path, false, null, 0, 8);

        if ($mime === 'image/png') {
            return $head === "\x89PNG\r\n\x1a\n"
                && @getimagesize($path) !== false;
        }

        if ($mime === 'image/jpeg') {
            $tail = @file_get_contents($path, false, null, max(0, $file->getSize() - 2), 2);

            return is_string($head)
                && str_starts_with($head, "\xff\xd8\xff")
                && $tail === "\xff\xd9"
                && @getimagesize($path) !== false;
        }

        if ($mime !== 'application/pdf' || ! is_string($head) || ! str_starts_with($head, '%PDF-')) {
            return false;
        }

        $tail = @file_get_contents($path, false, null, max(0, $file->getSize() - 4096), 4096);

        return is_string($tail) && str_contains($tail, '%%EOF');
    }
}
