type FinancialSummaryCardProps = {
    label: string;
    value: string;
    tone: 'blue' | 'green' | 'violet' | 'red';
};

const toneClasses = {
    blue: 'bg-[#eff6ff] text-[#1e3a8a]',
    green: 'bg-[#f0fdf4] text-[#00a63e]',
    violet: 'bg-[#f5f3ff] text-[#7c3aed]',
    red: 'bg-[#fff1f2] text-[#fb2c36]',
};

export default function FinancialSummaryCard({
    label,
    value,
    tone,
}: FinancialSummaryCardProps) {
    return (
        <div
            className={`[container-type:inline-size] min-w-0 overflow-hidden rounded-[14px] p-4 ${toneClasses[tone]}`}
        >
            <p className="text-[11px] font-bold tracking-wide uppercase opacity-70">
                {label}
            </p>
            <p
                className="mt-2 max-w-full overflow-hidden text-[clamp(1rem,12cqi,1.5rem)] leading-tight font-bold text-ellipsis whitespace-nowrap tabular-nums"
                title={value}
            >
                {value}
            </p>
        </div>
    );
}
