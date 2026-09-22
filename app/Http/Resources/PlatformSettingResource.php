<?php

namespace App\Http\Resources;

use App\Services\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlatformSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $settings = app(PlatformSettingsService::class);
        $metadata = $settings->metadataFor((string) $this->key);

        return [
            'id' => $this->id,
            'key' => $this->key,
            'value' => $this->is_encrypted ? null : $this->value,
            'typed_value' => $this->is_encrypted ? null : $settings->get((string) $this->key),
            'type' => $this->type,
            'group' => $this->group,
            'label' => $this->label,
            'description' => $this->description,
            'is_public' => (bool) $this->is_public,
            'is_encrypted' => (bool) $this->is_encrypted,
            'default' => $metadata['default'],
            'min' => $metadata['min'],
            'max' => $metadata['max'],
            'options' => $metadata['options'],
            'operational' => $metadata['operational'],
            'enforced' => $metadata['enforced'],
            'effective_value' => $metadata['effective_value'],
            'requires_restart' => $metadata['requires_restart'],
            'read_only' => $metadata['read_only'],
            'status' => $metadata['status'],
            'updated_by' => $this->updated_by,
            'version' => hash('sha256', implode("\0", [
                (string) $this->key,
                (string) $this->value,
                (string) $this->type,
                $this->updated_at?->toISOString() ?? '',
            ])),
            'updated_at' => $this->updated_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
