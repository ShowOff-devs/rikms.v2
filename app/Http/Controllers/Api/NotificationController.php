<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function agencyRead(Request $request, Notification $notification): JsonResponse
    {
        if (! $this->canManageAgencyNotification($request, $notification)) {
            return ApiResponse::error('This notification is outside your agency scope.', [], 403);
        }

        return $this->markNotificationRead($request, $notification);
    }

    public function agencyReadAll(Request $request): JsonResponse
    {
        $updated = $this->agencyNotificationQuery($request)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'status' => Statuses::NOTIFICATION_READ,
                'updated_at' => now(),
            ]);

        return ApiResponse::success('Agency notifications marked as read.', [
            'updated_count' => $updated,
            'unread_count' => $this->agencyNotificationQuery($request)
                ->whereNull('read_at')
                ->where('status', Statuses::NOTIFICATION_UNREAD)
                ->count(),
        ]);
    }

    public function adminRead(Request $request, Notification $notification): JsonResponse
    {
        if (! $this->canManageAdminNotification($request, $notification)) {
            return ApiResponse::error('This notification is outside your admin scope.', [], 403);
        }

        return $this->markNotificationRead($request, $notification);
    }

    public function adminReadAll(Request $request): JsonResponse
    {
        $updated = $this->adminNotificationQuery($request)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'status' => Statuses::NOTIFICATION_READ,
                'updated_at' => now(),
            ]);

        return ApiResponse::success('Admin notifications marked as read.', [
            'updated_count' => $updated,
            'unread_count' => $this->adminNotificationQuery($request)
                ->whereNull('read_at')
                ->where('status', Statuses::NOTIFICATION_UNREAD)
                ->count(),
        ]);
    }

    private function markNotificationRead(Request $request, Notification $notification): JsonResponse
    {
        $notification->update([
            'read_at' => now(),
            'status' => Statuses::NOTIFICATION_READ,
        ]);

        return ApiResponse::success(
            'Notification marked as read.',
            [
                'notification' => (new NotificationResource($notification->refresh()))->resolve($request),
                'unread_count' => $this->unreadCountForRequest($request),
            ],
        );
    }

    private function canManageAgencyNotification(Request $request, Notification $notification): bool
    {
        return (int) $notification->user_id === (int) $request->user()->id
            || ($notification->agency_id !== null && (int) $notification->agency_id === (int) $request->user()->agency_id);
    }

    private function canManageAdminNotification(Request $request, Notification $notification): bool
    {
        return (int) $notification->user_id === (int) $request->user()->id
            || ($notification->user_id === null && $notification->agency_id === null);
    }

    private function agencyNotificationQuery(Request $request): Builder
    {
        return Notification::query()
            ->where(function (Builder $query) use ($request): void {
                $query->where('user_id', $request->user()->id)
                    ->orWhere('agency_id', $request->user()->agency_id);
            });
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

    private function unreadCountForRequest(Request $request): int
    {
        $query = $request->user()->isSuperAdmin()
            ? $this->adminNotificationQuery($request)
            : $this->agencyNotificationQuery($request);

        return $query
            ->whereNull('read_at')
            ->where('status', Statuses::NOTIFICATION_UNREAD)
            ->count();
    }
}
