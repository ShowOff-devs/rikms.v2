import { BookOpen, ClipboardList, FileBarChart2 } from 'lucide-react';
import type { ReactNode } from 'react';
import ReportStepLayout from '@/components/upload/reports/ReportStepLayout';
import { getReportTypeLabel } from '@/lib/upload/report-workflow';
import { cn } from '@/lib/utils';
import type {
    ReportDocTypeData,
    ReportDocumentType,
    ReportWorkflowSelection,
} from '@/types/upload/reportWorkflow';
import type { UploadWizardStepProps } from '@/types/uploadWizard';

const workflowOptions: {
    value: ReportWorkflowSelection;
    title: string;
    description: string;
    badge: string;
    icon: ReactNode;
}[] = [
    {
        value: 'research-study',
        title: 'Research Study',
        description: 'Peer-reviewed research papers and academic studies',
        badge: '6-Step Simplified',
        icon: <BookOpen className="size-5" />,
    },
    {
        value: 'terminal-report',
        title: 'Terminal Report',
        description:
            'End-of-project reports with performance data and outcomes',
        badge: '9-Step Full Flow',
        icon: <ClipboardList className="size-5" />,
    },
    {
        value: 'project-accomplishment',
        title: 'Project Accomplishment Report',
        description: 'PAP submissions for periodic monitoring and compliance',
        badge: '9-Step Full Flow',
        icon: <FileBarChart2 className="size-5" />,
    },
];

export default function ReportDocumentTypeStep(props: UploadWizardStepProps) {
    const { config, stepData, setStepData } = props;
    const data = stepData as ReportDocTypeData;
    const documentType = config.type as ReportDocumentType;

    const updateSelection = (selectedWorkflow: ReportWorkflowSelection) => {
        setStepData({
            documentType:
                selectedWorkflow === 'project-accomplishment'
                    ? 'project-accomplishment'
                    : selectedWorkflow === 'terminal-report'
                      ? 'terminal-report'
                      : documentType,
            selectedWorkflow,
        } satisfies ReportDocTypeData);
    };

    return (
        <ReportStepLayout
            {...props}
            icon={<ClipboardList className="size-5" />}
            title="Select Document Type"
            description="Choose the document type to configure the appropriate wizard flow for your submission."
        >
            <div className="mb-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4 text-xs text-[#1e3a8a]">
                    <p className="font-bold">
                        Research Study - 6-Step Simplified
                    </p>
                    <p className="mt-1 text-[#1e3a8a]/70">
                        Upload - AI Metadata - SDG Tagging - Access Control -
                        Review
                    </p>
                </div>
                <div className="rounded-[14px] border border-[#e9d4ff] bg-[#f5f3ff] p-4 text-xs text-[#7c3aed]">
                    <p className="font-bold">Reports - 9-Step Full Flow</p>
                    <p className="mt-1 text-[#7c3aed]/70">
                        Details - AI - Performance - PAP - Financials -
                        Highlights - SDG - Review
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {workflowOptions.map((option) => {
                    const selected = data.selectedWorkflow === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => updateSelection(option.value)}
                            className={cn(
                                'min-h-[138px] rounded-[14px] border bg-white p-5 text-left transition-colors',
                                selected
                                    ? 'border-[#7c3aed] bg-[#f5f3ff] shadow-[0_0_0_1px_#7c3aed]'
                                    : 'border-[#e5e7eb] hover:border-[#bfdbfe]',
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span
                                    className={cn(
                                        'flex size-10 items-center justify-center rounded-[14px]',
                                        selected
                                            ? 'bg-[#ede9fe] text-[#7c3aed]'
                                            : 'bg-[#eff6ff] text-[#1e3a8a]',
                                    )}
                                >
                                    {option.icon}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[9px] font-bold',
                                        selected
                                            ? 'bg-[#7c3aed] text-white'
                                            : 'bg-[#eff6ff] text-[#1e3a8a]',
                                    )}
                                >
                                    {option.badge}
                                </span>
                            </div>
                            <h3 className="mt-5 text-sm font-bold text-[#101828]">
                                {option.title}
                            </h3>
                            <p className="mt-2 text-xs leading-5 text-[#6a7282]">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 rounded-[10px] border border-[#e9d4ff] bg-[#f5f3ff] p-4 text-sm text-[#7c3aed]">
                {getReportTypeLabel(data.selectedWorkflow)} selected. The report
                workflow includes document details, AI metadata, performance,
                PAP classification, financial utilization, highlights, SDG
                tagging, and review.
            </div>
        </ReportStepLayout>
    );
}
