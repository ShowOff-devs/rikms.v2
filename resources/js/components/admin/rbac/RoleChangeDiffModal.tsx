import { GitCompareArrows } from 'lucide-react';
import {
    formatRbacDate,
    roleChangeTypeLabels,
} from '@/components/admin/rbac/rbac-display';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { RoleChangeHistory } from '@/types/rbac';

type RoleChangeDiffModalProps = {
    change: RoleChangeHistory | null;
    onOpenChange: (open: boolean) => void;
};

export function RoleChangeDiffModal({
    change,
    onOpenChange,
}: RoleChangeDiffModalProps) {
    return (
        <Dialog open={Boolean(change)} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[12px] border-[#e5e7eb] bg-white sm:max-w-[680px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <GitCompareArrows
                            className="size-5 text-[#1e3a8a]"
                            aria-hidden="true"
                        />
                        View Changes
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Review the recorded role change summary and before/after
                        permission keys.
                    </DialogDescription>
                </DialogHeader>

                {change && (
                    <div className="space-y-4">
                        <div className="grid gap-3 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs text-[#6a7282]">Role</p>
                                <p className="mt-1 text-sm font-bold text-[#1e2939]">
                                    {change.roleName}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[#6a7282]">
                                    Change Type
                                </p>
                                <p className="mt-1 text-sm font-bold text-[#1e2939]">
                                    {roleChangeTypeLabels[change.changeType]}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[#6a7282]">
                                    Changed By
                                </p>
                                <p className="mt-1 text-sm font-bold text-[#1e2939]">
                                    {change.changedBy}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[#6a7282]">Date</p>
                                <p className="mt-1 text-sm font-bold text-[#1e2939]">
                                    {formatRbacDate(change.date)}
                                </p>
                            </div>
                        </div>

                        {change.summary && (
                            <p className="rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-sm leading-5 text-[#4a5565]">
                                {change.summary}
                            </p>
                        )}

                        {change.before || change.after ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <DiffList
                                    title="Before"
                                    items={change.before}
                                />
                                <DiffList title="After" items={change.after} />
                            </div>
                        ) : (
                            <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-5 text-sm text-[#6a7282]">
                                No field-level diff is available for this audit
                                entry.
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[8px] border border-[#e5e7eb] px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DiffList({ title, items }: { title: string; items?: string[] }) {
    return (
        <section className="rounded-[10px] border border-[#e5e7eb]">
            <div className="border-b border-[#f3f4f6] px-3 py-2">
                <h3 className="text-sm font-bold text-[#1e2939]">{title}</h3>
            </div>
            <div className="space-y-2 p-3">
                {(items ?? []).length > 0 ? (
                    items?.map((item) => (
                        <code
                            key={item}
                            className="block rounded-[6px] bg-[#f9fafb] px-2 py-1 text-xs text-[#4a5565]"
                        >
                            {item}
                        </code>
                    ))
                ) : (
                    <p className="text-sm text-[#99a1af]">No entries</p>
                )}
            </div>
        </section>
    );
}
