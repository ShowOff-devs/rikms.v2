import { Clock3, GitCompareArrows, Shield } from 'lucide-react';
import {
    formatRbacDate,
    getChangeBadgeClass,
    getRoleAccent,
    roleChangeTypeLabels,
} from '@/components/admin/rbac/rbac-display';
import type { RoleChangeHistory as RoleChangeHistoryType } from '@/types/rbac';

type RoleChangeHistoryProps = {
    changes: RoleChangeHistoryType[];
    onViewDiff: (change: RoleChangeHistoryType) => void;
};

export function RoleChangeHistory({
    changes,
    onViewDiff,
}: RoleChangeHistoryProps) {
    return (
        <section className="mt-5 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex h-[65px] items-center justify-between border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#dbeafe] text-[#1e3a8a]">
                        <Clock3 className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm font-bold text-[#101828]">
                        Role Change History
                    </h2>
                </div>
                <button
                    type="button"
                    className="text-xs font-semibold text-[#1e3a8a] transition hover:text-[#1d3478]"
                >
                    View All Activity
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                    <thead>
                        <tr className="h-10 border-b border-[#f3f4f6] bg-[#f9fafb] text-left">
                            <th className="w-[27%] px-6 text-[11px] font-semibold text-[#6a7282]">
                                Role Name
                            </th>
                            <th className="w-[16%] px-4 text-[11px] font-semibold text-[#6a7282]">
                                Changed By
                            </th>
                            <th className="w-[22%] px-4 text-[11px] font-semibold text-[#6a7282]">
                                Change Type
                            </th>
                            <th className="w-[18%] px-4 text-[11px] font-semibold text-[#6a7282]">
                                Date
                            </th>
                            <th className="w-[17%] px-6 text-right text-[11px] font-semibold text-[#6a7282]">
                                View Diff
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {changes.map((change) => (
                            <tr
                                key={change.id}
                                className="h-[59px] border-b border-[#f9fafb] transition hover:bg-[#f8fafc]"
                            >
                                <td className="px-6">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`flex size-7 items-center justify-center rounded-[10px] border ${getRoleAccent(change.roleName)}`}
                                        >
                                            <Shield
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="text-sm font-bold text-[#1e2939]">
                                            {change.roleName}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 text-xs text-[#4a5565]">
                                    {change.changedBy}
                                </td>
                                <td className="px-4">
                                    <span
                                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getChangeBadgeClass(change.changeType)}`}
                                    >
                                        {
                                            roleChangeTypeLabels[
                                                change.changeType
                                            ]
                                        }
                                    </span>
                                </td>
                                <td className="px-4">
                                    <span className="inline-flex items-center gap-1.5 text-xs text-[#6a7282]">
                                        <Clock3
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        {formatRbacDate(change.date)}
                                    </span>
                                </td>
                                <td className="px-6 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onViewDiff(change)}
                                        className="inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border border-[#1e3a8a]/15 bg-[#1e3a8a]/5 px-3 text-xs font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/10"
                                    >
                                        <GitCompareArrows
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        View Changes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
