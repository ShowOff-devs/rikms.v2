<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResearchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'agency_id' => $this->agency_id,
            'title' => $this->title,
            'abstract' => $this->abstract,
            'authors' => $this->authors ?? [],
            'publication_year' => $this->publication_year,
            'category' => $this->category,
            'sdgs' => $this->sdgs ?? [],
            'keywords' => $this->keywords ?? [],
            'status' => $this->status,
            'access_level' => $this->access_level,
            'downloads' => (int) $this->downloads,
            'embargo_until' => $this->embargo_until?->toDateString(),
            'external_url' => $this->external_url,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'agency' => new AgencyResource($this->whenLoaded('agency')),
            'uploader' => new UserResource($this->whenLoaded('uploader')),
            'files' => ResearchFileResource::collection($this->whenLoaded('files')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
