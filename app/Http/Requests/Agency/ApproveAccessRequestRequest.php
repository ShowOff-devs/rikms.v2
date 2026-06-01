<?php

namespace App\Http\Requests\Agency;

use App\Models\AccessRequest;
use Illuminate\Foundation\Http\FormRequest;

class ApproveAccessRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $accessRequest = $this->route('accessRequest');

        return $accessRequest instanceof AccessRequest
            && $this->user()?->can('decide', $accessRequest->loadMissing('research')) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'decision_notes' => ['nullable', 'string', 'max:2000'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ];
    }
}
