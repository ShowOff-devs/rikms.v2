<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccessRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canViewInternalNotes = $this->canViewInternalNotes($request);
        $auditLogs = $this->resource->relationLoaded('auditLogs')
            ? $this->auditLogs
            : collect();
        $auditReview = $auditLogs->firstWhere('event', 'access_request.audit_reviewed');
        $decisionAudit = $auditLogs->first(fn ($log): bool => in_array($log->event, [
            'access_request.approved',
            'access_request.denied',
            'access_request.override_denied',
        ], true));

        return [
            'id' => $this->id,
            'research_id' => $this->research_id,
            'agency_id' => $this->agency_id,
            'requester_name' => $this->requester_name,
            'requester_email' => $this->requester_email,
            'requester_affiliation' => $this->requester_affiliation,
            'purpose' => $this->purpose,
            'message' => $this->message,
            'intended_use' => $this->intended_use,
            'status' => $this->status,
            'requested_at' => $this->requested_at?->toISOString(),
            'review_notes' => $this->when($canViewInternalNotes, $this->review_notes),
            'public_denial_reason' => $this->public_denial_reason,
            'internal_review_notes' => $this->when($canViewInternalNotes, $this->internal_review_notes),
            'access_expires_at' => $this->access_expires_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'audit_status' => $auditReview ? 'reviewed' : 'unreviewed',
            'audit_reviewed_at' => $auditReview?->created_at?->toISOString(),
            'processing_duration_seconds' => $this->reviewed_at && ($this->requested_at || $this->created_at)
                ? ($this->requested_at ?? $this->created_at)->diffInSeconds($this->reviewed_at)
                : null,
            'reviewer_ip_address' => $this->when($canViewInternalNotes, $decisionAudit?->ip_address),
            'reviewer_device' => $this->when($canViewInternalNotes, $decisionAudit?->user_agent),
            'audit_trail' => $this->when($canViewInternalNotes, fn (): array => $auditLogs
                ->map(fn ($log): array => [
                    'id' => (string) $log->id,
                    'action' => str($log->event)->after('access_request.')->replace('_', ' ')->headline()->toString(),
                    'actor' => $log->relationLoaded('user') ? ($log->user?->name ?? 'System') : 'System',
                    'timestamp' => $log->created_at?->toISOString(),
                    'notes' => $log->metadata['notes'] ?? $log->metadata['reason'] ?? null,
                ])
                ->values()
                ->all()),
            'research' => new ResearchResource($this->whenLoaded('research')),
            'requester' => new UserResource($this->whenLoaded('requester')),
            'reviewer' => new UserResource($this->whenLoaded('reviewer')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function canViewInternalNotes(Request $request): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isAgencyAdmin()
            && $user->agency_id !== null
            && (int) $user->agency_id === (int) $this->agency_id;
    }
}
