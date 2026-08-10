<?php

namespace App\Services;

use App\Models\AccessRequest;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\User;
use App\Support\Statuses;
use Carbon\CarbonInterface;

class AgencyScheduledReportService
{
    /**
     * @return array<string, int|string>
     */
    public function summary(User $recipient, CarbonInterface $startsAt, CarbonInterface $endsAt): array
    {
        $agencyId = (int) $recipient->agency_id;

        $researchInPeriod = Research::query()
            ->where('agency_id', $agencyId)
            ->whereNull('archived_at')
            ->where('created_at', '>=', $startsAt)
            ->where('created_at', '<', $endsAt);

        $accessRequestsInPeriod = AccessRequest::query()
            ->where('agency_id', $agencyId)
            ->where('created_at', '>=', $startsAt)
            ->where('created_at', '<', $endsAt);

        $analyticsInPeriod = ResearchAnalyticsEvent::query()
            ->where('agency_id', $agencyId)
            ->where('occurred_at', '>=', $startsAt)
            ->where('occurred_at', '<', $endsAt);

        return [
            'recipientName' => $recipient->name,
            'agencyName' => $recipient->agency?->name ?? 'Your agency',
            'periodStart' => $startsAt->format('M j, Y'),
            'periodEnd' => $endsAt->copy()->subDay()->format('M j, Y'),
            'researchAdded' => (clone $researchInPeriod)->count(),
            'researchPublished' => Research::query()
                ->where('agency_id', $agencyId)
                ->where('status', Statuses::RESEARCH_PUBLISHED)
                ->where('published_at', '>=', $startsAt)
                ->where('published_at', '<', $endsAt)
                ->count(),
            'accessRequestsReceived' => (clone $accessRequestsInPeriod)->count(),
            'accessRequestsApproved' => AccessRequest::query()
                ->where('agency_id', $agencyId)
                ->where('status', Statuses::ACCESS_REQUEST_APPROVED)
                ->where('reviewed_at', '>=', $startsAt)
                ->where('reviewed_at', '<', $endsAt)
                ->count(),
            'accessRequestsDenied' => AccessRequest::query()
                ->where('agency_id', $agencyId)
                ->where('status', Statuses::ACCESS_REQUEST_DENIED)
                ->where('reviewed_at', '>=', $startsAt)
                ->where('reviewed_at', '<', $endsAt)
                ->count(),
            'pendingAccessRequests' => AccessRequest::query()
                ->where('agency_id', $agencyId)
                ->where('status', Statuses::ACCESS_REQUEST_PENDING)
                ->count(),
            'views' => (clone $analyticsInPeriod)->where('event_type', 'view')->count(),
            'downloads' => (clone $analyticsInPeriod)->where('event_type', 'download')->count(),
            'totalResearch' => Research::query()
                ->where('agency_id', $agencyId)
                ->whereNull('archived_at')
                ->count(),
            'totalPublishedResearch' => Research::query()
                ->where('agency_id', $agencyId)
                ->whereNull('archived_at')
                ->where('status', Statuses::RESEARCH_PUBLISHED)
                ->count(),
        ];
    }
}
