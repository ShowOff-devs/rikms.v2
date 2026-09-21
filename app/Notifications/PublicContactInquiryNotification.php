<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublicContactInquiryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    /**
     * @param  array<string, mixed>  $inquiry
     */
    public function __construct(public array $inquiry)
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
            ->replyTo((string) $this->inquiry['email'], (string) $this->inquiry['name'])
            ->subject('RIKMS public inquiry: '.(string) $this->inquiry['subject'])
            ->markdown('emails.public-contact.inquiry', [
                'inquiry' => $this->inquiry,
                'concernLabel' => $this->concernLabel(),
            ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::warning('Queued public contact inquiry notification failed.', [
            'exception_class' => $exception::class,
        ]);
    }

    private function concernLabel(): string
    {
        return match ($this->inquiry['concern_type'] ?? '') {
            'general_inquiry' => 'General Inquiry',
            'research_discovery' => 'Research Discovery',
            'access_request_concern' => 'Access Request Concern',
            'metadata_correction' => 'Metadata Correction',
            'technical_issue' => 'Technical Issue',
            'privacy_concern' => 'Privacy Concern',
            default => 'Other',
        };
    }
}
