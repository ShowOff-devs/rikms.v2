import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReportRecoveryPromptProps = {
    documentLabel: string;
    conflict: boolean;
    onRestore: () => void;
    onDiscard: () => void;
};

export default function ReportRecoveryPrompt({
    documentLabel,
    conflict,
    onRestore,
    onDiscard,
}: ReportRecoveryPromptProps) {
    return (
        <section
            role="alertdialog"
            aria-labelledby="report-recovery-title"
            aria-describedby="report-recovery-description"
            className="rounded-[14px] border border-[#fcd34d] bg-[#fffbeb] p-6 text-[#78350f] shadow-sm"
        >
            <h2 id="report-recovery-title" className="text-base font-bold">
                Restore unsaved {documentLabel} changes?
            </h2>
            <p
                id="report-recovery-description"
                className="mt-2 text-sm leading-6"
            >
                {conflict
                    ? 'This browser recovery was based on an older server draft. Restore it on top of the latest saved draft, or discard it and keep the server version.'
                    : 'Unsaved changes for this draft were found in this browser. Restore them or discard them and continue with the saved version.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={onRestore}>
                    <RotateCcw className="size-4" />
                    Restore
                </Button>
                <Button type="button" variant="outline" onClick={onDiscard}>
                    <Trash2 className="size-4" />
                    Discard
                </Button>
            </div>
        </section>
    );
}
