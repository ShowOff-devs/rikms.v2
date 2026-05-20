import { Head } from '@inertiajs/react';
import { SystemResearchPage } from '@/components/admin/system-research/SystemResearchPage';

export default function SystemResearchRoute() {
    return (
        <>
            <Head title="System Research Repository" />
            <SystemResearchPage />
        </>
    );
}
