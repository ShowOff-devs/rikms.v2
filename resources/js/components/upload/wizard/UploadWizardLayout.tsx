import type { ReactNode } from 'react';
import UploadStepper from '@/components/upload/wizard/UploadStepper';
import type {
    UploadStepId,
    UploadWizardConfig,
    UploadWizardState,
} from '@/types/uploadWizard';

type UploadWizardLayoutProps = {
    config: UploadWizardConfig;
    state: UploadWizardState;
    children: ReactNode;
    onStepSelect: (stepId: UploadStepId) => void;
};

export default function UploadWizardLayout({
    config,
    state,
    children,
    onStepSelect,
}: UploadWizardLayoutProps) {
    return (
        <main className="px-4 py-8 lg:px-8">
            <div className="mx-auto max-w-[1220px]">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                            <span>Dashboard</span>
                            <span>/</span>
                            <span>Upload</span>
                            <span>/</span>
                            <span className="font-semibold text-[#1e3a8a]">
                                {config.eyebrow}
                            </span>
                        </div>
                        <h1 className="text-2xl leading-8 font-bold text-[#1e3a8a]">
                            {config.title}
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6a7282]">
                            {config.description}
                        </p>
                    </div>
                    <span className="w-fit rounded-[10px] border border-[#bfdbfe] bg-white px-3 py-2 text-xs font-bold text-[#1e3a8a] shadow-sm">
                        {config.steps.length}-Step Wizard
                    </span>
                </div>

                <UploadStepper
                    steps={config.steps}
                    activeStepId={state.activeStepId}
                    completedStepIds={state.completedStepIds}
                    lockedStepIds={config.lockedStepIds}
                    onStepSelect={onStepSelect}
                />

                <div className="mt-5">{children}</div>
            </div>
        </main>
    );
}
