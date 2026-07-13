<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePublicAccessRequestRequest extends FormRequest
{
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
            'requester_name' => ['required', 'string', 'max:150'],
            'requester_email' => ['required', 'email:rfc', 'max:254'],
            'requester_affiliation' => ['nullable', 'string', 'max:255'],
            'requester_purpose' => ['required', 'string', 'min:20', 'max:2000'],
            'message' => ['nullable', 'string', 'max:2000'],
            'intended_use' => ['nullable', 'string', 'max:1000'],
            'website' => ['nullable', 'max:0'],
            'captcha_token' => ['nullable', 'string', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'website.max' => 'The submitted access request could not be verified.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->filled('website')) {
                    logger()->notice('Public access request bot protection rejected a submission.', [
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
            'requester_name' => $this->trimString($this->input('requester_name')),
            'requester_email' => mb_strtolower($this->trimString($this->input('requester_email'))),
            'requester_affiliation' => $this->emptyStringToNull($this->input('requester_affiliation')),
            'requester_purpose' => $this->trimString($this->input('requester_purpose')),
            'message' => $this->emptyStringToNull($this->input('message')),
            'intended_use' => $this->emptyStringToNull($this->input('intended_use')),
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
