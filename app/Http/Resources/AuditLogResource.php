<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
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
            'event' => $this->event,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'metadata' => $this->metadata ?? [],
            'user' => new UserResource($this->whenLoaded('user')),
            'agency' => new AgencyResource($this->whenLoaded('agency')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
