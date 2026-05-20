import { Globe2, Mail, MapPin } from 'lucide-react';
import type { FormEventHandler, ReactNode } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { AgencyProfileFormValues } from '@/types/agency-profile';

type AgencyInformationFormProps = {
    register: UseFormRegister<AgencyProfileFormValues>;
    errors: FieldErrors<AgencyProfileFormValues>;
    descriptionLength: number;
    onSubmit: FormEventHandler<HTMLFormElement>;
};

const baseInputClass =
    'h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#101828] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10';

const iconInputClass =
    'h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] pr-4 pl-10 text-sm text-[#101828] outline-none placeholder:text-[rgba(10,10,10,0.5)] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10';

export function AgencyInformationForm({
    register,
    errors,
    descriptionLength,
    onSubmit,
}: AgencyInformationFormProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Agency Information
            </h2>

            <form
                id="agency-profile-form"
                onSubmit={onSubmit}
                className="mt-5 flex flex-col gap-5"
            >
                <Field
                    label="Agency Name"
                    required
                    error={errors.agencyName?.message}
                >
                    <input
                        {...register('agencyName')}
                        aria-invalid={Boolean(errors.agencyName)}
                        className={baseInputClass}
                    />
                </Field>

                <Field
                    label="Agency Short Name"
                    required
                    error={errors.agencyShortName?.message}
                >
                    <input
                        {...register('agencyShortName')}
                        aria-invalid={Boolean(errors.agencyShortName)}
                        className={baseInputClass}
                    />
                </Field>

                <Field
                    label="Agency Description"
                    required
                    error={errors.agencyDescription?.message}
                >
                    <textarea
                        {...register('agencyDescription')}
                        aria-invalid={Boolean(errors.agencyDescription)}
                        className={`${baseInputClass} min-h-[102px] resize-none py-2.5 leading-5`}
                        placeholder="Describe your agency's mission and role..."
                    />
                    <div className="mt-1 flex justify-end text-xs leading-4 text-[#99a1af]">
                        {descriptionLength} characters
                    </div>
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                    <Field
                        label="Agency Website"
                        required
                        error={errors.agencyWebsite?.message}
                    >
                        <div className="relative">
                            <Globe2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                            <input
                                {...register('agencyWebsite')}
                                type="url"
                                aria-invalid={Boolean(errors.agencyWebsite)}
                                className={iconInputClass}
                            />
                        </div>
                    </Field>

                    <Field
                        label="Agency Contact Email"
                        required
                        error={errors.agencyContactEmail?.message}
                    >
                        <div className="relative">
                            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                            <input
                                {...register('agencyContactEmail')}
                                type="email"
                                aria-invalid={Boolean(
                                    errors.agencyContactEmail,
                                )}
                                className={iconInputClass}
                            />
                        </div>
                    </Field>
                </div>

                <Field
                    label="Agency Office Address"
                    required
                    error={errors.agencyOfficeAddress?.message}
                >
                    <div className="relative">
                        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a1af]" />
                        <input
                            {...register('agencyOfficeAddress')}
                            aria-invalid={Boolean(errors.agencyOfficeAddress)}
                            className={iconInputClass}
                        />
                    </div>
                </Field>
            </form>
        </section>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm leading-5 font-medium text-[#364153]">
                {label}{' '}
                {required ? <span className="text-[#ff6467]">*</span> : null}
            </span>
            {children}
            {error ? (
                <span className="mt-1 block text-xs leading-4 font-medium text-[#e7000b]">
                    {error}
                </span>
            ) : null}
        </label>
    );
}
