import { Building2, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import type { AgencyLogoState } from '@/types/agency-profile';

type AgencyLogoSectionProps = {
    logoState: AgencyLogoState;
    onLogoSelected: (file: File) => void;
    onRemoveLogo: () => void;
};

const acceptedLogoTypes =
    '.png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg';

export function AgencyLogoSection({
    logoState,
    onLogoSelected,
    onRemoveLogo,
}: AgencyLogoSectionProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const visibleLogoUrl = logoState.logoPreviewUrl ?? logoState.logoUrl;

    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pt-[25px] pb-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <h2 className="border-b border-[#f3f4f6] pb-2 text-[14.4px] leading-[21.6px] font-bold text-[#1e3a8a]">
                Agency Logo
            </h2>

            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex size-28 shrink-0 items-center justify-center rounded-[14px] border-2 border-dashed border-[#e5e7eb] bg-[#f9fafb] p-0.5">
                    <div className="flex size-[108px] items-center justify-center overflow-hidden rounded-[12px] bg-[rgba(30,58,138,0.1)]">
                        {visibleLogoUrl ? (
                            <img
                                src={visibleLogoUrl}
                                alt="Agency logo preview"
                                className="size-full object-contain p-2"
                            />
                        ) : (
                            <Building2 className="size-12 text-[#1e3a8a]" />
                        )}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={acceptedLogoTypes}
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    onLogoSelected(file);
                                }

                                event.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white hover:bg-[#172f73]"
                        >
                            <Upload className="size-4" />
                            Upload New Logo
                        </button>
                        <button
                            type="button"
                            onClick={onRemoveLogo}
                            className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-[#ffc9c9] bg-[#fef2f2] px-4 text-sm leading-5 font-medium text-[#e7000b] hover:bg-[#ffe2e2]"
                        >
                            <Trash2 className="size-4" />
                            Remove Logo
                        </button>
                    </div>

                    <div className="mt-3 space-y-0.5 text-xs leading-4 text-[#99a1af]">
                        <p>
                            Accepted formats:{' '}
                            <span className="font-medium text-[#6a7282]">
                                PNG, SVG, JPG
                            </span>
                        </p>
                        <p>
                            Recommended size:{' '}
                            <span className="font-medium text-[#6a7282]">
                                512 x 512 px
                            </span>
                        </p>
                    </div>

                    {logoState.error ? (
                        <p className="mt-2 text-xs leading-4 font-medium text-[#e7000b]">
                            {logoState.error}
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
