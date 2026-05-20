import { Archive, Check, LoaderCircle, Send, Save } from 'lucide-react';

export function EditDocumentActions({
    isSaving,
    onSave,
    onSaveDraft,
    onPublish,
    onArchive,
}: {
    isSaving: boolean;
    onSave: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
    onArchive: () => void;
}) {
    return (
        <footer className="sticky bottom-0 z-30 mt-6 border-t border-[#e5e7eb] bg-[#f3f4f6]/95 py-4 backdrop-blur">
            <div className="flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-3 shadow-[0px_8px_24px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onArchive}
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#ffc9c9] bg-[#fef2f2] px-4 text-sm font-semibold text-[#e7000b] disabled:opacity-50"
                >
                    <Archive className="size-4" />
                    Archive
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#4a5565] disabled:opacity-50"
                    >
                        <Save className="size-4" />
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        onClick={onPublish}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-sm font-semibold text-[#008236] disabled:opacity-50"
                    >
                        <Send className="size-4" />
                        Publish Research
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {isSaving ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </footer>
    );
}
