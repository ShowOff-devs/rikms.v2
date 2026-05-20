import { Head } from '@inertiajs/react';
import { AdminArchivePage } from '@/components/admin/archive/AdminArchivePage';

export default function AdminArchiveRoute() {
    return (
        <>
            <Head title="Archive & Data Recovery" />
            <AdminArchivePage />
        </>
    );
}
