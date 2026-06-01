<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

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
            'requester_name' => ['required', 'string', 'max:255'],
            'requester_email' => ['required', 'email', 'max:255'],
            'requester_affiliation' => ['nullable', 'string', 'max:255'],
            'requester_purpose' => ['required', 'string', 'max:1000'],
            'message' => ['nullable', 'string', 'max:2000'],
            'intended_use' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
