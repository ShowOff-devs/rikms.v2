import { Database } from 'lucide-react';
import type {
    PlatformSettings,
    ResearchStatus,
} from '@/types/platform-settings';
import {
    Field,
    SectionCard,
    ToggleRow,
    UnitInput,
    inputClassName,
} from './platform-settings-controls';

type ResearchRepositorySettingsProps = {
    settings: PlatformSettings['repository'];
    errors: Record<string, string>;
    onChange: (settings: Partial<PlatformSettings['repository']>) => void;
};

const statusOptions: Array<{ value: ResearchStatus; label: string }> = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending-review', label: 'Pending Review' },
    { value: 'published', label: 'Published' },
];

function parseFileTypes(value: string) {
    return value
        .split(',')
        .map((fileType) => fileType.trim().replace(/^\./, '').toUpperCase())
        .filter(Boolean);
}

export function ResearchRepositorySettings({
    settings,
    errors,
    onChange,
}: ResearchRepositorySettingsProps) {
    return (
        <SectionCard
            title="Research Repository Settings"
            icon={Database}
            iconClassName="bg-[#f3e8ff] text-[#7e22ce]"
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <Field
                    label="Maximum Upload File Size"
                    error={errors.maxUploadSizeMb}
                >
                    <UnitInput
                        value={settings.maxUploadSizeMb}
                        unit="MB"
                        onChange={(value) =>
                            onChange({
                                maxUploadSizeMb: value === '' ? 0 : value,
                            })
                        }
                    />
                </Field>
                <Field
                    label="Allowed File Types"
                    error={errors.allowedFileTypes}
                >
                    <input
                        value={settings.allowedFileTypes.join(', ')}
                        onChange={(event) =>
                            onChange({
                                allowedFileTypes: parseFileTypes(
                                    event.target.value,
                                ),
                            })
                        }
                        className={inputClassName}
                        placeholder="PDF, DOCX, XLSX"
                    />
                </Field>
                <Field
                    label="Default Research Status"
                    error={errors.defaultResearchStatus}
                >
                    <select
                        value={settings.defaultResearchStatus}
                        onChange={(event) =>
                            onChange({
                                defaultResearchStatus: event.target
                                    .value as ResearchStatus,
                            })
                        }
                        className={inputClassName}
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="mt-5">
                <div className="text-xs leading-4 font-semibold text-[#4a5565]">
                    Metadata Requirements
                </div>
                <p className="mt-2 text-xs leading-4 text-[#99a1af]">
                    Toggle required fields for research record uploads.
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-4">
                    <ToggleRow
                        title="Authors"
                        checked={settings.requireAuthors}
                        onChange={(requireAuthors) =>
                            onChange({ requireAuthors })
                        }
                    />
                    <ToggleRow
                        title="Abstract"
                        checked={settings.requireAbstract}
                        onChange={(requireAbstract) =>
                            onChange({ requireAbstract })
                        }
                    />
                    <ToggleRow
                        title="Keywords"
                        checked={settings.requireKeywords}
                        onChange={(requireKeywords) =>
                            onChange({ requireKeywords })
                        }
                    />
                    <ToggleRow
                        title="Publication Year"
                        checked={settings.requirePublicationYear}
                        onChange={(requirePublicationYear) =>
                            onChange({ requirePublicationYear })
                        }
                    />
                </div>
            </div>
        </SectionCard>
    );
}
