import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type TagOption<TValue extends string> = {
    value: TValue;
    label: string;
};

type TagSelectorProps<TValue extends string> = {
    options: TagOption<TValue>[];
    selected: TValue[];
    onChange: (selected: TValue[]) => void;
    tone?: 'blue' | 'violet' | 'green';
};

const toneClasses = {
    blue: {
        selected: 'border-[#1e3a8a] bg-[#eff6ff] text-[#1e3a8a]',
        icon: 'bg-[#1e3a8a]',
    },
    violet: {
        selected: 'border-[#7c3aed] bg-[#f5f3ff] text-[#7c3aed]',
        icon: 'bg-[#7c3aed]',
    },
    green: {
        selected: 'border-[#00a63e] bg-[#f0fdf4] text-[#008236]',
        icon: 'bg-[#00a63e]',
    },
};

export default function TagSelector<TValue extends string>({
    options,
    selected,
    onChange,
    tone = 'blue',
}: TagSelectorProps<TValue>) {
    const toggle = (value: TValue) => {
        onChange(
            selected.includes(value)
                ? selected.filter((item) => item !== value)
                : [...selected, value],
        );
    };

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const isSelected = selected.includes(option.value);

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => toggle(option.value)}
                        className={cn(
                            'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            isSelected
                                ? toneClasses[tone].selected
                                : 'border-[#e5e7eb] bg-white text-[#4a5565] hover:border-[#bfdbfe]',
                        )}
                    >
                        {isSelected ? (
                            <span
                                className={cn(
                                    'flex size-4 items-center justify-center rounded-full text-white',
                                    toneClasses[tone].icon,
                                )}
                            >
                                <Check className="size-3" />
                            </span>
                        ) : null}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
