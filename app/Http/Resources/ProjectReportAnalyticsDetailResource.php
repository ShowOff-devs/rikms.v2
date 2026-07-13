<?php

namespace App\Http\Resources;

use App\Services\Analytics\ReportAnalyticsAssembler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectReportAnalyticsDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $analytics = app(ReportAnalyticsAssembler::class)->assemble($this->resource);
        $detail = $this->resource->reportDetail;

        return [
            'research_id' => $this->resource->id,
            'title' => $this->resource->title,
            'report_type' => $analytics['report_type'],
            'agency' => $this->whenLoaded('agency', fn (): array => [
                'id' => $this->resource->agency?->id,
                'name' => $this->resource->agency?->name,
                'short_name' => $this->resource->agency?->short_name,
            ]),
            'publication_year' => $this->resource->publication_year,
            'reporting_period' => $detail?->reporting_period,
            'workflow_status' => $this->resource->status,
            'submitted_at' => $this->resource->submitted_at?->toISOString(),
            'approved_at' => $this->resource->approved_at?->toISOString(),
            'project_start_date' => $detail?->project_start_date?->toDateString(),
            'project_end_date' => $detail?->project_end_date?->toDateString(),
            'financial_as_of_date' => $detail?->financial_as_of_date?->toDateString(),
            'completeness' => $analytics['completeness'],
            'budget' => $analytics['budget'],
            'accomplishment' => $analytics['accomplishment'],
            'performance_items' => $this->resource->performanceItems
                ->map(fn ($item): array => [
                    'id' => $item->id,
                    'project_name' => $item->project_name,
                    'target_value' => $item->target_value,
                    'actual_value' => $item->actual_value,
                    'accomplishment_percentage' => $item->accomplishment_percentage,
                    'project_status' => $item->project_status,
                    'remarks' => $item->remarks,
                    'sort_order' => (int) $item->sort_order,
                ])
                ->values(),
            'can_edit' => $request->user()?->can('updateAgencyDraft', $this->resource) === true,
        ];
    }
}
