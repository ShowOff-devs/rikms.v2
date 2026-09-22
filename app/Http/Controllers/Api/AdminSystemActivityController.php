<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\NotificationResource;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\NotificationUserState;
use App\Models\SecurityEvent;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\CsvExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSystemActivityController extends Controller
{
    use RespondsWithApiPagination;

    public function notifications(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $query = $this->adminNotificationQuery($request)
            ->with(['userStates' => fn ($query) => $query->where('user_id', $userId)])
            ->when($request->filled('category'), fn (Builder $query) => $this->applyNotificationCategory($query, $request->string('category')->toString()))
            ->when($request->query('status') === 'unread', fn (Builder $query) => $query->unreadBy($userId))
            ->when($request->query('status') === 'read', fn (Builder $query) => $query->readBy($userId))
            ->latest();

        return $this->paginatedResponse(
            'Admin notifications retrieved.',
            $query->paginate($this->perPage($request)),
            NotificationResource::class,
            $request,
        );
    }

    public function clearNotifications(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => ['required', 'in:all,read,current-category'],
            'category' => ['required_if:scope,current-category', 'nullable', 'string', 'in:research-updates,access-activity,security-alerts,system-updates'],
        ]);

        $query = $this->adminNotificationQuery($request);

        if ($validated['scope'] === 'read') {
            $query->readBy($request->user()->id);
        }

        if ($validated['scope'] === 'current-category' && ! empty($validated['category'])) {
            $this->applyNotificationCategory($query, $validated['category']);
        }

        $now = now();
        $updatedCount = 0;
        $userId = $request->user()->id;

        $query->select('notifications.id')->chunkById(500, function ($notifications) use ($now, $userId, &$updatedCount): void {
            $rows = $notifications->map(fn (Notification $notification): array => [
                'notification_id' => $notification->id,
                'user_id' => $userId,
                'read_at' => $now,
                'hidden_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();

            NotificationUserState::query()->upsert(
                $rows,
                ['notification_id', 'user_id'],
                ['read_at', 'hidden_at', 'updated_at'],
            );
            $updatedCount += count($rows);
        }, 'notifications.id', 'id');

        return ApiResponse::success('Admin notifications cleared.', [
            'updated_count' => $updatedCount,
            'cleared_at' => now()->toISOString(),
        ]);
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $query = $this->activityLogQuery($request)->latest('created_at');
        $paginator = $query->paginate($this->perPage($request));
        $agencies = Agency::query()
            ->whereIn('id', AuditLog::query()->select('agency_id')->whereNotNull('agency_id')->distinct())
            ->orderBy('name')
            ->get(['name', 'short_name']);
        $actions = AuditLog::query()
            ->whereNotNull('event')
            ->distinct()
            ->orderBy('event')
            ->pluck('event');

        return ApiResponse::success(
            'Admin activity logs retrieved.',
            AuditLogResource::collection($paginator->getCollection())->resolve($request),
            [
                'pagination' => [
                    'current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(), 'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(), 'to' => $paginator->lastItem(),
                ],
                'filter_options' => [
                    'agencies' => $agencies->map(fn (Agency $agency) => $agency->short_name ?: $agency->name)->filter()->values(),
                    'actions' => $actions,
                ],
            ],
        );
    }

    private function activityLogQuery(Request $request): Builder
    {
        return AuditLog::query()
            ->with(['user.roles', 'agency'])
            ->when($request->filled('query'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('query')->trim()->toString()) ?: [];
                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';
                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('event', 'like', $keyword)
                            ->orWhere('auditable_type', 'like', $keyword)
                            ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('email', 'like', $keyword))
                            ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                    });
                }
            })
            ->when($request->filled('agency'), function (Builder $query) use ($request): void {
                $agency = $request->string('agency')->toString();

                if ($agency !== 'all') {
                    $query->whereHas('agency', fn (Builder $query) => $query->where('short_name', $agency)->orWhere('name', $agency));
                }
            })
            ->when($request->filled('action') && $request->query('action') !== 'all', fn (Builder $query) => $query->where('event', $request->query('action')))
            ->when($request->filled('role') && $request->query('role') !== 'all', function (Builder $query) use ($request): void {
                $role = match ($request->query('role')) {
                    'Super Admin' => 'super_admin', 'Agency Admin' => 'agency_admin', default => null,
                };
                if ($role) {
                    $query->whereHas('user', fn (Builder $query) => $query->where('role', $role)->orWhereHas('roles', fn (Builder $query) => $query->where('slug', $role)));
                } elseif ($request->query('role') === 'System') {
                    $query->whereNull('user_id');
                } elseif ($request->query('role') === 'Unknown') {
                    $query->whereNotNull('user_id')->whereHas('user', fn (Builder $query) => $query
                        ->where(fn (Builder $query) => $query->whereNull('role')->orWhereNotIn('role', ['super_admin', 'agency_admin']))
                        ->whereDoesntHave('roles', fn (Builder $query) => $query->whereIn('slug', ['super_admin', 'agency_admin'])));
                }
            })
            ->when($request->filled('status') && $request->query('status') !== 'all', function (Builder $query) use ($request): void {
                match ($request->query('status')) {
                    'failed' => $query->where(fn (Builder $query) => $query->where('event', 'like', '%failed%')->orWhere('event', 'like', '%error%')),
                    'pending' => $query->where('event', 'like', '%pending%'),
                    default => $query->where('event', 'not like', '%failed%')->where('event', 'not like', '%error%')->where('event', 'not like', '%pending%'),
                };
            });
    }

    public function timeline(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with(['user.roles', 'agency'])
            ->latest('created_at')
            ->limit($this->perPage($request))
            ->get();

        return ApiResponse::success(
            'Admin activity timeline retrieved.',
            AuditLogResource::collection($logs)->resolve($request),
        );
    }

    public function export(Request $request)
    {
        abort_unless($request->query('format', 'csv') === 'csv', 422, 'Only CSV export is supported.');
        $filename = 'rikms-activity-log-'.now()->toDateString().'.csv';
        $logs = $this->applyDateRange($this->activityLogQuery($request), $request)->latest('created_at');

        AuditLogger::record($request, 'activity_log.exported', null, null, null, [
            'date_range' => $request->query('date_range'),
            'include_activity_logs' => $request->boolean('include_activity_logs', true),
            'include_timeline' => $request->boolean('include_timeline'),
            'include_notifications' => $request->boolean('include_notifications'),
            'include_security_events' => $request->boolean('include_security_events'),
        ]);

        return response()->streamDownload(function () use ($logs, $request): void {
            $handle = fopen('php://output', 'w');
            if ($request->boolean('include_activity_logs', true)) {
                fputcsv($handle, ['ACTIVITY LOGS']);
                fputcsv($handle, ['id', 'event', 'user', 'agency', 'created_at']);
                (clone $logs)->chunk(200, function ($records) use ($handle): void {
                    foreach ($records as $log) {
                        fputcsv($handle, CsvExport::row([$log->id, $log->event, $log->user?->name, $log->agency?->short_name ?? $log->agency?->name, $log->created_at?->toISOString()]));
                    }
                });
            }
            if ($request->boolean('include_timeline')) {
                fputcsv($handle, []);
                fputcsv($handle, ['ACTIVITY TIMELINE']);
                fputcsv($handle, ['id', 'event', 'user', 'agency', 'created_at']);
                foreach ((clone $logs)->limit(30)->get() as $log) {
                    fputcsv($handle, CsvExport::row([$log->id, $log->event, $log->user?->name, $log->agency?->short_name ?? $log->agency?->name, $log->created_at?->toISOString()]));
                }
            }
            if ($request->boolean('include_notifications')) {
                fputcsv($handle, []);
                fputcsv($handle, ['NOTIFICATIONS']);
                fputcsv($handle, ['id', 'type', 'title', 'created_at']);
                $this->applyDateRange($this->adminNotificationQuery($request), $request)->latest()->chunk(200, function ($records) use ($handle): void {
                    foreach ($records as $notification) {
                        fputcsv($handle, CsvExport::row([$notification->id, $notification->type, $notification->title, $notification->created_at?->toISOString()]));
                    }
                });
            }
            if ($request->boolean('include_security_events')) {
                fputcsv($handle, []);
                fputcsv($handle, ['SECURITY EVENTS']);
                fputcsv($handle, ['id', 'type', 'severity', 'created_at']);
                $this->applyDateRange(SecurityEvent::query(), $request)->latest()->chunk(200, function ($records) use ($handle): void {
                    foreach ($records as $event) {
                        fputcsv($handle, CsvExport::row([$event->id, $event->event_type, $event->severity, $event->created_at?->toISOString()]));
                    }
                });
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function adminNotificationQuery(Request $request): Builder
    {
        return Notification::query()
            ->where(function (Builder $query) use ($request): void {
                $query->where('user_id', $request->user()->id)
                    ->orWhere(function (Builder $query): void {
                        $query->whereNull('user_id')->whereNull('agency_id');
                    });
            })->visibleTo($request->user()->id);
    }

    private function applyNotificationCategory(Builder $query, string $category): void
    {
        match ($category) {
            'research-updates' => $query->where('type', 'like', '%research%'),
            'access-activity' => $query->where('type', 'like', '%access%'),
            'security-alerts' => $query->where('type', 'like', '%security%'),
            'system-updates' => $query->where('type', 'not like', '%research%')->where('type', 'not like', '%access%')->where('type', 'not like', '%security%'),
            default => $query->where('type', $category),
        };
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
}
