<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResearchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'agency_id' => $this->agency_id,
            'revision_parent_id' => $this->revision_parent_id,
            'superseded_by_id' => $this->superseded_by_id,
            'revision_number' => (int) ($this->revision_number ?? 1),
            'title' => $this->title,
            'abstract' => $this->abstract,
            'authors' => $this->authors ?? [],
            'publication_year' => $this->publication_year,
            'category' => $this->category,
            'sdgs' => $this->sdgs ?? [],
            'keywords' => $this->keywords ?? [],
            'public_metadata' => $this->public_metadata ?? [],
            'public_metadata_fields' => $this->public_metadata_fields ?? [],
            'status' => $this->status,
            'moderation_issue_type' => $this->whenLoaded(
                'latestModerationDecision',
                fn (): ?string => $this->latestModerationDecision?->issue_type,
            ),
            'moderation_decision_status' => $this->whenLoaded(
                'latestModerationDecision',
                fn (): ?string => $this->latestModerationDecision?->status,
            ),
            'moderation_note' => $this->whenLoaded(
                'latestModerationDecision',
                fn (): ?string => $this->latestModerationDecision?->remarks,
            ),
            'moderated_at' => $this->whenLoaded(
                'latestModerationDecision',
                fn (): ?string => $this->latestModerationDecision?->reviewed_at?->toISOString(),
            ),
            'moderation_reviewer_name' => $this->whenLoaded(
                'latestModerationDecision',
                fn (): ?string => $this->latestModerationDecision?->relationLoaded('reviewer')
                    ? $this->latestModerationDecision?->reviewer?->name
                    : null,
            ),
            'revision_required' => $this->status === 'rejected',
            'capabilities' => [
                'can_update' => $request->user()?->can('updateAgencyDraft', $this->resource) ?? false,
                'can_submit' => $request->user()?->can('submit', $this->resource) ?? false,
            ],
            'access_level' => $this->access_level,
            'downloads' => (int) $this->downloads,
            'views' => (int) ($this->views_count ?? 0),
            'document_type' => $this->documentType(),
            'embargo_until' => $this->embargo_until?->toDateString(),
            'external_url' => $this->external_url,
            'research_owner_name' => $this->research_owner_name,
            'research_owner_email' => $this->research_owner_email,
            'notify_owner_access_requests' => (bool) $this->notify_owner_access_requests,
            'notify_owner_research_inquiries' => (bool) $this->notify_owner_research_inquiries,
            'send_owner_copy_to_admin' => (bool) $this->send_owner_copy_to_admin,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'archived_by' => $this->archived_by,
            'archive_reason' => $this->archive_reason,
            'restored_at' => $this->restored_at?->toISOString(),
            'restored_by' => $this->restored_by,
            'agency' => new AgencyResource($this->whenLoaded('agency')),
            'uploader' => new UserResource($this->whenLoaded('uploader')),
            'archived_by_user' => new UserResource($this->whenLoaded('archivedBy')),
            'restored_by_user' => new UserResource($this->whenLoaded('restoredBy')),
            'files' => ResearchFileResource::collection($this->whenLoaded('files')),
            'report_detail' => new ResearchReportDetailResource($this->whenLoaded('reportDetail')),
            'performance_items' => ResearchPerformanceItemResource::collection($this->whenLoaded('performanceItems')),
            'report_highlights' => ResearchReportHighlightResource::collection($this->whenLoaded('reportHighlights')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function documentType(): string
    {
        $category = str((string) $this->category)->lower()->toString();
        $fileTypes = $this->resource->relationLoaded('files')
            ? $this->files
                ->where('status', '!=', 'deleted')
                ->whereNull('archived_at')
                ->pluck('file_type')
            : collect();

        if ($fileTypes->contains('terminal-report') || str_contains($category, 'terminal report')) {
            return 'terminal-report';
        }

        if ($fileTypes->contains('project-accomplishment') || str_contains($category, 'project accomplishment')) {
            return 'project-accomplishment';
        }

        return 'research-study';
    }
}
