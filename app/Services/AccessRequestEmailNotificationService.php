<?php

namespace App\Services;

use App\Models\AccessRequest;
use App\Notifications\AccessRequestApprovedNotification;
use App\Notifications\AccessRequestDeniedNotification;
use App\Support\AccessRequestEmailNotificationResult;
use App\Support\AccessRequestMailFailureAuditor;
use App\Support\Statuses;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Throwable;

class AccessRequestEmailNotificationService
{
    public function queueDecisionNotificationAfterCommit(
        AccessRequest $accessRequest,
        string $status,
    ): AccessRequestEmailNotificationResult {
        $accessRequest->loadMissing(['research.agency', 'requester', 'agency']);

        $email = $this->recipientEmail($accessRequest);

        if ($email === null) {
            Log::warning('Access request email notification skipped because requester email is missing or invalid.', [
                'access_request_id' => $accessRequest->id,
                'status' => $status,
                'failure_category' => 'invalid_recipient',
            ]);

            return new AccessRequestEmailNotificationResult('skipped');
        }

        $result = new AccessRequestEmailNotificationResult('queued');
        $payload = $this->payload($accessRequest, $status, $email);

        DB::afterCommit(function () use ($email, $payload, $result, $status): void {
            try {
                $notification = $status === Statuses::ACCESS_REQUEST_APPROVED
                    ? new AccessRequestApprovedNotification($payload)
                    : new AccessRequestDeniedNotification($payload);

                $this->dispatchNotification($email, $notification);
            } catch (Throwable $exception) {
                $result->status = 'failed_to_queue';
                $this->recordFailure($payload, $exception, 'notification_queue_failure');
            }
        });

        return $result;
    }

    protected function dispatchNotification(string $email, object $notification): void
    {
        NotificationFacade::route('mail', $email)->notify($notification);
    }

    private function recipientEmail(AccessRequest $accessRequest): ?string
    {
        $email = $accessRequest->requester_email ?: $accessRequest->requester?->email;

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return null;
        }

        return $email;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(AccessRequest $accessRequest, string $status, string $email): array
    {
        $research = $accessRequest->research;
        $agency = $research?->agency ?? $accessRequest->agency;
        $processedAt = $accessRequest->reviewed_at ?? now();
        $researchIdentifier = $research?->slug ?: $accessRequest->research_id;
        $accessExpiresAt = $accessRequest->access_expires_at;

        return [
            'access_request_id' => $accessRequest->id,
            'agency_id' => $accessRequest->agency_id,
            'decision_status' => $status,
            'requester_name' => $accessRequest->requester_name ?: $accessRequest->requester?->name ?: 'Requester',
            'research_title' => $research?->title ?: 'Requested research record',
            'request_reference' => 'RIKMS-AR-'.$accessRequest->id,
            'agency_name' => $agency?->short_name ?: $agency?->name ?: 'the responsible agency',
            'status' => $status === Statuses::ACCESS_REQUEST_APPROVED ? 'Approved' : 'Denied',
            'processed_at' => $processedAt->timezone(config('app.timezone'))->format('F j, Y g:i A T'),
            'expires_at' => $accessExpiresAt?->timezone(config('app.timezone'))->format('F j, Y g:i A T'),
            'denial_reason' => $status === Statuses::ACCESS_REQUEST_DENIED ? $accessRequest->public_denial_reason : null,
            'access_url' => route('research.show', $researchIdentifier),
            'support_email' => config('mail.from.address'),
            'support_url' => route('contact'),
            'notification_type' => 'access_request.'.$status.'.email',
            'requester_email_domain' => $this->emailDomain($email),
            'queue' => config('queue.default'),
        ];
    }

    private function emailDomain(string $email): ?string
    {
        $domain = str($email)->after('@')->lower()->trim()->toString();

        return $domain !== '' ? $domain : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function recordFailure(array $payload, Throwable $exception, string $category): void
    {
        Log::warning('Access request email notification dispatch failed.', [
            'access_request_id' => $payload['access_request_id'] ?? null,
            'notification_type' => $payload['notification_type'] ?? null,
            'failure_category' => $category,
            'exception_class' => $exception::class,
        ]);

        try {
            app(AccessRequestMailFailureAuditor::class)->record($payload, $exception, $category);
        } catch (Throwable $auditException) {
            Log::warning('Access request email failure audit log write failed.', [
                'access_request_id' => $payload['access_request_id'] ?? null,
                'failure_category' => 'audit_write_failed',
                'exception_class' => $auditException::class,
            ]);
        }
    }
}
