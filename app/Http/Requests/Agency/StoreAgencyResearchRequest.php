<?php

namespace App\Http\Requests\Agency;

use App\Models\Research;
use App\Support\PublicMetadata;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAgencyResearchRequest extends FormRequest
{
    private const LONG_TEXT_MAX = 50000;

    private const PERFORMANCE_ITEMS_MAX = 100;

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
            'abstract' => ['nullable', 'string', 'max:'.self::LONG_TEXT_MAX],
            'authors' => ['nullable', 'array', 'max:25'],
            'authors.*' => ['string', 'max:255'],
            'keywords' => ['nullable', 'array', 'max:25'],
            'keywords.*' => ['string', 'max:100'],
            'public_metadata_fields' => ['nullable', 'array', 'max:14'],
            'public_metadata_fields.*' => ['string', Rule::in(PublicMetadata::acceptedKeys())],
            'public_metadata' => ['nullable', 'array', 'max:14'],
            'public_metadata.*.key' => ['required_with:public_metadata', 'string', Rule::in(PublicMetadata::acceptedKeys())],
            'public_metadata.*.label' => ['required_with:public_metadata', 'string', 'max:120'],
            'public_metadata.*.value' => ['nullable', 'string', 'max:'.self::LONG_TEXT_MAX],
            'category' => ['nullable', 'string', 'max:120'],
            'sdg_tags' => ['nullable', 'array', 'max:17'],
            'sdg_tags.*' => ['string', 'max:50'],
            'sdgs' => ['nullable', 'array', 'max:17'],
            'sdgs.*' => ['string', 'max:50'],
            'publication_year' => ['nullable', 'integer', 'between:1900,'.((int) now()->addYear()->format('Y'))],
            'access_level' => ['nullable', Rule::in(['public', 'restricted', 'private', 'embargoed', 'request_required'])],
            'embargo_until' => ['nullable', 'date', 'after:today'],
            'external_url' => ['nullable', 'url', 'max:255'],
            'report_details' => ['sometimes', 'array'],
            'report_details.reporting_period' => ['nullable', Rule::in(['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'])],
            'report_details.project_start_date' => ['nullable', 'date'],
            'report_details.project_end_date' => ['nullable', 'date'],
            'report_details.allotted_budget' => ['nullable', 'numeric', 'min:0'],
            'report_details.released_amount' => ['nullable', 'numeric', 'min:0'],
            'report_details.obligated_amount' => ['nullable', 'numeric', 'min:0'],
            'report_details.utilized_amount' => ['nullable', 'numeric', 'min:0'],
            'report_details.physical_accomplishment_percent' => ['nullable', 'numeric', 'between:0,100'],
            'report_details.financial_as_of_date' => ['nullable', 'date'],
            'performance_items' => ['sometimes', 'array', 'max:'.self::PERFORMANCE_ITEMS_MAX],
            'performance_items.*.project_name' => ['nullable', 'string', 'max:255'],
            'performance_items.*.target_value' => ['nullable', 'string', 'max:120'],
            'performance_items.*.actual_value' => ['nullable', 'string', 'max:120'],
            'performance_items.*.accomplishment_percentage' => ['nullable', 'numeric', 'between:0,100'],
            'performance_items.*.project_status' => ['nullable', 'string', 'max:80'],
            'performance_items.*.remarks' => ['nullable', 'string', 'max:5000'],
            'performance_items.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $startDate = $this->safeDateTimestamp($this->input('report_details.project_start_date'));
            $endDate = $this->safeDateTimestamp($this->input('report_details.project_end_date'));

            if ($startDate !== null && $endDate !== null && $endDate < $startDate) {
                $validator->errors()->add('report_details.project_end_date', 'Project end date must not precede project start date.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $this->merge($this->normalizeReportPayload($this->all()));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeReportPayload(array $payload): array
    {
        if (isset($payload['report_details']) && is_array($payload['report_details'])) {
            foreach ([
                'reporting_period',
                'project_start_date',
                'project_end_date',
                'allotted_budget',
                'released_amount',
                'obligated_amount',
                'utilized_amount',
                'physical_accomplishment_percent',
                'financial_as_of_date',
            ] as $key) {
                if (array_key_exists($key, $payload['report_details'])) {
                    $payload['report_details'][$key] = $this->emptyStringToNull($payload['report_details'][$key]);
                }
            }
        }

        if (isset($payload['performance_items']) && is_array($payload['performance_items'])) {
            $payload['performance_items'] = array_map(function (mixed $item): mixed {
                if (! is_array($item)) {
                    return $item;
                }

                foreach ([
                    'project_name',
                    'target_value',
                    'actual_value',
                    'accomplishment_percentage',
                    'project_status',
                    'remarks',
                ] as $key) {
                    $item[$key] = $this->emptyStringToNull($item[$key] ?? null);
                }

                return $item;
            }, $payload['performance_items']);
        }

        return $payload;
    }

    private function emptyStringToNull(mixed $value): mixed
    {
        return is_string($value) && trim($value) === '' ? null : $value;
    }

    private function safeDateTimestamp(mixed $value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $timestamp = strtotime($value);

        return $timestamp === false ? null : $timestamp;
    }
}
