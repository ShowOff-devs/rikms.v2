import { Plus, X } from 'lucide-react';
import { AuthorEmailField } from '@/components/repository/edit/AuthorEmailField';
import type { EditDocumentErrors } from '@/components/repository/edit/EditDocumentPage';
import {
    FieldLabel,
    SectionCard,
    inputClass,
    textareaClass,
} from '@/components/repository/edit/SectionCard';
import type { RepositoryUpdatePayload } from '@/types/repository';

export function BasicInformationSection({
    form,
    errors,
    onChange,
}: {
    form: RepositoryUpdatePayload;
    errors: EditDocumentErrors;
    onChange: (patch: Partial<RepositoryUpdatePayload>) => void;
}) {
    const addKeyword = (value: string) => {
        const keyword = value.trim();

        if (!keyword || form.keywords.includes(keyword)) {
            return;
        }

        onChange({ keywords: [...form.keywords, keyword] });
    };

    return (
        <SectionCard
            eyebrow="Basic Information"
            title="Research Metadata"
            description="Core bibliographic information used across the agency repository."
        >
            <div className="grid gap-4">
                <FieldLabel label="Research Title" error={errors.title}>
                    <input
                        value={form.title}
                        onChange={(event) =>
                            onChange({ title: event.target.value })
                        }
                        className={inputClass}
                        placeholder="Enter research title"
                    />
                </FieldLabel>

                <AuthorEmailField
                    authors={form.authors}
                    errors={errors}
                    onChange={(authors) => onChange({ authors })}
                />

                <FieldLabel label="Abstract">
                    <textarea
                        value={form.abstract}
                        onChange={(event) =>
                            onChange({ abstract: event.target.value })
                        }
                        className={textareaClass}
                        placeholder="Summarize the research document"
                    />
                </FieldLabel>

                <div className="grid gap-4 md:grid-cols-2">
                    <FieldLabel label="Publication Year" error={errors.year}>
                        <input
                            type="number"
                            value={form.year}
                            onChange={(event) =>
                                onChange({ year: Number(event.target.value) })
                            }
                            className={inputClass}
                            min={1900}
                            max={2100}
                        />
                    </FieldLabel>

                    <KeywordInput onAdd={addKeyword} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {form.keywords.map((keyword) => (
                        <button
                            key={keyword}
                            type="button"
                            onClick={() =>
                                onChange({
                                    keywords: form.keywords.filter(
                                        (item) => item !== keyword,
                                    ),
                                })
                            }
                            className="inline-flex h-[24px] items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 text-[11px] font-semibold text-[#1e3a8a]"
                        >
                            {keyword}
                            <X className="size-3" />
                        </button>
                    ))}
                </div>
            </div>
        </SectionCard>
    );
}

function KeywordInput({ onAdd }: { onAdd: (keyword: string) => void }) {
    return (
        <FieldLabel label="Keywords">
            <div className="flex gap-2">
                <input
                    className={inputClass}
                    placeholder="Add keyword"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onAdd(event.currentTarget.value);
                            event.currentTarget.value = '';
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={(event) => {
                        const input =
                            event.currentTarget.parentElement?.querySelector(
                                'input',
                            );

                        if (input) {
                            onAdd(input.value);
                            input.value = '';
                        }
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1e3a8a] text-white"
                    aria-label="Add keyword"
                >
                    <Plus className="size-4" />
                </button>
            </div>
        </FieldLabel>
    );
}
