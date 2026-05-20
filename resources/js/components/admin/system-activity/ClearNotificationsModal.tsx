import { BellOff, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    ClearNotificationsScope,
    NotificationTabValue,
} from '@/types/system-activity';

type ClearNotificationsModalProps = {
    open: boolean;
    isClearing: boolean;
    selectedCategory: NotificationTabValue;
    visibleCount: number;
    readCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: (scope: ClearNotificationsScope) => Promise<void>;
};

const scopeOptions: {
    value: ClearNotificationsScope;
    label: string;
    description: string;
}[] = [
    {
        value: 'all',
        label: 'Clear all notifications',
        description: 'Remove every system notification from this list.',
    },
    {
        value: 'read',
        label: 'Clear only read notifications',
        description: 'Keep unread notifications visible for follow-up.',
    },
    {
        value: 'current-category',
        label: 'Clear current filtered category',
        description: 'Remove only notifications visible in the selected tab.',
    },
];

export function ClearNotificationsModal({
    open,
    isClearing,
    selectedCategory,
    visibleCount,
    readCount,
    onOpenChange,
    onConfirm,
}: ClearNotificationsModalProps) {
    const [scope, setScope] = useState<ClearNotificationsScope>('read');

    const isConfirmDisabled =
        isClearing ||
        (scope === 'read' && readCount === 0) ||
        (scope === 'current-category' && visibleCount === 0);

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setScope('read');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-[14px] border-[#fecaca] bg-white sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#111827]">
                        <BellOff
                            className="size-5 text-[#dc2626]"
                            aria-hidden="true"
                        />
                        Clear Notifications?
                    </DialogTitle>
                    <DialogDescription className="text-[#6a7282]">
                        This will remove the visible system notifications from
                        the notification list. Activity logs will not be
                        deleted.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-[12px] border border-[#fee685] bg-[#fffbeb] p-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck
                            className="mt-0.5 size-5 text-[#bb4d00]"
                            aria-hidden="true"
                        />
                        <div>
                            <p className="text-sm font-semibold text-[#713f12]">
                                Audit records remain intact
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#854d0e]">
                                Clearing notifications only changes the visible
                                notification list. Activity logs and timeline
                                events remain available for compliance review.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-2">
                    {scopeOptions.map((option) => {
                        const disabled =
                            (option.value === 'read' && readCount === 0) ||
                            (option.value === 'current-category' &&
                                visibleCount === 0);

                        return (
                            <label
                                key={option.value}
                                className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e5e7eb] p-3 transition hover:bg-[#f9fafb] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                            >
                                <input
                                    type="radio"
                                    name="clear-notification-scope"
                                    value={option.value}
                                    checked={scope === option.value}
                                    disabled={disabled}
                                    onChange={() => setScope(option.value)}
                                    className="mt-1 size-4 accent-[#dc2626]"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-[#1e2939]">
                                        {option.label}
                                    </span>
                                    <span className="block text-xs leading-5 text-[#6a7282]">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>

                <p className="text-xs text-[#6a7282]">
                    Current tab:{' '}
                    <span className="font-semibold text-[#1e2939]">
                        {selectedCategory === 'all'
                            ? 'All Notifications'
                            : selectedCategory}
                    </span>{' '}
                    ({visibleCount} visible, {readCount} read)
                </p>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isClearing}
                        className="h-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#4a5565] transition hover:bg-[#f9fafb] disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(scope)}
                        disabled={isConfirmDisabled}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dc2626] px-4 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isClearing ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <BellOff className="size-4" aria-hidden="true" />
                        )}
                        Clear Notifications
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
