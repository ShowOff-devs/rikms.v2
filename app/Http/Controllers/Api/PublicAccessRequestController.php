<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublicAccessRequestController extends Controller
{
    public function store(StorePublicAccessRequestRequest $request, string $research): JsonResponse
    {
        $researchRecord = Research::query()
            ->with('agency')
            ->where(function (Builder $query) use ($research): void {
                $query->where('slug', $research);

                if (ctype_digit($research)) {
                    $query->orWhereKey((int) $research);
                }
            })
            ->first();

        if (! $researchRecord) {
            return ApiResponse::error('Research record was not found.', [], 404);
        }

        if (! $this->canReceivePublicRequest($researchRecord)) {
            return ApiResponse::error('This research record cannot receive public access requests.', [], 422);
        }

        if (! $this->requiresAccessRequest($researchRecord)) {
            return ApiResponse::error('This research record does not require an access request.', [], 422);
        }

        $email = strtolower((string) $request->validated('requester_email'));
        $duplicateExists = AccessRequest::query()
            ->where('research_id', $researchRecord->id)
            ->where('status', Statuses::ACCESS_REQUEST_PENDING)
            ->whereRaw('lower(requester_email) = ?', [$email])
            ->exists();

        if ($duplicateExists) {
            return ApiResponse::error('A pending access request already exists for this email and research record.', [
                'requester_email' => ['A pending access request already exists for this email and research record.'],
            ], 409);
        }

        $accessRequest = DB::transaction(function () use ($request, $researchRecord, $email): AccessRequest {
            $accessRequest = AccessRequest::create([
                'research_id' => $researchRecord->id,
                'agency_id' => $researchRecord->agency_id,
                'requested_by' => null,
                'requester_name' => $request->validated('requester_name'),
                'requester_email' => $email,
                'requester_affiliation' => $request->validated('requester_affiliation'),
                'purpose' => $request->validated('requester_purpose'),
                'message' => $request->validated('message'),
                'intended_use' => $request->validated('intended_use'),
                'status' => Statuses::ACCESS_REQUEST_PENDING,
                'requested_at' => now(),
            ]);

            $this->recordAuditLog($request, $researchRecord, $accessRequest);
            $this->notifyAgencyAdmins($researchRecord, $accessRequest);

            return $accessRequest;
        });

        return ApiResponse::success(
            'Access request submitted for agency review.',
            (new AccessRequestResource($accessRequest->load(['research.agency', 'requester', 'reviewer'])))->resolve($request),
            [],
            201,
        );
    }

    private function canReceivePublicRequest(Research $research): bool
    {
        return $research->status === Statuses::RESEARCH_PUBLISHED
            && $research->archived_at === null
            && $research->deleted_at === null;
    }

    private function requiresAccessRequest(Research $research): bool
    {
        return in_array($research->access_level, [
            'restricted',
            'request_required',
            'private',
            'embargo',
            'embargoed',
        ], true);
    }

    private function recordAuditLog(
        StorePublicAccessRequestRequest $request,
        Research $research,
        AccessRequest $accessRequest,
    ): void {
        try {
            AuditLog::create([
                'user_id' => null,
                'agency_id' => $research->agency_id,
                'event' => 'access_request.submitted',
                'auditable_type' => $accessRequest->getMorphClass(),
                'auditable_id' => $accessRequest->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'old_values' => null,
                'new_values' => [
                    'status' => $accessRequest->status,
                    'research_id' => $accessRequest->research_id,
                    'agency_id' => $accessRequest->agency_id,
                ],
                'metadata' => [
                    'requester_email' => $accessRequest->requester_email,
                    'research_id' => $research->id,
                    'source' => 'public_portal',
                ],
                'created_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Public access request audit log write failed.', [
                'access_request_id' => $accessRequest->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function notifyAgencyAdmins(Research $research, AccessRequest $accessRequest): void
    {
        try {
            User::query()
                ->where('agency_id', $research->agency_id)
                ->where('status', 'active')
                ->where(function (Builder $query): void {
                    $query->where('role', 'agency_admin')
                        ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
                })
                ->get()
                ->each(function (User $user) use ($research, $accessRequest): void {
                    Notification::create([
                        'user_id' => $user->id,
                        'agency_id' => $research->agency_id,
                        'type' => 'access_request.submitted',
                        'title' => 'New access request',
                        'message' => 'A public user requested access to a research record.',
                        'data' => [
                            'research_id' => $research->id,
                            'access_request_id' => $accessRequest->id,
                        ],
                        'action_url' => '/agency/access-requests',
                        'priority' => 'normal',
                        'status' => Statuses::NOTIFICATION_UNREAD,
                    ]);
                });
        } catch (Throwable $exception) {
            Log::warning('Public access request notification write failed.', [
                'access_request_id' => $accessRequest->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
