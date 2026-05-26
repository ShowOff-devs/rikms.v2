<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicAgencyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->short_name ?: $this->name,
            'fullName' => $this->full_name ?: $this->name,
            'description' => $this->description ?: '',
            'type' => $this->type,
            'publications' => (int) ($this->research_count ?? 0),
            'website' => $this->website ?: '',
            'contactEmail' => $this->email ?: '',
            'address' => $this->address ?: '',
        ];
    }
}
