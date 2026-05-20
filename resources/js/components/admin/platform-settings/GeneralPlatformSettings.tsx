import { Building2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import type { PlatformSettings } from '@/types/platform-settings';
import {
    Field,
    SectionCard,
    inputClassName,
} from './platform-settings-controls';

type GeneralPlatformSettingsProps = {
    settings: PlatformSettings['general'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['general']>) => void;
    onLogoChange: (file: File | null) => void;
};

const languageOptions = ['English', 'Filipino', 'Cebuano'];

const timezoneOptions = [
    'Asia/Manila (UTC+8)',
    'Asia/Shanghai (UTC+8)',
    'UTC',
];

export function GeneralPlatformSettings({
    settings,
    errors,
    onChange,
    onLogoChange,
}: GeneralPlatformSettingsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
        onLogoChange(event.target.files?.[0] ?? null);
        event.target.value = '';
    };

    return (
        <SectionCard
            title="General Platform Settings"
            icon={Building2}
            iconClassName="bg-[#eef2ff] text-[#4338ca]"
        >
            <div className="grid gap-5 lg:grid-cols-2">
                <Field label="System Name" error={errors.systemName}>
                    <input
                        value={settings.systemName}
                        onChange={(event) =>
                            onChange({ systemName: event.target.value })
                        }
                        className={inputClassName}
                    />
                </Field>
                <Field label="System Short Name" error={errors.shortName}>
                    <input
                        value={settings.shortName}
                        onChange={(event) =>
                            onChange({ shortName: event.target.value })
                        }
                        className={inputClassName}
                    />
                </Field>
            </div>

            <div className="mt-5">
                <Field label="System Logo" error={errors.platformLogoUrl}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex size-16 items-center justify-center overflow-hidden rounded-[14px] bg-[#1e3a8a] text-lg font-bold text-white">
                            {settings.platformLogoUrl ? (
                                <img
                                    src={settings.platformLogoUrl}
                                    alt="Platform logo preview"
                                    className="size-full object-cover"
                                />
                            ) : (
                                settings.shortName.slice(0, 1) || 'R'
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                className="hidden"
                                onChange={handleLogoSelect}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#364153] transition hover:bg-[#f9fafb]"
                            >
                                <Upload
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Upload Logo
                            </button>
                            <span className="text-xs leading-4 text-[#99a1af]">
                                PNG, SVG, or JPG. Max 2MB.
                            </span>
                        </div>
                    </div>
                </Field>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Field label="Default Language">
                    <select
                        value={settings.defaultLanguage}
                        onChange={(event) =>
                            onChange({ defaultLanguage: event.target.value })
                        }
                        className={inputClassName}
                    >
                        {languageOptions.map((language) => (
                            <option key={language} value={language}>
                                {language}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Timezone">
                    <select
                        value={settings.timezone}
                        onChange={(event) =>
                            onChange({ timezone: event.target.value })
                        }
                        className={inputClassName}
                    >
                        {timezoneOptions.map((timezone) => (
                            <option key={timezone} value={timezone}>
                                {timezone}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
        </SectionCard>
    );
}
