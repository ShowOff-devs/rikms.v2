<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgencyResearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('createAgencyDraft', Research::class) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'abstract' => ['nullable', 'string', 'max:10000'],
            'authors' => ['nullable', 'array', 'max:25'],
            'authors.*' => ['string', 'max:255'],
            'keywords' => ['nullable', 'array', 'max:25'],
            'keywords.*' => ['string', 'max:100'],
            'category' => ['nullable', 'string', 'max:120'],
            'sdg_tags' => ['nullable', 'array', 'max:17'],
            'sdg_tags.*' => ['string', 'max:50'],
            'sdgs' => ['nullable', 'array', 'max:17'],
            'sdgs.*' => ['string', 'max:50'],
            'publication_year' => ['nullable', 'integer', 'between:1900,'.((int) now()->addYear()->format('Y'))],
            'access_level' => ['nullable', Rule::in(['public', 'restricted', 'private', 'embargoed', 'request_required'])],
            'embargo_until' => ['nullable', 'date', 'after:today'],
            'external_url' => ['nullable', 'url', 'max:255'],
        ];
    }
}
