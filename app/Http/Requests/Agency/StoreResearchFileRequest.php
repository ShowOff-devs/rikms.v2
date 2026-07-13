<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use App\Services\UploadLimitService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class StoreResearchFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $research = $this->route('research');

        return $research instanceof Research
            && $this->user()?->can('uploadFile', $research) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $uploadLimit = app(UploadLimitService::class);
        $maxKb = $uploadLimit->effectiveUploadLimitKb();

        return [
            // TODO Phase 9: Add production upload hardening: malware scan/quarantine, MIME sniffing beyond extension,
            // checksum verification, and audited rejection/failure events.
            'file' => [
                'required',
                'file',
                'min:1',
                'mimes:pdf',
                'mimetypes:application/pdf',
                "max:{$maxKb}",
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $value instanceof UploadedFile || ! $this->hasPdfEnvelope($value)) {
                        $fail('Upload a valid PDF document.');
                    }
                },
            ],
            'file_type' => ['nullable', 'string', 'max:80'],
            'visibility' => ['nullable', Rule::in(['private', 'agency', 'public'])],
            'access_level' => ['nullable', Rule::in(['public', 'restricted', 'private', 'embargoed'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $uploadLimit = app(UploadLimitService::class);

        return [
            'file.required' => 'Upload a PDF research document.',
            'file.min' => 'Upload a PDF file that is not empty.',
            'file.mimes' => 'Upload a PDF document.',
            'file.mimetypes' => 'Upload a valid PDF document.',
            'file.max' => $uploadLimit->message(),
            'file.uploaded' => $uploadLimit->uploadedMessage(),
        ];
    }

    private function hasPdfEnvelope(UploadedFile $file): bool
    {
        $path = $file->getRealPath();

        if (! is_string($path) || $path === '') {
            return false;
        }

        $signature = @file_get_contents($path, false, null, 0, 5);
        $handle = @fopen($path, 'rb');

        if ($signature !== '%PDF-' || $handle === false) {
            return false;
        }

        $size = max(0, (int) $file->getSize());
        $tailLength = min(4096, $size);

        if ($tailLength === 0 || fseek($handle, -$tailLength, SEEK_END) !== 0) {
            fclose($handle);

            return false;
        }

        $tail = fread($handle, $tailLength);
        fclose($handle);

        return is_string($tail) && str_contains($tail, '%%EOF');
    }
}
