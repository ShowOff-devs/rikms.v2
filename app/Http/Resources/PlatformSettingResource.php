<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlatformSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'value' => $this->is_encrypted ? null : $this->value,
            'type' => $this->type,
            'group' => $this->group,
            'label' => $this->label,
            'description' => $this->description,
            'is_public' => (bool) $this->is_public,
            'is_encrypted' => (bool) $this->is_encrypted,
            'updated_by' => $this->updated_by,
            'updated_at' => $this->updated_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
