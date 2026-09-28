import type { LucideIcon } from 'lucide-react';
import { Check, Monitor, MonitorCog, Moon, Sun } from 'lucide-react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { SuperAdminAccountSettingsLayout } from './SuperAdminAccountSettingsLayout';

const options: {
    value: Appearance;
    label: string;
    description: string;
    icon: LucideIcon;
}[] = [
    {
        value: 'light',
        label: 'Light',
        description: 'A bright interface for well-lit environments.',
        icon: Sun,
    },
    {
        value: 'dark',
        label: 'Dark',
        description: 'A low-light interface that reduces screen glare.',
        icon: Moon,
    },
    {
        value: 'system',
        label: 'Use system setting',
        description: 'Automatically match your device appearance.',
        icon: Monitor,
    },
];

export function SuperAdminAppearancePage() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <SuperAdminAccountSettingsLayout
            activePage="appearance"
            eyebrow="Personal preferences"
            title="Appearance"
            description="Choose how the RIKMS administration interface looks on this device."
        >
            <section className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-3 border-b border-[#f3f4f6] p-5 sm:p-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#4338ca]">
                        <MonitorCog className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-[#101828]">
                            Interface theme
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[#6a7282]">
                            Your selection is saved for this browser and applied
                            immediately.
                        </p>
                    </div>
                </div>

                <div className="p-5 sm:p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        {options.map((option) => {
                            const isSelected = appearance === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        updateAppearance(option.value)
                                    }
                                    aria-pressed={isSelected}
                                    className={cn(
                                        'relative rounded-[14px] border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 focus-visible:outline-none',
                                        isSelected
                                            ? 'border-[#1e3a8a] bg-[#eef2ff] shadow-[0_0_0_1px_#1e3a8a]'
                                            : 'border-[#e5e7eb] bg-white hover:border-[#c7d2fe] hover:bg-[#f9fafb]',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-[10px]',
                                            isSelected
                                                ? 'bg-[#1e3a8a] text-white'
                                                : 'bg-[#f3f4f6] text-[#4a5565]',
                                        )}
                                    >
                                        <option.icon className="size-5" />
                                    </span>
                                    {isSelected ? (
                                        <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-[#1e3a8a] text-white">
                                            <Check className="size-3" />
                                        </span>
                                    ) : null}
                                    <span className="mt-4 block text-sm font-bold text-[#101828]">
                                        {option.label}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[#6a7282]">
                                        {option.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:p-5">
                        <p className="text-xs font-bold tracking-[0.08em] text-[#6a7282] uppercase">
                            Preview
                        </p>
                        <div className="mt-3 overflow-hidden rounded-[12px] border border-[#d1d5dc] bg-white shadow-sm">
                            <div className="flex h-8 items-center gap-1.5 bg-[#0f172a] px-3">
                                <span className="size-2 rounded-full bg-[#fb2c36]" />
                                <span className="size-2 rounded-full bg-[#ffb900]" />
                                <span className="size-2 rounded-full bg-[#22c55e]" />
                            </div>
                            <div className="flex h-36">
                                <div className="w-16 bg-[#0f172a] p-2">
                                    <div className="h-3 rounded bg-[#ffb900]/50" />
                                    <div className="mt-3 space-y-2">
                                        <div className="h-2 rounded bg-white/20" />
                                        <div className="h-2 rounded bg-white/10" />
                                        <div className="h-2 rounded bg-white/10" />
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#f3f4f6] p-4 dark:bg-[#111827]">
                                    <div className="h-3 w-24 rounded bg-[#1e3a8a]/25 dark:bg-white/25" />
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div className="h-16 rounded-lg border border-[#e5e7eb] bg-white dark:border-white/10 dark:bg-[#1f2937]" />
                                        <div className="h-16 rounded-lg border border-[#e5e7eb] bg-white dark:border-white/10 dark:bg-[#1f2937]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-xs text-[#6a7282]">
                        <Check className="size-4 text-[#008236]" />
                        Preference saved automatically
                    </div>
                </div>
            </section>
        </SuperAdminAccountSettingsLayout>
    );
}
