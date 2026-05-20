import { Check } from 'lucide-react';
import { sdgOptions } from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';

type SDGGridProps = {
    selectedSDGs: number[];
    suggestedSDGs: number[];
    onChange: (selected: number[]) => void;
};

export default function SDGGrid({
    selectedSDGs,
    suggestedSDGs,
    onChange,
}: SDGGridProps) {
    const toggle = (id: number) => {
        onChange(
            selectedSDGs.includes(id)
                ? selectedSDGs.filter((sdg) => sdg !== id)
                : [...selectedSDGs, id],
        );
    };

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sdgOptions.map((sdg) => {
                const selected = selectedSDGs.includes(sdg.id);
                const suggested = suggestedSDGs.includes(sdg.id);

                return (
                    <button
                        key={sdg.id}
                        type="button"
                        onClick={() => toggle(sdg.id)}
                        className={cn(
                            'min-h-[92px] rounded-[14px] border p-4 text-left transition-colors',
                            selected
                                ? 'border-transparent text-white shadow-sm'
                                : 'border-[#e5e7eb] bg-white text-[#1e2939] hover:border-[#bfdbfe]',
                        )}
                        style={{
                            backgroundColor: selected ? sdg.color : undefined,
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-lg font-bold">
                                    SDG {sdg.id}
                                </p>
                                <p className="mt-1 text-xs leading-5 font-semibold">
                                    {sdg.name}
                                </p>
                            </div>
                            {selected ? (
                                <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                                    <Check className="size-4" />
                                </span>
                            ) : null}
                        </div>
                        {suggested ? (
                            <span
                                className={cn(
                                    'mt-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
                                    selected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[#f5f3ff] text-[#7c3aed]',
                                )}
                            >
                                AI Suggested
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
