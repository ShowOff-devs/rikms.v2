import { Mail, Plus, Trash2, UserRound } from 'lucide-react';
import type { EditDocumentErrors } from '@/components/repository/edit/EditDocumentPage';
import {
    FieldLabel,
    inputClass,
} from '@/components/repository/edit/SectionCard';
import type { RepositoryAuthor } from '@/types/repository';

export function AuthorEmailField({
    authors,
    errors,
    onChange,
}: {
    authors: RepositoryAuthor[];
    errors: EditDocumentErrors;
    onChange: (authors: RepositoryAuthor[]) => void;
}) {
    const updateAuthor = (
        index: number,
        field: keyof RepositoryAuthor,
        value: string,
    ) => {
        onChange(
            authors.map((author, authorIndex) =>
                authorIndex === index ? { ...author, [field]: value } : author,
            ),
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <p className="text-xs leading-4 font-semibold text-[#364153]">
                    Authors
                </p>
                <button
                    type="button"
                    onClick={() =>
                        onChange([...authors, { name: '', email: '' }])
                    }
                    className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#eff6ff] px-2.5 text-xs font-semibold text-[#1e3a8a]"
                >
                    <Plus className="size-3.5" />
                    Add author
                </button>
            </div>

            {errors.authors ? (
                <p className="mt-1 text-xs leading-4 font-medium text-[#e7000b]">
                    {errors.authors}
                </p>
            ) : null}

            <div className="mt-2 space-y-3">
                {authors.map((author, index) => (
                    <div
                        key={index}
                        className="rounded-[12px] border border-[#e5e7eb] bg-[#f9fafb] p-3"
                    >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px]">
                            <FieldLabel label="Author Name">
                                <div className="relative">
                                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                                    <input
                                        value={author.name}
                                        onChange={(event) =>
                                            updateAuthor(
                                                index,
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className={`${inputClass} pl-9`}
                                        placeholder="Author name"
                                    />
                                </div>
                            </FieldLabel>
                            <FieldLabel
                                label="Author Email"
                                error={errors.authorEmails?.[index]}
                            >
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                                    <input
                                        type="email"
                                        value={author.email}
                                        onChange={(event) =>
                                            updateAuthor(
                                                index,
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        className={`${inputClass} pl-9`}
                                        placeholder="author@agency.gov"
                                    />
                                </div>
                            </FieldLabel>
                            <button
                                type="button"
                                disabled={authors.length <= 1}
                                onClick={() =>
                                    onChange(
                                        authors.filter(
                                            (_, authorIndex) =>
                                                authorIndex !== index,
                                        ),
                                    )
                                }
                                className="mt-[22px] flex size-8 items-center justify-center rounded-[8px] text-[#99a1af] hover:bg-[#fef2f2] hover:text-[#e7000b] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Remove author"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
