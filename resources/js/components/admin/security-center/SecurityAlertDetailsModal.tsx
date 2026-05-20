import { ShieldAlert } from 'lucide-react';
import {
    alertStatusStyles,
    severityStyles,
    toTitleCase,
} from '@/components/admin/security-center/security-center-display';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SecurityAlert } from '@/types/security-center';

type SecurityAlertDetailsModalProps = {
    alert: SecurityAlert | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAcknowledge: (id: string) => void;
    onResolve: (id: string) => void;
};

export function SecurityAlertDetailsModal({
    alert,
    open,
    onOpenChange,
    onAcknowledge,
    onResolve,
}: SecurityAlertDetailsModalProps) {
    if (!alert) {
        return null;
    }

    const severity = severityStyles[alert.severity];

    const details = [
        ['Severity', toTitleCase(alert.severity)],
        ['Status', toTitleCase(alert.status)],
        ['Timestamp', alert.timestamp],
        ['Source', alert.source],
        ['Affected User', alert.affectedUser],
        ['Affected Resource', alert.affectedResource],
        ['Source IP', alert.sourceIp],
        ['Device', alert.device],
    ].filter(([, value]) => Boolean(value));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[14px] border-[#e5e7eb] bg-white sm:max-w-[660px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <span
                            className={cn(
                                'flex size-9 items-center justify-center rounded-[10px]',
                                severity.soft,
                            )}
                        >
                            <ShieldAlert
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                        Security Alert Details
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        Review the detected security signal and recommended
                        response.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <span
                                className={cn(
                                    'inline-flex h-[24px] items-center rounded-full border px-2.5 text-[11px] font-semibold',
                                    severity.badge,
                                )}
                            >
                                {toTitleCase(alert.severity)}
                            </span>
                            <span
                                className={cn(
                                    'inline-flex h-[24px] items-center rounded-full border px-2.5 text-[11px] font-semibold',
                                    alertStatusStyles[alert.status],
                                )}
                            >
                                {toTitleCase(alert.status)}
                            </span>
                        </div>
                        <h3 className="mt-3 text-base font-bold text-[#0f172a]">
                            {alert.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-[#4a5565]">
                            {alert.description}
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:grid-cols-2">
                        {details.map(([label, value]) => (
                            <div key={label}>
                                <p className="text-[11px] font-semibold tracking-normal text-[#99a1af] uppercase">
                                    {label}
                                </p>
                                <p className="mt-1 text-sm font-medium text-[#1e2939]">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {alert.recommendedAction && (
                        <div className="rounded-[12px] border border-[#fee685] bg-[#fffbeb] p-4">
                            <p className="text-sm font-semibold text-[#92400e]">
                                Recommended Action
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#854d0e]">
                                {alert.recommendedAction}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb]"
                    >
                        Close
                    </button>
                    {alert.status === 'open' && (
                        <button
                            type="button"
                            onClick={() => onAcknowledge(alert.id)}
                            className="h-10 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white transition hover:bg-[#172554]"
                        >
                            Acknowledge
                        </button>
                    )}
                    {alert.status === 'acknowledged' && (
                        <button
                            type="button"
                            onClick={() => onResolve(alert.id)}
                            className="h-10 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-medium text-white transition hover:bg-[#172554]"
                        >
                            Mark Resolved
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
