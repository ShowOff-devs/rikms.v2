import { RotateCcw, Save } from 'lucide-react';

type AgencyProfileActionsProps = {
    hasChanges: boolean;
    isSaving: boolean;
    canSave: boolean;
    onCancel: () => void;
};

export function AgencyProfileActions({
    hasChanges,
    isSaving,
    canSave,
    onCancel,
}: AgencyProfileActionsProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] py-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    form="agency-profile-form"
                    disabled={!canSave || isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#172f73] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#99a1af]"
                >
                    <Save className="size-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    type="button"
                    disabled={!hasChanges || isSaving}
                    onClick={onCancel}
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm leading-5 font-medium text-[#364153] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw className="size-4" />
                    Cancel
                </button>
            </div>
        </section>
    );
}
