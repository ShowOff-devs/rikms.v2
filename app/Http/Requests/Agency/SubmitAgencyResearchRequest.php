<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use Illuminate\Foundation\Http\FormRequest;

class SubmitAgencyResearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $research = $this->route('research');

        return $research instanceof Research
            && $this->user()?->can('submit', $research) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
