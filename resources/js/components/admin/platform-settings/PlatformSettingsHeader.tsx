import { Save } from 'lucide-react';

type PlatformSettingsHeaderProps = {
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
};

export function PlatformSettingsHeader({
    isDirty,
    isSaving,
    onSave,
}: PlatformSettingsHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                    Platform Settings
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#4a5565]">
                    Configure system-wide settings for the RIKMS platform.
                </p>
            </div>
            <button
                type="button"
                disabled={!isDirty || isSaving}
                onClick={onSave}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-55"
            >
                <Save className="size-4" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}
