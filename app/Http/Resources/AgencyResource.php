<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgencyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'short_name' => $this->short_name,
            'full_name' => $this->full_name,
            'type' => $this->type,
            'email' => $this->email,
            'contact_number' => $this->contact_number,
            'website' => $this->website,
            'address' => $this->address,
            'description' => $this->description,
            'logo_path' => $this->logo_path,
            'status' => $this->status,
            'total_research' => (int) ($this->research_count ?? 0),
            'agency_admins' => UserResource::collection($this->whenLoaded('users')),
            'archived_at' => $this->archived_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
