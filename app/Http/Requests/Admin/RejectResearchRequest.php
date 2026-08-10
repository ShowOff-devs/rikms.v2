<?php

namespace App\Http\Requests\Admin;

use App\Models\Research;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RejectResearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $research = $this->route('research');

        return $research instanceof Research
            && $this->user()?->can('moderate', $research) === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'notes' => ['required', 'string', 'min:10', 'max:2000'],
            'issue_type' => ['required', 'string', Rule::in([
                'incomplete_metadata',
                'metadata_inconsistency',
                'document_file_issue',
                'possible_duplicate',
                'authorship_attribution_concern',
                'privacy_restricted_data_concern',
                'policy_noncompliance',
                'other_manual_review',
            ])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $notes = trim((string) $this->input('notes'));

            if ($this->input('issue_type') === 'policy_noncompliance' && mb_strlen($notes) < 20) {
                $validator->errors()->add(
                    'notes',
                    'Identify the applicable policy provision or provide a specific policy noncompliance explanation.',
                );
            }

            if ($this->input('issue_type') === 'incomplete_metadata' && mb_strlen($notes) < 20) {
                $validator->errors()->add(
                    'notes',
                    'List the missing or invalid metadata fields in the revision instructions.',
                );
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $issueType = $this->input('issue_type');

        if (! is_string($issueType) || trim($issueType) === '') {
            $this->merge(['issue_type' => 'other_manual_review']);

            return;
        }

        $normalized = str_replace('-', '_', mb_strtolower(trim($issueType)));

        $this->merge([
            'issue_type' => match ($normalized) {
                'duplicate_research' => 'possible_duplicate',
                'incomplete_metadata', 'missing_abstract', 'missing_keywords', 'missing_authors' => 'incomplete_metadata',
                'policy_violation' => 'policy_noncompliance',
                'revision_required', 'other_concern', 'routine_review' => 'other_manual_review',
                default => $normalized,
            },
        ]);
    }
}
