import type { EditDocumentErrors } from '@/components/repository/edit/EditDocumentPage';
import {
    FieldLabel,
    SectionCard,
    inputClass,
} from '@/components/repository/edit/SectionCard';
import {
    repositoryCategoryColors,
    repositorySdgColors,
} from '@/data/repository-display';
import type { RepositoryUpdatePayload } from '@/types/repository';

const sdgOptions = Array.from({ length: 17 }, (_, index) => `SDG ${index + 1}`);
const categoryOptions = Object.keys(repositoryCategoryColors);

export function ResearchClassificationSection({
    form,
    errors,
    onChange,
}: {
    form: RepositoryUpdatePayload;
    errors: EditDocumentErrors;
    onChange: (patch: Partial<RepositoryUpdatePayload>) => void;
}) {
    const toggleSdg = (sdg: string) => {
        onChange({
            sdgs: form.sdgs.includes(sdg)
                ? form.sdgs.filter((item) => item !== sdg)
                : [...form.sdgs, sdg],
        });
    };

    return (
        <SectionCard
            eyebrow="Research Classification"
            title="Category and SDG Tags"
            description="Classify the document for analytics, discovery, and reporting."
        >
            <div className="grid gap-4">
                <FieldLabel label="Research Category" error={errors.category}>
                    <select
                        value={form.category}
                        onChange={(event) =>
                            onChange({ category: event.target.value })
                        }
                        className={inputClass}
                    >
                        {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </FieldLabel>

                <div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs leading-4 font-semibold text-[#364153]">
                            SDG Tags
                        </p>
                        {errors.sdgs ? (
                            <p className="text-xs font-medium text-[#e7000b]">
                                {errors.sdgs}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sdgOptions.map((sdg) => {
                            const isSelected = form.sdgs.includes(sdg);

                            return (
                                <button
                                    key={sdg}
                                    type="button"
                                    onClick={() => toggleSdg(sdg)}
                                    className="flex h-9 items-center gap-2 rounded-[10px] border px-3 text-left text-xs font-semibold"
                                    style={{
                                        borderColor: isSelected
                                            ? (repositorySdgColors[sdg] ??
                                              '#1e3a8a')
                                            : '#e5e7eb',
                                        backgroundColor: isSelected
                                            ? '#f9fafb'
                                            : '#ffffff',
                                        color: isSelected
                                            ? (repositorySdgColors[sdg] ??
                                              '#1e3a8a')
                                            : '#4a5565',
                                    }}
                                >
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{
                                            backgroundColor:
                                                repositorySdgColors[sdg] ??
                                                '#1e3a8a',
                                        }}
                                    />
                                    {sdg}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
