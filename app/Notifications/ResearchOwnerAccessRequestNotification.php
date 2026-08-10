<?php

namespace App\Notifications;

use App\Support\AccessRequestMailFailureAuditor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class ResearchOwnerAccessRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(public array $data)
    {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New RIKMS access request for your research')
            ->markdown('emails.access-requests.owner-submitted', ['data' => $this->data]);
    }

    public function failed(Throwable $exception): void
    {
        try {
            app(AccessRequestMailFailureAuditor::class)->record($this->data, $exception);
        } catch (Throwable $auditException) {
            Log::warning('Queued research owner notification failure audit failed.', [
                'access_request_id' => $this->data['access_request_id'] ?? null,
                'notification_type' => $this->data['notification_type'] ?? null,
                'failure_category' => 'audit_write_failed',
                'exception_class' => $auditException::class,
            ]);
        }
    }
}
