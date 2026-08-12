<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Agency\ApproveAccessRequestRequest;
use App\Http\Requests\Agency\DenyAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Models\AccessRequest;
use App\Models\Notification;
use App\Services\AccessRequestEmailNotificationService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AgencyAccessRequestDecisionController extends Controller
{
    public function __construct(
        private readonly AccessRequestEmailNotificationService $emailNotifications,
    ) {}

    public function approve(ApproveAccessRequestRequest $request, AccessRequest $accessRequest): JsonResponse
    {
        return $this->decide($request, $accessRequest, Statuses::ACCESS_REQUEST_APPROVED, 'Access request approved.');
    }

    public function deny(DenyAccessRequestRequest $request, AccessRequest $accessRequest): JsonResponse
    {
        return $this->decide($request, $accessRequest, Statuses::ACCESS_REQUEST_DENIED, 'Access request denied.');
    }

    private function decide(Request $request, AccessRequest $accessRequest, string $status, string $message): JsonResponse
    {
        $result = DB::transaction(function () use ($request, $accessRequest, $status): array {
            $lockedAccessRequest = AccessRequest::query()
                ->with('research')
                ->whereKey($accessRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->authorizeLockedDecision($request, $lockedAccessRequest);

            if ($lockedAccessRequest->status !== Statuses::ACCESS_REQUEST_PENDING) {
                return [
                    'processed' => false,
                    'email_notification' => 'skipped',
                    'access_request' => $lockedAccessRequest,
                ];
            }

            $oldValues = $lockedAccessRequest->only([
                'status',
                'reviewed_by',
                'reviewed_at',
                'review_notes',
                'public_denial_reason',
                'internal_review_notes',
                'access_expires_at',
            ]);
            $internalNotes = $this->internalNotes($request);
            $accessExpiresAt = $status === Statuses::ACCESS_REQUEST_APPROVED
                ? $request->date('expires_at')
                : null;
            $accessToken = $status === Statuses::ACCESS_REQUEST_APPROVED ? Str::random(64) : null;

            $lockedAccessRequest->update([
                'status' => $status,
                'active_duplicate_key' => null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $internalNotes,
                'internal_review_notes' => $internalNotes,
                'public_denial_reason' => $status === Statuses::ACCESS_REQUEST_DENIED
                    ? $this->publicDenialReason($request)
                    : null,
                'access_expires_at' => $accessExpiresAt,
                'access_token_hash' => $accessToken ? hash('sha256', $accessToken) : null,
                'access_token_generated_at' => $accessToken ? now() : null,
                'access_token_last_used_at' => null,
                'access_revoked_at' => null,
            ]);

            Notification::create([
                'user_id' => $lockedAccessRequest->requested_by,
                'agency_id' => $lockedAccessRequest->agency_id,
                'type' => 'access_request.'.$status,
                'title' => $status === 'approved' ? 'Access Request Approved' : 'Access Request Denied',
                'message' => $status === 'approved'
                    ? 'Your research access request has been approved.'
                    : 'Your research access request has been denied.',
                'data' => [
                    'access_request_id' => $lockedAccessRequest->id,
                    'research_id' => $lockedAccessRequest->research_id,
                    'expires_at' => $lockedAccessRequest->access_expires_at?->toISOString(),
                ],
                'priority' => 'normal',
                'status' => Statuses::NOTIFICATION_UNREAD,
            ]);

            UserNotificationPreferences::agencyAdmins(
                (int) $lockedAccessRequest->agency_id,
                'notifyRequestApprovalsDenials',
            )->each(function ($user) use ($lockedAccessRequest, $status): void {
                Notification::create([
                    'user_id' => $user->id,
                    'agency_id' => $lockedAccessRequest->agency_id,
                    'type' => 'agency_access_request.'.$status,
                    'title' => $status === 'approved'
                        ? 'Access Request Approved'
                        : 'Access Request Denied',
                    'message' => $status === 'approved'
                        ? 'An agency access request was approved.'
                        : 'An agency access request was denied.',
                    'data' => [
                        'access_request_id' => $lockedAccessRequest->id,
                        'research_id' => $lockedAccessRequest->research_id,
                    ],
                    'action_url' => '/agency/access-requests',
                    'priority' => 'normal',
                    'status' => Statuses::NOTIFICATION_UNREAD,
                ]);
            });

            $emailNotification = $this->emailNotifications->queueDecisionNotificationAfterCommit(
                $lockedAccessRequest->fresh(),
                $status,
                $accessToken,
            );

            AuditLogger::record(
                $request,
                'access_request.'.$status,
                $lockedAccessRequest,
                $oldValues,
                $lockedAccessRequest->fresh()->only([
                    'status',
                    'reviewed_by',
                    'reviewed_at',
                    'review_notes',
                    'public_denial_reason',
                    'internal_review_notes',
                    'access_expires_at',
                ]),
                [
                    'access_expires_at' => $lockedAccessRequest->access_expires_at?->toISOString(),
                    'notification_type' => 'access_request.'.$status.'.email',
                    'email_notification' => $emailNotification->status,
                ],
            );

            return [
                'processed' => true,
                'email_notification' => $emailNotification,
                'access_request' => $lockedAccessRequest,
            ];
        });

        if ($result['processed'] === false) {
            return ApiResponse::error('This access request has already been processed.', [], 409);
        }

        return ApiResponse::success(
            $message,
            (new AccessRequestResource($result['access_request']->refresh()->load(['research.agency', 'requester', 'reviewer'])))->resolve($request),
            ['email_notification' => $result['email_notification']->status],
        );
    }

    private function authorizeLockedDecision(Request $request, AccessRequest $accessRequest): void
    {
        $user = $request->user();

        if (
            ! $user?->isAgencyAdmin()
            || $user->agency_id === null
            || $accessRequest->research === null
            || (int) $accessRequest->research->agency_id !== (int) $user->agency_id
        ) {
            throw new AuthorizationException;
        }
    }

    private function internalNotes(Request $request): ?string
    {
        $notes = $request->input('internal_notes', $request->input('decision_notes'));

        return is_string($notes) && trim($notes) !== '' ? trim($notes) : null;
    }

    private function publicDenialReason(Request $request): ?string
    {
        $reason = $request->input('public_denial_reason');

        return is_string($reason) && trim($reason) !== '' ? trim($reason) : null;
    }
}
