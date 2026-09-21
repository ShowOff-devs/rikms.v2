<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\SecurityEventResource;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\QueueHealthService;
use App\Services\RuntimeHeartbeat;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\SecurityEventLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminSecurityController extends Controller
{
    use RespondsWithApiPagination;

    public function summary(Request $request): JsonResponse
    {
        $adminUsers = $this->adminUsersQuery();

        return ApiResponse::success('Security summary retrieved.', [
            'mfa_enabled_admin_accounts' => (clone $adminUsers)
                ->whereNotNull('two_factor_confirmed_at')
                ->count(),
            'mfa_eligible_admin_accounts' => (clone $adminUsers)->count(),
            'failed_login_attempts' => SecurityEvent::query()
                ->where('event_type', 'like', '%failed%')
                ->count(),
            'locked_accounts' => SecurityEvent::query()
                ->where('event_type', 'like', '%locked%')
                ->count(),
            'active_admin_sessions' => $this->adminSessionRows()->count(),
            'security_alerts' => SecurityEvent::query()
                ->whereNull('resolved_at')
                ->count(),
        ]);
    }

    public function queueHealth(
        Request $request,
        RuntimeHeartbeat $heartbeat,
        QueueHealthService $queueHealth,
    ): JsonResponse {
        try {
            $queue = $queueHealth->snapshot();
            $queueAvailable = true;
        } catch (\Throwable) {
            $queue = [
                'connection' => (string) config('queue.default'),
                'pending_jobs' => 0,
                'failed_jobs' => 0,
                'oldest_pending_job_age_minutes' => null,
            ];
            $queueAvailable = false;
        }

        $runtime = $heartbeat->status();
        $status = match (true) {
            ! $queueAvailable => 'critical',
            ! $runtime['scheduler']['healthy'] || ! $runtime['worker']['healthy'] => 'critical',
            $queue['failed_jobs'] > 0 || ($queue['oldest_pending_job_age_minutes'] !== null && $queue['oldest_pending_job_age_minutes'] >= 60) => 'critical',
            $queue['oldest_pending_job_age_minutes'] !== null && $queue['oldest_pending_job_age_minutes'] >= 5 => 'warning',
            default => 'healthy',
        };

        return ApiResponse::success('Queue health retrieved.', [
            'queue_connection' => $queue['connection'],
            'pending_jobs' => $queue['pending_jobs'],
            'failed_jobs' => $queue['failed_jobs'],
            'oldest_pending_job_age_minutes' => $queue['oldest_pending_job_age_minutes'],
            'scheduler_heartbeat' => $runtime['scheduler'],
            'worker_heartbeat' => $runtime['worker'],
            'status' => $status,
        ]);
    }

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
        $sessionRows = $this->adminSessionRows();

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

    private function adminUsersQuery(): Builder
    {
        return User::query()
            ->where('status', 'active')
            ->where(function (Builder $query): void {
                $query
                    ->whereIn('role', ['super_admin', 'agency_admin'])
                    ->orWhereHas('roles', fn (Builder $query) => $query->whereIn('slug', ['super_admin', 'agency_admin']));
            });
    }

    private function adminSessionRows()
    {
        if (! Schema::hasTable(config('session.table', 'sessions'))) {
            return collect();
        }

        $sessionRows = DB::table(config('session.table', 'sessions'))
            ->whereNotNull('user_id')
            ->orderByDesc('last_activity')
            ->limit(100)
            ->get();

        $adminUserIds = $this->adminUsersQuery()
            ->whereIn('id', $sessionRows->pluck('user_id')->filter()->unique())
            ->pluck('id');

        return $sessionRows
            ->filter(fn ($session): bool => $adminUserIds->contains((int) $session->user_id))
            ->values();
    }

    public function revokeSession(Request $request, string $sessionId): JsonResponse
    {
        if (config('session.driver') !== 'database') {
            return ApiResponse::error('Session revocation requires the database session driver.', [], 409);
        }

        if (! Schema::hasTable(config('session.table', 'sessions'))) {
            return ApiResponse::error('Session storage is not available.', [], 409);
        }

        if ($request->hasSession() && $sessionId === $request->session()->getId()) {
            return ApiResponse::error('The current session cannot be revoked from this panel.', [
                'session' => ['Sign out to end your current session.'],
            ], 422);
        }

        $session = DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->first();

        if (! $session || ! $session->user_id) {
            return ApiResponse::error('Admin session was not found.', [], 404);
        }

        $targetUser = User::query()
            ->with('roles')
            ->whereKey($session->user_id)
            ->first();

        if (! $targetUser || (! $targetUser->isSuperAdmin() && ! $targetUser->isAgencyAdmin())) {
            return ApiResponse::error('Admin session was not found.', [], 404);
        }

        $deleted = DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->where('user_id', $targetUser->id)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('Admin session was not found.', [], 404);
        }

        AuditLogger::record($request, 'admin_session.revoked', null, null, [
            'session_id' => $sessionId,
        ]);

        SecurityEventLogger::record($request, 'session.revoked', $targetUser, 'medium', [
            'session_id' => $sessionId,
            'revoked_by' => $request->user()?->id,
            'revocation_scope' => 'admin_security_center',
        ]);

        return ApiResponse::success('Admin session revoked.', [
            'id' => $sessionId,
            'revoked_at' => now()->toISOString(),
        ]);
    }

    public function acknowledge(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['acknowledged_at', 'acknowledged_by']);

        $securityEvent->forceFill([
            'acknowledged_at' => now(),
            'acknowledged_by' => $request->user()->id,
        ])->save();

        AuditLogger::record(
            $request,
            'security_event.acknowledged',
            $securityEvent,
            $oldValues,
            $securityEvent->only(['acknowledged_at', 'acknowledged_by']),
        );

        return ApiResponse::success(
            'Security event acknowledged.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function resolve(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']);

        $securityEvent->forceFill([
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
            'acknowledged_at' => $securityEvent->acknowledged_at ?? now(),
            'acknowledged_by' => $securityEvent->acknowledged_by ?? $request->user()->id,
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
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']);

        $securityEvent->forceFill([
            'resolved_at' => null,
            'resolved_by' => null,
            'acknowledged_at' => null,
            'acknowledged_by' => null,
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
