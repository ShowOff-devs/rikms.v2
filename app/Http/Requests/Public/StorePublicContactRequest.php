<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePublicContactRequest extends FormRequest
{
    public const CONCERN_TYPES = [
        'general_inquiry',
        'research_discovery',
        'access_request_concern',
        'metadata_correction',
        'technical_issue',
        'privacy_concern',
        'other',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'concern_type' => ['required', Rule::in(self::CONCERN_TYPES)],
            'research_reference' => ['nullable', 'string', 'max:500'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'website' => ['nullable', 'max:0'],
            'captcha_token' => ['nullable', 'string', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'website.max' => 'The submitted inquiry could not be verified.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->filled('website')) {
                    logger()->notice('Public contact bot protection rejected a submission.', [
                        'reason' => 'honeypot_triggered',
                        'route' => $this->path(),
                        'ip_hash' => hash('sha256', (string) $this->ip()),
                    ]);
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->trimString($this->input('name')),
            'email' => mb_strtolower($this->trimString($this->input('email'))),
            'organization' => $this->emptyStringToNull($this->input('organization')),
            'concern_type' => $this->trimString($this->input('concern_type')),
            'research_reference' => $this->emptyStringToNull($this->input('research_reference')),
            'subject' => $this->trimString($this->input('subject')),
            'message' => $this->trimString($this->input('message')),
            'website' => $this->trimString($this->input('website')),
            'captcha_token' => $this->emptyStringToNull($this->input('captcha_token')),
        ]);
    }

    private function trimString(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }

    private function emptyStringToNull(mixed $value): ?string
    {
        $trimmed = $this->trimString($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
