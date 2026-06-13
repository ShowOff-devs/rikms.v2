<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SecurityEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'agency_id' => $this->agency_id,
            'event_type' => $this->event_type,
            'severity' => $this->severity,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'location' => $this->location,
            'metadata' => $this->metadata ?? [],
            'resolved_at' => $this->resolved_at?->toISOString(),
            'resolved_by' => $this->resolved_by,
            'acknowledged_at' => $this->acknowledged_at?->toISOString(),
            'acknowledged_by' => $this->acknowledged_by,
            'user' => new UserResource($this->whenLoaded('user')),
            'agency' => new AgencyResource($this->whenLoaded('agency')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
