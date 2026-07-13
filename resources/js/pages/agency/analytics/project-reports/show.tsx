import { usePage } from '@inertiajs/react';
import { ProjectReportAnalyticsDetailPage } from '@/components/analytics/ProjectReportAnalyticsDetailPage';

export default function AgencyProjectReportAnalyticsDetailRoute() {
    const { researchId } = usePage<{ researchId: string }>().props;

    return <ProjectReportAnalyticsDetailPage researchId={researchId} />;
}
