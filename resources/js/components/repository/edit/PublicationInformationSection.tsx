import type { EditDocumentErrors } from '@/components/repository/edit/EditDocumentPage';
import {
    FieldLabel,
    SectionCard,
    inputClass,
} from '@/components/repository/edit/SectionCard';
import type { RepositoryUpdatePayload } from '@/types/repository';

export function PublicationInformationSection({
    form,
    errors,
    onChange,
}: {
    form: RepositoryUpdatePayload;
    errors: EditDocumentErrors;
    onChange: (patch: Partial<RepositoryUpdatePayload>) => void;
}) {
    return (
        <SectionCard
            eyebrow="Publication Information"
            title="Identifiers and Institution"
            description="Review institution details and maintain external repository references."
        >
            <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Publisher / Institution">
                    <input
                        value={form.publisher}
                        className={inputClass}
                        readOnly
                        placeholder="Publisher or institution"
                    />
                </FieldLabel>
                <FieldLabel label="Agency / Contributor">
                    <input
                        value={form.agency}
                        className={inputClass}
                        readOnly
                        placeholder="Agency"
                    />
                </FieldLabel>
                <div className="md:col-span-2">
                    <FieldLabel
                        label="External Link"
                        error={errors.externalLink}
                    >
                        <input
                            value={form.externalLink ?? ''}
                            onChange={(event) =>
                                onChange({ externalLink: event.target.value })
                            }
                            className={inputClass}
                            placeholder="https://repository.example/document"
                        />
                    </FieldLabel>
                </div>
            </div>
        </SectionCard>
    );
}
