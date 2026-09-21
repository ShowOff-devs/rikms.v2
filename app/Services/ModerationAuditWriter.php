<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ModerationAuditWriter
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     * @param  array<string, mixed>|null  $metadata
     */
    public function record(
        Request $request,
        string $transitionId,
        string $event,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
    ): AuditLog {
        /** @var User|null $user */
        $user = $request->user();

        return AuditLog::create([
            'transition_id' => $transitionId,
            'user_id' => $user?->id,
            'agency_id' => $user?->agency_id,
            'event' => $event,
            'auditable_type' => $auditable?->getMorphClass(),
            'auditable_id' => $auditable?->getKey(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => array_merge($metadata ?? [], [
                'transition_id' => $transitionId,
            ]),
            'created_at' => now(),
        ]);
    }
}
