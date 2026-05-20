import { Head } from '@inertiajs/react';
import PortalFooter from '@/components/layout/portal-footer';
import PortalNavbar from '@/components/layout/portal-navbar';
import BrowseResearch from '@/components/research/BrowseResearch';

export default function BrowseResearchPage() {
    return (
        <>
            <Head title="Browse Research" />

            <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
                <PortalNavbar activeNav="browse-research" />
                <BrowseResearch />
                <PortalFooter />
            </div>
        </>
    );
}
