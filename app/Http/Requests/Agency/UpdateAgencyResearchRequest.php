<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAgencyResearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $research = $this->route('research');

        return $research instanceof Research
            && $this->user()?->can('updateAgencyDraft', $research) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'abstract' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'authors' => ['sometimes', 'nullable', 'array', 'max:25'],
            'authors.*' => ['string', 'max:255'],
            'keywords' => ['sometimes', 'nullable', 'array', 'max:25'],
            'keywords.*' => ['string', 'max:100'],
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'sdg_tags' => ['sometimes', 'nullable', 'array', 'max:17'],
            'sdg_tags.*' => ['string', 'max:50'],
            'sdgs' => ['sometimes', 'nullable', 'array', 'max:17'],
            'sdgs.*' => ['string', 'max:50'],
            'publication_year' => ['sometimes', 'nullable', 'integer', 'between:1900,'.((int) now()->addYear()->format('Y'))],
            'access_level' => ['sometimes', 'nullable', Rule::in(['public', 'restricted', 'private', 'embargoed', 'request_required'])],
            'embargo_until' => ['sometimes', 'nullable', 'date', 'after:today'],
            'external_url' => ['sometimes', 'nullable', 'url', 'max:255'],
        ];
    }
}
