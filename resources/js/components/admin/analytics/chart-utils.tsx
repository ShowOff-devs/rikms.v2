import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const chartCardClassName =
    'overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]';

export function formatNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

export function ChartSection({
    title,
    description,
    icon: Icon,
    iconClassName,
    children,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    iconClassName: string;
    children: ReactNode;
}) {
    return (
        <article className={chartCardClassName}>
            <div className="flex h-[69px] items-center gap-2.5 border-b border-[#f3f4f6] px-6 py-4">
                <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[14px] ${iconClassName}`}
                >
                    <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h2 className="truncate text-sm leading-5 font-bold text-[#0f172a]">
                        {title}
                    </h2>
                    <p className="truncate text-xs leading-4 text-[#99a1af]">
                        {description}
                    </p>
                </div>
            </div>
            {children}
        </article>
    );
}

export function ChartEmptyState({
    message = 'No analytics data matches the current filters.',
}: {
    message?: string;
}) {
    return (
        <div className="flex h-full min-h-[220px] items-center justify-center rounded-[10px] border border-dashed border-[#d1d5dc] text-center text-sm text-[#6a7282]">
            {message}
        </div>
    );
}

export function chartPoints(
    values: number[],
    width: number,
    height: number,
    paddingX = 52,
    paddingY = 22,
) {
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

    return values.map((value, index) => {
        const x = paddingX + step * index;
        const y =
            paddingY + (height - paddingY * 2) * (1 - Math.min(value / max, 1));

        return { x, y };
    });
}

export function buildPath(points: Array<{ x: number; y: number }>) {
    return points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ');
}

export function axisTicks(max: number, count = 4) {
    const upper = Math.max(max, 1);
    const niceUpper = Math.ceil(upper / count) * count;

    return Array.from({ length: count + 1 }, (_, index) =>
        Math.round(niceUpper - (niceUpper / count) * index),
    );
}
