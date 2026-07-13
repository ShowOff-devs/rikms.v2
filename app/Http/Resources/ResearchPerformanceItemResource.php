<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResearchPerformanceItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'research_id' => $this->research_id,
            'project_name' => $this->project_name,
            'target_value' => $this->target_value,
            'actual_value' => $this->actual_value,
            'accomplishment_percentage' => $this->accomplishment_percentage,
            'project_status' => $this->project_status,
            'remarks' => $this->remarks,
            'sort_order' => (int) $this->sort_order,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
