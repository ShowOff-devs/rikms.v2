<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MonitoringAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $alertSubject,
        public readonly string $alertBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->alertSubject);
    }

    public function content(): Content
    {
        return new Content(text: 'emails.monitoring-alert');
    }
}
