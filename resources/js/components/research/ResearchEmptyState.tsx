import { AlertCircle, SearchX } from 'lucide-react';

type ResearchEmptyStateProps = {
    title: string;
    description: string;
    tone?: 'empty' | 'error';
    actionLabel?: string;
    onAction?: () => void;
};

export default function ResearchEmptyState({
    title,
    description,
    tone = 'empty',
    actionLabel,
    onAction,
}: ResearchEmptyStateProps) {
    const Icon = tone === 'error' ? AlertCircle : SearchX;

    return (
        <div className="rounded-[14px] border border-[#f3f4f6] bg-white px-6 py-12 text-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eff6ff] text-[#1e3a8a]">
                <Icon className="size-6" />
            </div>
            <h2 className="mt-4 text-[18px] leading-7 font-semibold text-[#1e3a8a]">
                {title}
            </h2>
            <p className="mx-auto mt-2 max-w-[460px] text-sm leading-5 text-[#6b7280]">
                {description}
            </p>
            {actionLabel && onAction ? (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 h-[38px] rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white"
                >
                    {actionLabel}
                </button>
            ) : null}
        </div>
    );
}
