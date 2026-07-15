<?php

namespace App\Support;

use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SecurityEventLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public static function record(
        Request $request,
        string $eventType,
        ?User $user = null,
        string $severity = 'low',
        array $metadata = [],
    ): void {
        try {
            SecurityEvent::create([
                'user_id' => $user?->id,
                'agency_id' => $user?->agency_id,
                'event_type' => $eventType,
                'severity' => $severity,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => self::safeMetadata($request, $user, $metadata),
                'created_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Security event write failed.', [
                'event_type' => $eventType,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private static function safeMetadata(Request $request, ?User $user, array $metadata): array
    {
        unset(
            $metadata['password'],
            $metadata['password_confirmation'],
            $metadata['current_password'],
            $metadata['newPassword'],
            $metadata['newPassword_confirmation'],
            $metadata['authentication_code'],
            $metadata['code'],
            $metadata['recovery_code'],
            $metadata['_token'],
        );

        return array_filter([
            ...$metadata,
            'portal' => $metadata['portal'] ?? self::portalFromRequest($request),
            'role' => $metadata['role'] ?? $user?->role,
            'email' => $metadata['email'] ?? $user?->email,
        ], fn (mixed $value): bool => $value !== null && $value !== '');
    }

    private static function portalFromRequest(Request $request): string
    {
        if ($request->is('admin/*') || $request->is('api/admin/*')) {
            return 'super_admin';
        }

        if ($request->is('agency/*') || $request->is('api/agency/*')) {
            return 'agency_admin';
        }

        return 'default';
    }
}
