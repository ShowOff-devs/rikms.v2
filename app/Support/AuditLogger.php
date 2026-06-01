<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     * @param  array<string, mixed>|null  $metadata
     */
    public static function record(
        Request $request,
        string $event,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
    ): void {
        try {
            /** @var User|null $user */
            $user = $request->user();

            AuditLog::create([
                'user_id' => $user?->id,
                'agency_id' => $user?->agency_id,
                'event' => $event,
                'auditable_type' => $auditable?->getMorphClass(),
                'auditable_id' => $auditable?->getKey(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata' => $metadata,
                'created_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Audit log write failed.', [
                'event' => $event,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
