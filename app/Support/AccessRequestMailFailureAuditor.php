<?php

namespace App\Support;

use App\Models\AccessRequest;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;
use Throwable;

class AccessRequestMailFailureAuditor
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function record(array $data, Throwable $exception, ?string $category = null): void
    {
        try {
            AuditLog::create([
                'user_id' => null,
                'agency_id' => $data['agency_id'] ?? null,
                'event' => 'access_request.email_notification_failed',
                'auditable_type' => (new AccessRequest)->getMorphClass(),
                'auditable_id' => $data['access_request_id'] ?? null,
                'old_values' => null,
                'new_values' => null,
                'metadata' => [
                    'notification_type' => $data['notification_type'] ?? null,
                    'decision_status' => $data['decision_status'] ?? null,
                    'failure_category' => $category ?? $this->classify($exception),
                    'exception_class' => $exception::class,
                    'requester_email_domain' => $data['requester_email_domain'] ?? null,
                    'failed_at' => now()->toISOString(),
                    'queue' => $data['queue'] ?? 'default',
                ],
                'created_at' => now(),
            ]);
        } catch (Throwable $auditException) {
            Log::warning('Access request email failure audit log write failed.', [
                'access_request_id' => $data['access_request_id'] ?? null,
                'notification_type' => $data['notification_type'] ?? null,
                'failure_category' => 'audit_write_failed',
                'exception_class' => $auditException::class,
            ]);
        }
    }

    public function classify(Throwable $exception): string
    {
        $class = strtolower($exception::class);

        if (str_contains($class, 'transport') || str_contains($class, 'smtp')) {
            return 'mail_transport_failure';
        }

        if (str_contains($class, 'address') || str_contains($class, 'recipient')) {
            return 'invalid_recipient';
        }

        return 'notification_job_failure';
    }
}
