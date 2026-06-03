<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\NotificationResource;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSystemActivityController extends Controller
{
    use RespondsWithApiPagination;

    public function notifications(Request $request): JsonResponse
    {
        $query = $this->adminNotificationQuery($request)
            ->when($request->filled('category'), fn (Builder $query) => $query->where('type', $request->string('category')))
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
            'category' => ['nullable', 'string'],
        ]);

        $query = $this->adminNotificationQuery($request);

        if ($validated['scope'] === 'read') {
            $query->whereNotNull('read_at');
        }

        if ($validated['scope'] === 'current-category' && ! empty($validated['category'])) {
            $query->where('type', $validated['category']);
        }

        $updated = $query->update([
            'read_at' => now(),
            'status' => Statuses::NOTIFICATION_READ,
            'updated_at' => now(),
        ]);

        return ApiResponse::success('Admin notifications cleared.', [
            'updated_count' => $updated,
            'cleared_at' => now()->toISOString(),
        ]);
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with(['user.roles', 'agency'])
            ->when($request->filled('query'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('query')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('event', 'like', $keyword)
                        ->orWhere('auditable_type', 'like', $keyword)
                        ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('email', 'like', $keyword))
                        ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                });
            })
            ->when($request->filled('agency'), function (Builder $query) use ($request): void {
                $agency = $request->string('agency')->toString();

                if ($agency !== 'all') {
                    $query->whereHas('agency', fn (Builder $query) => $query->where('short_name', $agency)->orWhere('name', $agency));
                }
            })
            ->latest('created_at');

        return $this->paginatedResponse(
            'Admin activity logs retrieved.',
            $query->paginate($this->perPage($request)),
            AuditLogResource::class,
            $request,
        );
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
        $filename = 'rikms-activity-log-'.now()->toDateString().'.csv';
        $logs = AuditLog::query()->with(['user', 'agency'])->latest('created_at')->limit(1000)->get();

        return response()->streamDownload(function () use ($logs): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['id', 'event', 'user', 'agency', 'created_at']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->id,
                    $log->event,
                    $log->user?->name,
                    $log->agency?->short_name ?? $log->agency?->name,
                    $log->created_at?->toISOString(),
                ]);
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
            });
    }
}
