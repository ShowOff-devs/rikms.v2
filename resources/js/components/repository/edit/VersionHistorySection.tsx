import { History } from 'lucide-react';
import type { RepositoryVersion } from '@/types/repository';

export function VersionHistorySection({
    versions,
}: {
    versions: RepositoryVersion[];
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <p className="inline-flex items-center gap-2 text-[10px] leading-[15px] font-bold text-[#99a1af] uppercase">
                <History className="size-3.5" />
                Version History
            </p>
            <div className="mt-3 space-y-3">
                {versions.map((version) => (
                    <div
                        key={version.id}
                        className="border-l-2 border-[#bfdbfe] pl-3"
                    >
                        <p className="text-xs font-bold text-[#101828]">
                            {version.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-[#6a7282]">
                            {version.actor}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-4 text-[#99a1af]">
                            {new Date(version.timestamp).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
