<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use Illuminate\Foundation\Http\FormRequest;
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
        return [
            // TODO Phase 9: Add production upload hardening: malware scan/quarantine, MIME sniffing beyond extension,
            // configurable size limits, checksum verification, and audited rejection/failure events.
            'file' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:20480'],
            'file_type' => ['nullable', 'string', 'max:80'],
            'visibility' => ['nullable', Rule::in(['private', 'agency', 'public'])],
            'access_level' => ['nullable', Rule::in(['public', 'restricted', 'private', 'embargoed'])],
        ];
    }
}
