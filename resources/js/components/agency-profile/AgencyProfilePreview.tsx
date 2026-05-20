import { Building2, ExternalLink, Mail } from 'lucide-react';
import type {
    AgencyLogoState,
    AgencyProfileFormValues,
} from '@/types/agency-profile';

type AgencyProfilePreviewProps = {
    values: AgencyProfileFormValues;
    logoState: AgencyLogoState;
};

export function AgencyProfilePreview({
    values,
    logoState,
}: AgencyProfilePreviewProps) {
    const visibleLogoUrl = logoState.logoPreviewUrl ?? logoState.logoUrl;
    const agencyName = values.agencyName.trim() || 'Agency name';
    const shortName = values.agencyShortName.trim() || 'Short name';
    const description =
        values.agencyDescription.trim() ||
        'Agency description will appear here once it is added.';
    const website = values.agencyWebsite.trim();
    const contactEmail = values.agencyContactEmail.trim();

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="text-sm leading-5 font-bold text-[#1e3a8a]">
                Profile Preview
            </h2>
            <p className="mt-0.5 text-xs leading-4 text-[#99a1af]">
                How your agency appears on the public portal.
            </p>

            <div className="mt-5 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
                <div className="h-[68px] bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]" />
                <div className="px-4 pb-4">
                    <div className="-mt-7 flex size-14 items-center justify-center rounded-[10px] border-4 border-white bg-[#f9fafb] shadow-[0px_1px_3px_rgba(0,0,0,0.12)]">
                        {visibleLogoUrl ? (
                            <img
                                src={visibleLogoUrl}
                                alt=""
                                className="size-full rounded-[8px] object-contain p-1"
                            />
                        ) : (
                            <Building2 className="size-7 text-[#1e3a8a]" />
                        )}
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-sm leading-5 font-bold text-[#1e2939]">
                        {agencyName}
                    </h3>
                    <span className="mt-2 inline-flex h-[19px] items-center rounded-[4px] bg-[rgba(30,58,138,0.1)] px-2 text-[10px] leading-[15px] font-bold text-[#1e3a8a]">
                        {shortName}
                    </span>
                    <p className="mt-3 line-clamp-4 text-xs leading-4 text-[#6a7282]">
                        {description}
                    </p>

                    <div className="mt-4 space-y-2 text-xs leading-4">
                        {website ? (
                            <a
                                href={website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-1.5 font-medium text-[#1e3a8a]"
                            >
                                <ExternalLink className="size-3.5 shrink-0" />
                                <span className="truncate">
                                    {website.replace(/^https?:\/\//, '')}
                                </span>
                            </a>
                        ) : null}
                        {contactEmail ? (
                            <p className="flex min-w-0 items-center gap-1.5 text-[#4a5565]">
                                <Mail className="size-3.5 shrink-0 text-[#99a1af]" />
                                <span className="truncate">{contactEmail}</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
