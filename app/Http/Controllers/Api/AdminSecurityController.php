<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\SecurityEventResource;
use App\Models\AuditLog;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\QueueHealthService;
use App\Services\RuntimeHeartbeat;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use App\Support\SecurityEventLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                ->where('event_type', 'like', '%login%')
                ->where('event_type', 'like', '%failed%')
                ->where('created_at', '>=', now()->subDay())
                ->count(),
            'locked_accounts' => SecurityEvent::query()
                ->where('event_type', 'like', '%locked%')
                ->whereNull('resolved_at')
                ->count(),
            'active_admin_sessions' => $this->adminSessionRows()
                ->where('last_activity', '>=', now()->subMinutes(15)->timestamp)
                ->count(),
            'security_alerts' => SecurityEvent::query()
                ->whereNull('resolved_at')
                ->whereIn('severity', ['medium', 'high', 'critical'])
                ->count(),
            'high_priority_alerts' => SecurityEvent::query()
                ->whereNull('resolved_at')
                ->whereIn('severity', ['high', 'critical'])
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
            ->when($request->query('category') === 'login', fn (Builder $query) => $query->where('event_type', 'like', '%login%'))
            ->when($request->boolean('alerts'), fn (Builder $query) => $query->whereIn('severity', ['medium', 'high', 'critical']))
            ->when($request->has('resolved'), fn (Builder $query) => $request->boolean('resolved') ? $query->whereNotNull('resolved_at') : $query->whereNull('resolved_at'))
            ->when($request->boolean('prioritize_severity'), fn (Builder $query) => $query->orderByRaw("case severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end"))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Security events retrieved.',
            $query->paginate($this->perPage($request)),
            SecurityEventResource::class,
            $request,
        );
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'format' => ['nullable', 'in:csv'],
            'date_range' => ['required', 'in:last-7-days,last-30-days,this-month,custom'],
            'start_date' => ['required_if:date_range,custom', 'nullable', 'date'],
            'end_date' => ['required_if:date_range,custom', 'nullable', 'date', 'after_or_equal:start_date'],
            'include_summary' => ['nullable', 'boolean'],
            'include_alerts' => ['nullable', 'boolean'],
            'include_login_activity' => ['nullable', 'boolean'],
            'include_active_sessions' => ['nullable', 'boolean'],
            'include_security_events' => ['nullable', 'boolean'],
            'include_failed_logins' => ['nullable', 'boolean'],
            'include_permission_changes' => ['nullable', 'boolean'],
        ]);
        $sections = collect([
            'summary', 'alerts', 'login_activity', 'active_sessions',
            'security_events', 'failed_logins', 'permission_changes',
        ])->filter(fn (string $section): bool => $request->boolean('include_'.$section));
        if ($sections->isEmpty()) {
            throw ValidationException::withMessages(['sections' => ['Select at least one report section.']]);
        }

        AuditLogger::record($request, 'security_report.exported', null, null, null, [
            'date_range' => $validated['date_range'],
            'sections' => $sections->values()->all(),
        ]);

        return response()->streamDownload(function () use ($request, $sections): void {
            $handle = fopen('php://output', 'w');

            if ($sections->contains('summary')) {
                $summary = $this->securitySummaryData();
                fputcsv($handle, ['SECURITY SUMMARY']);
                fputcsv($handle, ['metric', 'value']);
                foreach ($summary as $metric => $value) {
                    fputcsv($handle, CsvExport::row([$metric, $value]));
                }
            }
            if ($sections->contains('alerts')) {
                $this->writeSecurityEvents($handle, 'SECURITY ALERTS', $this->securityEventDateQuery($request)->whereNull('resolved_at'));
            }
            if ($sections->contains('login_activity')) {
                $this->writeSecurityEvents($handle, 'LOGIN ACTIVITY', $this->securityEventDateQuery($request)->where('event_type', 'like', '%login%'));
            }
            if ($sections->contains('active_sessions')) {
                fputcsv($handle, []);
                fputcsv($handle, ['ACTIVE ADMIN SESSIONS']);
                fputcsv($handle, ['user', 'role', 'ip_address', 'device', 'last_activity']);
                $users = User::query()->with('roles')->whereIn('id', $this->adminSessionRows()->pluck('user_id'))->get()->keyBy('id');
                foreach ($this->adminSessionRows() as $session) {
                    $user = $users->get($session->user_id);
                    $role = $user?->isSuperAdmin() ? 'Super Admin' : ($user?->isAgencyAdmin() ? 'Agency Admin' : 'Custom Admin');
                    fputcsv($handle, CsvExport::row([$user?->name, $role, $session->ip_address, $session->user_agent, now()->setTimestamp((int) $session->last_activity)->toISOString()]));
                }
            }
            if ($sections->contains('security_events')) {
                $this->writeSecurityEvents($handle, 'SECURITY EVENTS', $this->securityEventDateQuery($request));
            }
            if ($sections->contains('failed_logins')) {
                $this->writeSecurityEvents($handle, 'FAILED LOGIN ATTEMPTS', $this->securityEventDateQuery($request)->where('event_type', 'like', '%login%')->where('event_type', 'like', '%failed%'));
            }
            if ($sections->contains('permission_changes')) {
                fputcsv($handle, []);
                fputcsv($handle, ['RBAC AND PERMISSION CHANGES']);
                fputcsv($handle, ['id', 'event', 'actor', 'created_at']);
                $this->auditLogDateQuery($request)->where('event', 'like', 'rbac.%')->with('user')->latest('created_at')->chunk(200, function ($logs) use ($handle): void {
                    foreach ($logs as $log) {
                        fputcsv($handle, CsvExport::row([$log->id, $log->event, $log->user?->name, $log->created_at?->toISOString()]));
                    }
                });
            }

            fclose($handle);
        }, 'rikms-security-report-'.now()->toDateString().'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
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

                return (bool) ($user?->isSuperAdmin() || $user?->isAgencyAdmin() || $user?->canAccessAdminPortal());
            })
            ->map(function ($session) use ($users): array {
                $user = $users->get($session->user_id);
                $lastActivity = now()->setTimestamp((int) $session->last_activity);

                return [
                    'id' => $session->id,
                    'user' => $user?->name ?? $user?->email ?? 'Unknown user',
                    'role' => $user?->isSuperAdmin() ? 'Super Admin' : ($user?->isAgencyAdmin() ? 'Agency Admin' : 'Custom Admin'),
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
            ->whereNull('archived_at')
            ->whereHas('roles', fn (Builder $query) => $query
                ->where('roles.is_active', true)
                ->where(function (Builder $query): void {
                    $query->whereIn('roles.slug', ['super_admin', 'agency_admin'])
                        ->orWhere(function (Builder $query): void {
                            $query->whereNotIn('roles.slug', ['agency_admin', 'public_user'])
                                ->whereHas('permissions');
                        });
                }));
    }

    private function securitySummaryData(): array
    {
        $adminUsers = $this->adminUsersQuery();

        return [
            'mfa_enabled_admin_accounts' => (clone $adminUsers)->whereNotNull('two_factor_confirmed_at')->count(),
            'mfa_eligible_admin_accounts' => (clone $adminUsers)->count(),
            'failed_login_attempts_last_24_hours' => SecurityEvent::query()->where('event_type', 'like', '%login%')->where('event_type', 'like', '%failed%')->where('created_at', '>=', now()->subDay())->count(),
            'locked_accounts_requiring_review' => SecurityEvent::query()->where('event_type', 'like', '%locked%')->whereNull('resolved_at')->count(),
            'active_admin_sessions' => $this->adminSessionRows()->where('last_activity', '>=', now()->subMinutes(15)->timestamp)->count(),
            'unresolved_security_alerts' => SecurityEvent::query()->whereNull('resolved_at')->whereIn('severity', ['medium', 'high', 'critical'])->count(),
        ];
    }

    private function securityEventDateQuery(Request $request): Builder
    {
        return $this->applyDateRange(SecurityEvent::query(), $request);
    }

    private function auditLogDateQuery(Request $request): Builder
    {
        return $this->applyDateRange(AuditLog::query(), $request);
    }

    private function applyDateRange(Builder $query, Request $request): Builder
    {
        return match ($request->query('date_range')) {
            'last-7-days' => $query->where('created_at', '>=', now()->subDays(7)->startOfDay()),
            'last-30-days' => $query->where('created_at', '>=', now()->subDays(30)->startOfDay()),
            'this-month' => $query->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]),
            'custom' => $query
                ->when($request->date('start_date'), fn (Builder $query, $date) => $query->where('created_at', '>=', $date->startOfDay()))
                ->when($request->date('end_date'), fn (Builder $query, $date) => $query->where('created_at', '<=', $date->endOfDay())),
            default => $query,
        };
    }

    private function writeSecurityEvents($handle, string $title, Builder $query): void
    {
        fputcsv($handle, []);
        fputcsv($handle, [$title]);
        fputcsv($handle, ['id', 'event_type', 'severity', 'ip_address', 'acknowledged_at', 'resolved_at', 'created_at']);
        $query->latest('created_at')->chunk(200, function ($events) use ($handle): void {
            foreach ($events as $event) {
                fputcsv($handle, CsvExport::row([$event->id, $event->event_type, $event->severity, $event->ip_address, $event->acknowledged_at?->toISOString(), $event->resolved_at?->toISOString(), $event->created_at?->toISOString()]));
            }
        });
    }

    private function adminSessionRows()
    {
        if (config('session.driver') !== 'database' || ! Schema::hasTable(config('session.table', 'sessions'))) {
            return collect();
        }

        $adminUserIds = $this->adminUsersQuery()->pluck('id');
        $sessionRows = DB::table(config('session.table', 'sessions'))
            ->whereIn('user_id', $adminUserIds)
            ->where('last_activity', '>=', now()->subMinutes((int) config('session.lifetime', 120))->timestamp)
            ->orderByDesc('last_activity')
            ->get();

        return $sessionRows->values();
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

        if (! $targetUser || (! $targetUser->isSuperAdmin() && ! $targetUser->isAgencyAdmin() && ! $targetUser->canAccessAdminPortal())) {
            return ApiResponse::error('Admin session was not found.', [], 404);
        }

        if ($targetUser->isSuperAdmin() && ! $request->user()->isSuperAdmin()) {
            return ApiResponse::error('Only a super admin can revoke a super admin session.', [], 403);
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
        $securityEvent = DB::transaction(function () use ($request, $securityEvent): SecurityEvent {
            $event = SecurityEvent::query()->lockForUpdate()->findOrFail($securityEvent->id);
            if ($event->resolved_at || $event->acknowledged_at) {
                throw ValidationException::withMessages(['event' => ['Only an open event can be acknowledged.']]);
            }
            $oldValues = $event->only(['acknowledged_at', 'acknowledged_by']);
            $event->forceFill(['acknowledged_at' => now(), 'acknowledged_by' => $request->user()->id])->save();
            AuditLogger::record($request, 'security_event.acknowledged', $event, $oldValues, $event->only(['acknowledged_at', 'acknowledged_by']));

            return $event;
        });

        return ApiResponse::success(
            'Security event acknowledged.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function resolve(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $securityEvent = DB::transaction(function () use ($request, $securityEvent): SecurityEvent {
            $event = SecurityEvent::query()->lockForUpdate()->findOrFail($securityEvent->id);
            if ($event->resolved_at) {
                throw ValidationException::withMessages(['event' => ['This security event is already resolved.']]);
            }
            $oldValues = $event->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']);
            $event->forceFill([
                'resolved_at' => now(), 'resolved_by' => $request->user()->id,
                'acknowledged_at' => $event->acknowledged_at ?? now(),
                'acknowledged_by' => $event->acknowledged_by ?? $request->user()->id,
            ])->save();
            AuditLogger::record($request, 'security_event.resolved', $event, $oldValues, $event->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']));

            return $event;
        });

        return ApiResponse::success(
            'Security event resolved.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function reopen(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $securityEvent = DB::transaction(function () use ($request, $securityEvent): SecurityEvent {
            $event = SecurityEvent::query()->lockForUpdate()->findOrFail($securityEvent->id);
            if (! $event->resolved_at) {
                throw ValidationException::withMessages(['event' => ['Only a resolved security event can be reopened.']]);
            }
            $oldValues = $event->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']);
            $event->forceFill(['resolved_at' => null, 'resolved_by' => null, 'acknowledged_at' => null, 'acknowledged_by' => null])->save();
            AuditLogger::record($request, 'security_event.reopened', $event, $oldValues, $event->only(['resolved_at', 'resolved_by', 'acknowledged_at', 'acknowledged_by']));

            return $event;
        });

        return ApiResponse::success(
            'Security event reopened.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }
}
