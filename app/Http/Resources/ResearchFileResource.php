<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResearchFileResource extends JsonResource
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
            'uploaded_by' => $this->uploaded_by,
            'original_name' => $this->original_name,
            'stored_name' => $this->stored_name,
            'disk' => $this->disk,
            'path' => $this->path,
            'mime_type' => $this->mime_type,
            'extension' => $this->extension,
            'size_bytes' => (int) $this->size_bytes,
            'checksum' => $this->checksum,
            'file_type' => $this->file_type,
            'visibility' => $this->visibility,
            'access_level' => $this->access_level,
            'status' => $this->status,
            'metadata' => $this->metadata ?? [],
            'uploaded_at' => $this->uploaded_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'archived_by' => $this->archived_by,
            'archive_reason' => $this->archive_reason,
            'restored_at' => $this->restored_at?->toISOString(),
            'restored_by' => $this->restored_by,
            'research' => new ResearchResource($this->whenLoaded('research')),
            'archived_by_user' => new UserResource($this->whenLoaded('archivedBy')),
            'restored_by_user' => new UserResource($this->whenLoaded('restoredBy')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
