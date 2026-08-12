<?php

namespace App\Services;

use App\Models\AccessRequest;
use App\Models\Notification as InternalNotification;
use App\Models\Research;
use App\Models\User;
use App\Notifications\ResearchOwnerAccessRequestNotification;
use App\Support\AccessRequestMailFailureAuditor;
use App\Support\Statuses;
use App\Support\UserNotificationPreferences;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Throwable;

class ResearchContactNotificationService
{
    public function queueAccessRequestNotifications(Research $research, AccessRequest $accessRequest): void
    {
        DB::afterCommit(function () use ($research, $accessRequest): void {
            $research->loadMissing('agency');

            try {
                $this->createInternalNotifications($research, $accessRequest);
            } catch (Throwable $exception) {
                Log::warning('Public access request internal notification write failed.', [
                    'access_request_id' => $accessRequest->id,
                    'exception_class' => $exception::class,
                ]);
            }

            $this->queueResearchOwnerEmail($research, $accessRequest);
        });
    }

    private function createInternalNotifications(Research $research, AccessRequest $accessRequest): void
    {
        $recipients = $this->internalRecipients($research);

        foreach ($recipients as $user) {
            $alreadyNotified = InternalNotification::query()
                ->where('user_id', $user->id)
                ->where('type', 'access_request.submitted')
                ->where('data->access_request_id', $accessRequest->id)
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            InternalNotification::create([
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
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function internalRecipients(Research $research): Collection
    {
        $ownerEmail = $this->validOwnerEmail($research);

        if ($ownerEmail === null) {
            return UserNotificationPreferences::agencyAdmins(
                (int) $research->agency_id,
                'notifyNewAccessRequests',
            );
        }

        $recipients = collect();

        if ($research->notify_owner_access_requests) {
            $owner = User::query()
                ->where('agency_id', $research->agency_id)
                ->where('status', 'active')
                ->whereRaw('lower(email) = ?', [$ownerEmail])
                ->first();

            if ($owner && UserNotificationPreferences::wants($owner, 'notifyNewAccessRequests')) {
                $recipients->push($owner);
            }
        }

        if ($research->send_owner_copy_to_admin) {
            $recipients = $recipients->concat(
                UserNotificationPreferences::agencyAdmins(
                    (int) $research->agency_id,
                    'notifyNewAccessRequests',
                ),
            );
        }

        return $recipients->unique('id')->values();
    }

    private function queueResearchOwnerEmail(Research $research, AccessRequest $accessRequest): void
    {
        if (! $research->notify_owner_access_requests) {
            return;
        }

        $ownerEmail = $this->validOwnerEmail($research);

        if ($ownerEmail === null) {
            return;
        }

        $payload = $this->ownerEmailPayload($research, $accessRequest);

        try {
            NotificationFacade::route('mail', $ownerEmail)
                ->notify(new ResearchOwnerAccessRequestNotification($payload));
        } catch (Throwable $exception) {
            Log::warning('Research owner access request email could not be queued.', [
                'access_request_id' => $accessRequest->id,
                'notification_type' => $payload['notification_type'],
                'failure_category' => 'notification_queue_failure',
                'exception_class' => $exception::class,
            ]);

            app(AccessRequestMailFailureAuditor::class)->record(
                $payload,
                $exception,
                'notification_queue_failure',
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function ownerEmailPayload(Research $research, AccessRequest $accessRequest): array
    {
        return [
            'access_request_id' => $accessRequest->id,
            'agency_id' => $research->agency_id,
            'owner_name' => $research->research_owner_name ?: 'Research Owner',
            'requester_name' => $accessRequest->requester_name,
            'requester_affiliation' => $accessRequest->requester_affiliation,
            'requester_purpose' => $accessRequest->purpose,
            'message' => $accessRequest->message,
            'research_title' => $research->title,
            'request_reference' => 'RIKMS-AR-'.$accessRequest->id,
            'submitted_at' => ($accessRequest->requested_at ?? now())
                ->timezone(config('app.timezone'))
                ->format('F j, Y g:i A T'),
            'review_url' => url('/agency/access-requests'),
            'notification_type' => 'access_request.submitted.owner.email',
            'queue' => config('queue.default'),
        ];
    }

    private function validOwnerEmail(Research $research): ?string
    {
        $email = mb_strtolower(trim((string) $research->research_owner_email));

        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false ? $email : null;
    }
}
