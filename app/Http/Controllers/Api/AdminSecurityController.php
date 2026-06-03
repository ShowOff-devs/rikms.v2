<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\SecurityEventResource;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSecurityController extends Controller
{
    use RespondsWithApiPagination;

    public function events(Request $request): JsonResponse
    {
        $query = SecurityEvent::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event_type'), fn (Builder $query) => $query->where('event_type', $request->string('event_type')))
            ->when($request->filled('severity'), fn (Builder $query) => $query->where('severity', $request->string('severity')))
            ->when($request->has('resolved'), fn (Builder $query) => $request->boolean('resolved') ? $query->whereNotNull('resolved_at') : $query->whereNull('resolved_at'))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Security events retrieved.',
            $query->paginate($this->perPage($request)),
            SecurityEventResource::class,
            $request,
        );
    }

    public function show(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        return ApiResponse::success(
            'Security event retrieved.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function sessions(Request $request): JsonResponse
    {
        $sessionRows = DB::table(config('session.table', 'sessions'))
            ->whereNotNull('user_id')
            ->orderByDesc('last_activity')
            ->limit(100)
            ->get();

        $users = User::query()
            ->with('roles')
            ->whereIn('id', $sessionRows->pluck('user_id')->filter()->unique())
            ->get()
            ->keyBy('id');

        $data = $sessionRows
            ->filter(function ($session) use ($users): bool {
                $user = $users->get($session->user_id);

                return $user?->isSuperAdmin() || $user?->isAgencyAdmin();
            })
            ->map(function ($session) use ($users): array {
                $user = $users->get($session->user_id);
                $lastActivity = now()->setTimestamp((int) $session->last_activity);

                return [
                    'id' => $session->id,
                    'user' => $user?->name ?? $user?->email ?? 'Unknown user',
                    'role' => $user?->isSuperAdmin() ? 'Super Admin' : 'Agency Admin',
                    'device' => $session->user_agent ?? 'Unknown device',
                    'ip_address' => $session->ip_address ?? '',
                    'last_activity' => $lastActivity->toISOString(),
                    'status' => $lastActivity->diffInMinutes(now()) > 15 ? 'idle' : 'active',
                ];
            })
            ->values();

        return ApiResponse::success('Admin sessions retrieved.', $data);
    }

    public function revokeSession(Request $request, string $sessionId): JsonResponse
    {
        $deleted = DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('Admin session was not found.', [], 404);
        }

        AuditLogger::record($request, 'admin_session.revoked', null, null, [
            'session_id' => $sessionId,
        ]);

        return ApiResponse::success('Admin session revoked.', [
            'id' => $sessionId,
            'revoked_at' => now()->toISOString(),
        ]);
    }

    public function resolve(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by']);

        $securityEvent->forceFill([
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
        ])->save();

        AuditLogger::record(
            $request,
            'security_event.resolved',
            $securityEvent,
            $oldValues,
            $securityEvent->only(['resolved_at', 'resolved_by']),
        );

        return ApiResponse::success(
            'Security event resolved.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function reopen(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by']);

        $securityEvent->forceFill([
            'resolved_at' => null,
            'resolved_by' => null,
        ])->save();

        AuditLogger::record(
            $request,
            'security_event.reopened',
            $securityEvent,
            $oldValues,
            $securityEvent->only(['resolved_at', 'resolved_by']),
        );

        return ApiResponse::success(
            'Security event reopened.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }
}
