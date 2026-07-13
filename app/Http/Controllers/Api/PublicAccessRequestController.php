<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DuplicatePublicAccessRequestException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Models\Research;
use App\Services\PlatformSettingsService;
use App\Services\PublicAccessRequestCaptchaVerifier;
use App\Services\PublicAccessRequestSubmissionService;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class PublicAccessRequestController extends Controller
{
    public function __construct(
        private readonly PublicAccessRequestSubmissionService $submissions,
        private readonly PublicAccessRequestCaptchaVerifier $captcha,
        private readonly PlatformSettingsService $settings,
    ) {}

    public function store(StorePublicAccessRequestRequest $request, string $research): JsonResponse
    {
        if (! $this->publicAccessRequestsEnabled()) {
            return ApiResponse::error('Public access requests are currently unavailable.', [
                'code' => 'PUBLIC_ACCESS_REQUESTS_DISABLED',
            ], 503);
        }

        $researchRecord = Research::query()
            ->with('agency')
            ->where(function (Builder $query) use ($research): void {
                $query->where('slug', $research);

                if (ctype_digit($research)) {
                    $query->orWhere('id', (int) $research);
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

        if (! $this->captcha->verify($request)) {
            throw ValidationException::withMessages([
                'captcha_token' => ['We could not verify the submission. Please try again.'],
            ]);
        }

        try {
            $accessRequest = $this->submissions->create($request, $researchRecord);
        } catch (DuplicatePublicAccessRequestException) {
            return ApiResponse::error('An active access request already exists for this research record.', [
                'requester_email' => ['You already have an active request for this research record.'],
                'code' => 'ACCESS_REQUEST_ALREADY_PENDING',
            ], 409);
        }

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
            && $research->deleted_at === null
            && $research->access_level !== 'private';
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

    private function publicAccessRequestsEnabled(): bool
    {
        return $this->settings->accessRequestsEnabled();
    }
}
