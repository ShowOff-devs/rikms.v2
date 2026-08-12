<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResearchReportDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'research_id' => $this->research_id,
            'reporting_period' => $this->reporting_period,
            'project_start_date' => $this->project_start_date?->toDateString(),
            'project_end_date' => $this->project_end_date?->toDateString(),
            'allotted_budget' => $this->allotted_budget,
            'released_amount' => $this->released_amount,
            'obligated_amount' => $this->obligated_amount,
            'utilized_amount' => $this->utilized_amount,
            'physical_accomplishment_percent' => $this->physical_accomplishment_percent,
            'financial_as_of_date' => $this->financial_as_of_date?->toDateString(),
            'pap_categories' => $this->pap_categories ?? [],
            'pap_description' => $this->pap_description,
            'beneficiary_sectors' => $this->beneficiary_sectors ?? [],
            'performance_remarks' => $this->performance_remarks,
            'last_wizard_step' => $this->last_wizard_step,
            'draft_version' => (int) $this->draft_version,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
