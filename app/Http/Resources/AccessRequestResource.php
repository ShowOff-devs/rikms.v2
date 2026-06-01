<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccessRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'research_id' => $this->research_id,
            'agency_id' => $this->agency_id,
            'requester_name' => $this->requester_name,
            'requester_email' => $this->requester_email,
            'requester_affiliation' => $this->requester_affiliation,
            'purpose' => $this->purpose,
            'message' => $this->message,
            'intended_use' => $this->intended_use,
            'status' => $this->status,
            'requested_at' => $this->requested_at?->toISOString(),
            'review_notes' => $this->review_notes,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'research' => new ResearchResource($this->whenLoaded('research')),
            'requester' => new UserResource($this->whenLoaded('requester')),
            'reviewer' => new UserResource($this->whenLoaded('reviewer')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
