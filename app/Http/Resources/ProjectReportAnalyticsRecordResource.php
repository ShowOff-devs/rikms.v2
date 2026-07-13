<?php

namespace App\Http\Resources;

use App\Services\Analytics\ReportAnalyticsAssembler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectReportAnalyticsRecordResource extends JsonResource
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
            'agency' => $this->whenLoaded('agency', fn (): array => [
                'id' => $this->resource->agency?->id,
                'name' => $this->resource->agency?->name,
                'short_name' => $this->resource->agency?->short_name,
            ]),
            'report_type' => $analytics['report_type'],
            'reporting_period' => $detail?->reporting_period,
            'publication_year' => $this->resource->publication_year,
            'workflow_status' => $this->resource->status,
            'submitted_at' => $this->resource->submitted_at?->toISOString(),
            'approved_at' => $this->resource->approved_at?->toISOString(),
            'completeness' => $analytics['completeness'],
            'budget' => $analytics['budget'],
            'accomplishment' => $analytics['accomplishment'],
        ];
    }
}
