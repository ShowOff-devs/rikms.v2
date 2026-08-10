<?php

namespace App\Services;

use App\Exceptions\DuplicatePublicAccessRequestException;
use App\Http\Requests\Public\StorePublicAccessRequestRequest;
use App\Models\AccessRequest;
use App\Models\AuditLog;
use App\Models\Research;
use App\Support\Statuses;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublicAccessRequestSubmissionService
{
    public function __construct(
        private readonly ResearchContactNotificationService $contactNotifications,
    ) {}

    public function create(StorePublicAccessRequestRequest $request, Research $research): AccessRequest
    {
        $email = AccessRequest::normalizeRequesterEmail($request->validated('requester_email'));

        if ($email === null) {
            throw new \InvalidArgumentException('Validated requester email was empty.');
        }

        $duplicateKey = AccessRequest::activeDuplicateKey($research->id, $email);

        try {
            return DB::transaction(function () use ($request, $research, $email, $duplicateKey): AccessRequest {
                $duplicateExists = AccessRequest::query()
                    ->where('research_id', $research->id)
                    ->whereIn('status', AccessRequest::activeDuplicateStatuses())
                    ->whereRaw('lower(requester_email) = ?', [$email])
                    ->exists();

                if ($duplicateExists) {
                    $this->logSecurityEvent($request, $research, 'duplicate_pending', $email);

                    throw new DuplicatePublicAccessRequestException;
                }

                $accessRequest = AccessRequest::create([
                    'research_id' => $research->id,
                    'agency_id' => $research->agency_id,
                    'requested_by' => null,
                    'requester_name' => $request->validated('requester_name'),
                    'requester_email' => $email,
                    'requester_affiliation' => $request->validated('requester_affiliation'),
                    'purpose' => $request->validated('requester_purpose'),
                    'message' => $request->validated('message'),
                    'intended_use' => $request->validated('intended_use'),
                    'status' => Statuses::ACCESS_REQUEST_PENDING,
                    'active_duplicate_key' => $duplicateKey,
                    'requested_at' => now(),
                ]);

                $this->recordAuditLog($request, $research, $accessRequest, $email);
                $this->contactNotifications->queueAccessRequestNotifications($research, $accessRequest);
                $this->logSecurityEvent($request, $research, 'created', $email);

                return $accessRequest;
            });
        } catch (DuplicatePublicAccessRequestException $exception) {
            throw $exception;
        } catch (QueryException $exception) {
            if ($this->isActiveDuplicateKeyViolation($exception)) {
                $this->logSecurityEvent($request, $research, 'duplicate_pending', $email);

                throw new DuplicatePublicAccessRequestException;
            }

            throw $exception;
        }
    }

    private function recordAuditLog(
        StorePublicAccessRequestRequest $request,
        Research $research,
        AccessRequest $accessRequest,
        string $email,
    ): void {
        try {
            AuditLog::create([
                'user_id' => null,
                'agency_id' => $research->agency_id,
                'event' => 'access_request.submitted',
                'auditable_type' => $accessRequest->getMorphClass(),
                'auditable_id' => $accessRequest->id,
                'ip_address' => $request->ip(),
                'user_agent' => $this->sanitizeUserAgent($request->userAgent()),
                'old_values' => null,
                'new_values' => [
                    'status' => $accessRequest->status,
                    'research_id' => $accessRequest->research_id,
                    'agency_id' => $accessRequest->agency_id,
                ],
                'metadata' => [
                    'requester_email_hash' => hash('sha256', $email),
                    'ip_hash' => hash('sha256', (string) $request->ip()),
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

    private function isActiveDuplicateKeyViolation(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'access_requests_active_duplicate_key_unique')
            || str_contains($message, 'access_requests.active_duplicate_key')
            || str_contains($message, 'active_duplicate_key');
    }

    private function sanitizeUserAgent(?string $userAgent): ?string
    {
        if (! is_string($userAgent) || trim($userAgent) === '') {
            return null;
        }

        return mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $userAgent) ?: '', 0, 512);
    }

    private function logSecurityEvent(
        StorePublicAccessRequestRequest $request,
        Research $research,
        string $reason,
        ?string $email,
    ): void {
        Log::notice('Public access request submission event.', [
            'reason' => $reason,
            'route' => $request->path(),
            'requester_email_hash' => $email ? hash('sha256', $email) : null,
            'ip_hash' => hash('sha256', (string) $request->ip()),
            'research_id' => $research->id,
        ]);
    }
}
