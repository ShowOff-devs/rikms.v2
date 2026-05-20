import { Save } from 'lucide-react';

type SettingsSaveButtonProps = {
    isSaving: boolean;
    disabled: boolean;
    onClick: () => void;
};

export function SettingsSaveButton({
    isSaving,
    disabled,
    onClick,
}: SettingsSaveButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isSaving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#172f73] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#99a1af]"
        >
            <Save className="size-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
    );
}
