<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $state = $this->relationLoaded('userStates')
            ? $this->userStates->firstWhere('user_id', $request->user()?->id)
            : null;
        $readAt = $state?->read_at ?? ((int) $this->user_id === (int) $request->user()?->id ? $this->read_at : null);

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'agency_id' => $this->agency_id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'data' => $this->data ?? [],
            'read_at' => $readAt?->toISOString(),
            'action_url' => $this->action_url,
            'priority' => $this->priority,
            'status' => $readAt ? 'read' : 'unread',
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
