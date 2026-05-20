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
        <div className={`rounded-[14px] p-5 ${toneClasses[tone]}`}>
            <p className="text-[11px] font-bold tracking-wide uppercase opacity-70">
                {label}
            </p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
    );
}
