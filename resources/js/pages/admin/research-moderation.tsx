import { Head } from '@inertiajs/react';
import { ResearchModerationPage } from '@/components/admin/research-moderation/ResearchModerationPage';

export default function ResearchModerationRoute() {
    return (
        <>
            <Head title="Research Integrity & Moderation" />
            <ResearchModerationPage />
        </>
    );
}
