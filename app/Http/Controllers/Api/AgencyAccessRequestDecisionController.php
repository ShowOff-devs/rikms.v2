<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Agency\ApproveAccessRequestRequest;
use App\Http\Requests\Agency\DenyAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Models\AccessRequest;
use App\Models\Notification;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AgencyAccessRequestDecisionController extends Controller
{
    public function approve(ApproveAccessRequestRequest $request, AccessRequest $accessRequest): JsonResponse
    {
        return $this->decide($request, $accessRequest, 'approved', 'Access request approved.');
    }

    public function deny(DenyAccessRequestRequest $request, AccessRequest $accessRequest): JsonResponse
    {
        return $this->decide($request, $accessRequest, 'denied', 'Access request denied.');
    }

    private function decide(Request $request, AccessRequest $accessRequest, string $status, string $message): JsonResponse
    {
        $oldValues = $accessRequest->only(['status', 'reviewed_by', 'reviewed_at', 'review_notes']);

        DB::transaction(function () use ($request, $accessRequest, $status, $oldValues): void {
            $accessRequest->update([
                'status' => $status,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $request->input('decision_notes'),
            ]);

            Notification::create([
                'user_id' => $accessRequest->requested_by,
                'agency_id' => $accessRequest->agency_id,
                'type' => 'access_request.'.$status,
                'title' => $status === 'approved' ? 'Access Request Approved' : 'Access Request Denied',
                'message' => $status === 'approved'
                    ? 'Your research access request has been approved.'
                    : 'Your research access request has been denied.',
                'data' => [
                    'access_request_id' => $accessRequest->id,
                    'research_id' => $accessRequest->research_id,
                    'expires_at' => $request->input('expires_at'),
                ],
                'priority' => 'normal',
                'status' => Statuses::NOTIFICATION_UNREAD,
            ]);

            AuditLogger::record(
                $request,
                'access_request.'.$status,
                $accessRequest,
                $oldValues,
                $accessRequest->fresh()->only(['status', 'reviewed_by', 'reviewed_at', 'review_notes']),
                ['expires_at' => $request->input('expires_at')],
            );
        });

        return ApiResponse::success(
            $message,
            (new AccessRequestResource($accessRequest->refresh()->load(['research.agency', 'requester', 'reviewer'])))->resolve($request),
        );
    }
}
