<?php

namespace App\Http\Requests\Agency;

use App\Models\ResearchFile;
use Illuminate\Foundation\Http\FormRequest;

class DeleteResearchFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $researchFile = $this->route('file');

        return $researchFile instanceof ResearchFile
            && $this->user()?->can('delete', $researchFile) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
