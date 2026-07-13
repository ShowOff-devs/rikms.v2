import { AdminProjectReportAnalyticsDetailPage } from '@/components/admin/analytics/AdminProjectReportAnalyticsDetailPage';

export default function AdminProjectReportAnalyticsShow({
    researchId,
}: {
    researchId: string;
}) {
    return <AdminProjectReportAnalyticsDetailPage researchId={researchId} />;
}
