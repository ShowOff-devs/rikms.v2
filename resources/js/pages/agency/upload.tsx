import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Eye,
    FileText,
    Home,
    Info,
    NotebookTabs,
    Shield,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { getAgencySession } from '@/lib/auth/agency-auth';
import { cn } from '@/lib/utils';
import type { AgencyAuthSession } from '@/types/auth';

type UploadTypeId =
    | 'research-study'
    | 'terminal-report'
    | 'project-accomplishment-report';

type UploadColorTheme = 'blue' | 'purple' | 'green';

type UploadTypeConfig = {
    id: UploadTypeId;
    label: string;
    shortLabel: string;
    route: string;
    description: string;
    badge: string;
    stepCount: number;
    colorTheme: UploadColorTheme;
    icon: LucideIcon;
    steps: string[];
    flowTitle: string;
    flowDescription: string;
    infoMessage: string;
    preview: {
        label: string;
        title: string;
        typeLabel: string;
        stepIndicator: string;
        readiness: string;
        progressPercent: number;
        variant: 'research' | 'report';
    };
};

type ThemeClasses = {
    accent: string;
    accentMuted: string;
    accentSoft: string;
    activeBg: string;
    activeBorder: string;
    activeRing: string;
    badgeBg: string;
    badgeText: string;
    infoBg: string;
    infoBorder: string;
    infoText: string;
    previewHeaderBg: string;
    previewHeaderBorder: string;
    text: string;
};

const researchSteps = [
    'Doc Type',
    'Upload',
    'AI Metadata',
    'SDG Tagging',
    'Access',
    'Review',
];

const reportSteps = [
    'Doc Type',
    'Details',
    'AI Metadata',
    'Performance',
    'PAP Class.',
    'Financials',
    'Highlights',
    'SDG Tagging',
    'Review',
];

const uploadTypeConfig = {
    'research-study': {
        id: 'research-study',
        label: 'Research Study',
        shortLabel: 'Research Study',
        route: '/agency/upload/research',
        description: 'Peer-reviewed research papers and academic studies',
        badge: '6-Step Simplified',
        stepCount: 6,
        colorTheme: 'blue',
        icon: NotebookTabs,
        steps: researchSteps,
        flowTitle: 'Research Study · Simplified Flow',
        flowDescription:
            'Upload → AI Metadata → SDG Tagging → Access Control → Review',
        infoMessage:
            'Research Study selected. This simplified 6-step flow focuses on research submission: upload, AI metadata extraction, SDG tagging, and access control. No performance or financial fields required.',
        preview: {
            label: 'Research Preview',
            title: 'Untitled Research',
            typeLabel: 'Research Study',
            stepIndicator: 'Step 1/6',
            readiness: '2/5',
            progressPercent: 40,
            variant: 'research',
        },
    },
    'terminal-report': {
        id: 'terminal-report',
        label: 'Terminal Report',
        shortLabel: 'Terminal Report',
        route: '/agency/upload/terminal-report',
        description:
            'End-of-project reports with performance data and outcomes',
        badge: '9-Step Full Flow',
        stepCount: 9,
        colorTheme: 'purple',
        icon: ClipboardList,
        steps: reportSteps,
        flowTitle: 'Report Flow · Full Workflow',
        flowDescription:
            'Details → AI → Performance → PAP → Financials → Highlights → SDG → Review',
        infoMessage:
            'Terminal Report selected. This 9-step flow includes document details, project performance tracking, PAP classification, financial utilization, highlights, and SDG tagging — aligned to regional reporting standards.',
        preview: {
            label: 'Report Preview',
            title: 'Untitled Report',
            typeLabel: 'Terminal Report',
            stepIndicator: 'Step 1/9',
            readiness: '1/9',
            progressPercent: 11,
            variant: 'report',
        },
    },
    'project-accomplishment-report': {
        id: 'project-accomplishment-report',
        label: 'Project Accomplishment Report',
        shortLabel: 'Project Accomplishment Report',
        route: '/agency/upload/project-accomplishment',
        description: 'PAP submissions for periodic monitoring and compliance',
        badge: '9-Step Full Flow',
        stepCount: 9,
        colorTheme: 'green',
        icon: ClipboardCheck,
        steps: reportSteps,
        flowTitle: 'Report Flow · Full Workflow',
        flowDescription:
            'Details → AI → Performance → PAP → Financials → Highlights → SDG → Review',
        infoMessage:
            'Project Accomplishment Report selected. This 9-step flow includes document details, project performance tracking, PAP classification, financial utilization, highlights, and SDG tagging — aligned to regional reporting standards.',
        preview: {
            label: 'Report Preview',
            title: 'Untitled Report',
            typeLabel: 'Project Accomplishment Report',
            stepIndicator: 'Step 1/9',
            readiness: '2/9',
            progressPercent: 22,
            variant: 'report',
        },
    },
} satisfies Record<UploadTypeId, UploadTypeConfig>;

const uploadTypes = Object.values(uploadTypeConfig);

const themeClasses = {
    blue: {
        accent: '#1e3a8a',
        accentMuted: 'rgba(30,58,138,0.6)',
        accentSoft: '#eff6ff',
        activeBg: 'bg-[#eff6ff]',
        activeBorder: 'border-[#1e3a8a]',
        activeRing: 'ring-[#1e3a8a]/15',
        badgeBg: 'bg-[#eff6ff]',
        badgeText: 'text-[#1e3a8a]',
        infoBg: 'bg-[#eff6ff]',
        infoBorder: 'border-[#bfdbfe]',
        infoText: 'text-[#1e3a8a]',
        previewHeaderBg: 'bg-[#eff6ff]',
        previewHeaderBorder: 'border-[#bfdbfe]',
        text: 'text-[#1e3a8a]',
    },
    purple: {
        accent: '#7c3aed',
        accentMuted: 'rgba(124,58,237,0.6)',
        accentSoft: '#f5f3ff',
        activeBg: 'bg-[#f5f3ff]',
        activeBorder: 'border-[#7c3aed]',
        activeRing: 'ring-[#7c3aed]/15',
        badgeBg: 'bg-[#f5f3ff]',
        badgeText: 'text-[#7c3aed]',
        infoBg: 'bg-[#f5f3ff]',
        infoBorder: 'border-[#ddd6fe]',
        infoText: 'text-[#7c3aed]',
        previewHeaderBg: 'bg-[#f5f3ff]',
        previewHeaderBorder: 'border-[#ddd6fe]',
        text: 'text-[#7c3aed]',
    },
    green: {
        accent: '#059669',
        accentMuted: 'rgba(5,150,105,0.62)',
        accentSoft: '#ecfdf5',
        activeBg: 'bg-[#ecfdf5]',
        activeBorder: 'border-[#10b981]',
        activeRing: 'ring-[#10b981]/15',
        badgeBg: 'bg-[#ecfdf5]',
        badgeText: 'text-[#059669]',
        infoBg: 'bg-[#f5f3ff]',
        infoBorder: 'border-[#ddd6fe]',
        infoText: 'text-[#7c3aed]',
        previewHeaderBg: 'bg-[#f5f3ff]',
        previewHeaderBorder: 'border-[#ddd6fe]',
        text: 'text-[#059669]',
    },
} satisfies Record<UploadColorTheme, ThemeClasses>;

const reportPreviewTheme = themeClasses.purple;

const defaultPreview = {
    label: 'Document Preview',
    title: 'Untitled Document',
    typeLabel: 'Choose document type',
    stepIndicator: 'Step 1/?',
    readiness: '0/9',
    progressPercent: 0,
    variant: 'research' as const,
};

function getActiveTheme(config: UploadTypeConfig | null) {
    return config ? themeClasses[config.colorTheme] : themeClasses.blue;
}

function getPreviewTheme(config: UploadTypeConfig | null) {
    if (config?.preview.variant === 'report') {
        return reportPreviewTheme;
    }

    return getActiveTheme(config);
}

export default function AgencyUploadPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const [search, setSearch] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState<UploadTypeId | null>(
        null,
    );

    const selectedConfig = selectedTypeId
        ? uploadTypeConfig[selectedTypeId]
        : null;
    const visibleSteps = selectedConfig?.steps ?? ['Doc Type'];
    const activeTheme = getActiveTheme(selectedConfig);
    const wizardLabel = selectedConfig
        ? `AI-Powered · ${selectedConfig.stepCount}-Step Wizard`
        : 'AI-Powered · ?-Step Wizard';

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    const handleContinue = () => {
        if (!selectedConfig) {
            return;
        }

        router.visit(selectedConfig.route);
    };

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    return (
        <>
            <Head title="Upload Document" />
            <AgencyAdminLayout
                session={session}
                search={search}
                onSearchChange={setSearch}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
                        <PageHeader wizardLabel={wizardLabel} />
                        <StepProgress
                            selectedConfig={selectedConfig}
                            steps={visibleSteps}
                            theme={activeTheme}
                        />

                        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
                            <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-[22px] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                                <div className="flex gap-4">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#eef2ff] text-[#1e3a8a]">
                                        <ClipboardCheck className="size-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[#101828] sm:text-[20px] sm:leading-7">
                                            Select Document Type
                                        </h2>
                                        <p className="mt-1 text-sm leading-5 text-[#6a7282]">
                                            Choose the document type to
                                            configure the appropriate wizard
                                            flow for your submission.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-[22px] border-t border-[#f3f4f6] pt-[22px]">
                                    <FlowSummary />
                                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                        {uploadTypes.map((documentType) => (
                                            <DocumentTypeCard
                                                key={documentType.id}
                                                config={documentType}
                                                isSelected={
                                                    selectedTypeId ===
                                                    documentType.id
                                                }
                                                onSelect={() =>
                                                    setSelectedTypeId(
                                                        documentType.id,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>

                                    {selectedConfig ? (
                                        <InfoBanner config={selectedConfig} />
                                    ) : null}
                                </div>
                            </section>

                            <LivePreview config={selectedConfig} />
                        </div>

                        <BottomNavigation
                            selectedConfig={selectedConfig}
                            onContinue={handleContinue}
                        />
                    </div>
                </main>
            </AgencyAdminLayout>
        </>
    );
}

function PageHeader({ wizardLabel }: { wizardLabel: string }) {
    return (
        <div className="flex min-h-[82px] items-start justify-between gap-6">
            <div className="min-w-0">
                <nav className="flex h-4 items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                    <Home className="size-3.5" />
                    <span>Dashboard</span>
                    <ChevronRight className="size-3" />
                    <span>Upload</span>
                    <ChevronRight className="size-3" />
                    <span className="font-semibold text-[#1e3a8a]">
                        New Document
                    </span>
                </nav>
                <h1 className="mt-2 text-2xl leading-9 font-bold text-[#1e3a8a]">
                    Upload Document
                </h1>
                <p className="text-sm leading-5 text-[#6a7282]">
                    Submit documents with structured data and automated metadata
                    extraction
                </p>
            </div>
            <div className="mt-0.5 hidden h-[34px] shrink-0 items-center gap-2 rounded-[14px] border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] to-[#f5f3ff] px-[13px] text-xs leading-4 font-semibold text-[#1e3a8a] sm:flex">
                <Sparkles className="size-4" />
                {wizardLabel}
            </div>
        </div>
    );
}

function StepProgress({
    selectedConfig,
    steps,
    theme,
}: {
    selectedConfig: UploadTypeConfig | null;
    steps: string[];
    theme: ThemeClasses;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white px-[21px] pt-[17px] pb-[13px] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {selectedConfig ? (
                <div className="mb-3 flex h-[19px] items-center justify-between">
                    <p className="text-[10px] leading-[15px] font-semibold tracking-[0.5px] text-[#99a1af] uppercase">
                        {selectedConfig.flowTitle}
                    </p>
                    <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] leading-[15px] font-bold text-white"
                        style={{ backgroundColor: theme.accent }}
                    >
                        {selectedConfig.stepCount} Steps
                    </span>
                </div>
            ) : null}

            <div className="flex min-h-[53px] items-center overflow-hidden">
                {selectedConfig ? (
                    <div className="flex w-full items-center">
                        {steps.map((step, index) => (
                            <StepperItem
                                key={step}
                                index={index}
                                label={step}
                                isLast={index === steps.length - 1}
                                theme={theme}
                            />
                        ))}
                    </div>
                ) : (
                    <DefaultStepper />
                )}
            </div>
        </section>
    );
}

function StepperItem({
    index,
    label,
    isLast,
    theme,
}: {
    index: number;
    label: string;
    isLast: boolean;
    theme: ThemeClasses;
}) {
    const isActive = index === 0;

    return (
        <>
            <div className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
                <span
                    className={cn(
                        'flex size-8 items-center justify-center rounded-full border-2 text-sm leading-5 font-medium',
                        isActive
                            ? 'text-white'
                            : 'border-[#e5e7eb] bg-white text-[#99a1af]',
                    )}
                    style={
                        isActive
                            ? {
                                  backgroundColor: theme.accent,
                                  borderColor: theme.accent,
                              }
                            : undefined
                    }
                >
                    {index + 1}
                </span>
                <span
                    className={cn(
                        'max-w-[74px] text-center text-[10px] leading-[15px] font-medium',
                        isActive ? 'text-[#1e3a8a]' : 'text-[#99a1af]',
                    )}
                >
                    {label}
                </span>
            </div>
            {!isLast ? (
                <div className="mx-2 h-px min-w-[24px] flex-1 bg-[#e5e7eb]" />
            ) : null}
        </>
    );
}

function DefaultStepper() {
    return (
        <div className="flex w-full items-center gap-4">
            <div className="flex w-[52px] shrink-0 flex-col items-center gap-1.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-medium text-white">
                    1
                </span>
                <span className="text-center text-[10px] leading-[15px] font-medium text-[#1e3a8a]">
                    Doc Type
                </span>
            </div>
            <div className="h-px flex-1 bg-[#e5e7eb]" />
            <div className="flex h-7 items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-4 text-xs font-medium text-[#99a1af]">
                <span className="size-2 rounded-full bg-[#e5e7eb]" />
                Select a document type to see remaining steps
                <Info className="size-3" />
            </div>
            <div className="h-px flex-1 bg-[#e5e7eb]" />
        </div>
    );
}

function FlowSummary() {
    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <FlowSummaryCard
                icon={NotebookTabs}
                title="Research Study — 6-Step Simplified"
                description="Upload → AI Metadata → SDG Tagging → Access Control → Review"
                theme={themeClasses.blue}
            />
            <FlowSummaryCard
                icon={ClipboardList}
                title="Reports — 9-Step Full Flow"
                description="Details → AI → Performance → PAP → Financials → Highlights → SDG → Review"
                theme={themeClasses.purple}
            />
        </div>
    );
}

function FlowSummaryCard({
    icon: Icon,
    title,
    description,
    theme,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    theme: ThemeClasses;
}) {
    return (
        <div
            className="rounded-[10px] border px-4 py-3"
            style={{
                backgroundColor: theme.accentSoft,
                borderColor: theme.accent === '#1e3a8a' ? '#bfdbfe' : '#ddd6fe',
            }}
        >
            <div className="flex gap-2">
                <Icon className={cn('mt-0.5 size-4 shrink-0', theme.text)} />
                <div className="min-w-0">
                    <p className={cn('text-xs font-bold', theme.text)}>
                        {title}
                    </p>
                    <p
                        className="mt-1 text-[11px] leading-[16.5px]"
                        style={{ color: theme.accentMuted }}
                    >
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

function DocumentTypeCard({
    config,
    isSelected,
    onSelect,
}: {
    config: UploadTypeConfig;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const Icon = config.icon;
    const theme = themeClasses[config.colorTheme];

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            className={cn(
                'relative min-h-[172px] rounded-2xl border-2 bg-white p-5 text-left transition focus-visible:ring-2 focus-visible:outline-none',
                isSelected
                    ? cn(
                          theme.activeBg,
                          theme.activeBorder,
                          theme.activeRing,
                          'shadow-[0px_6px_16px_rgba(15,23,42,0.12)] ring-4',
                      )
                    : 'border-[#e5e7eb] hover:border-[#bfdbfe]',
            )}
        >
            {isSelected ? (
                <span
                    className="absolute top-3 left-3 flex size-4 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: theme.accent }}
                >
                    <CheckCircle2 className="size-3" />
                </span>
            ) : null}
            <span
                className={cn(
                    'absolute top-3 right-3 rounded-full px-1.5 py-[2px] text-[9px] leading-[13.5px] font-bold',
                    theme.badgeBg,
                    theme.badgeText,
                )}
            >
                {config.badge}
            </span>
            <span
                className={cn(
                    'flex size-12 items-center justify-center rounded-[14px]',
                    theme.badgeBg,
                    theme.badgeText,
                    isSelected ? 'mt-4' : 'mt-0',
                )}
            >
                <Icon className="size-6" />
            </span>
            <h3 className="mt-7 text-[14.08px] leading-[21.12px] font-bold text-[#101828]">
                {config.label}
            </h3>
            <p className="mt-1 text-[12.16px] leading-[19.76px] font-medium text-[#6a7282]">
                {config.description}
            </p>
        </button>
    );
}

function InfoBanner({ config }: { config: UploadTypeConfig }) {
    const theme = themeClasses[config.colorTheme];

    return (
        <div
            className={cn(
                'mt-5 flex items-start gap-3 rounded-[10px] border px-4 py-3',
                theme.infoBg,
                theme.infoBorder,
                theme.infoText,
            )}
        >
            <Info className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm leading-5 font-medium">
                {config.infoMessage}
            </p>
        </div>
    );
}

function LivePreview({ config }: { config: UploadTypeConfig | null }) {
    const preview = config?.preview ?? defaultPreview;
    const previewTheme = getPreviewTheme(config);
    const typeTheme = config
        ? themeClasses[config.colorTheme]
        : themeClasses.blue;
    const flowSteps = config?.steps ?? researchSteps;
    const flowTitle = config
        ? `${config.stepCount}-STEP ${config.preview.variant === 'report' ? 'REPORT' : 'RESEARCH'} FLOW`
        : 'DEFAULT WIZARD FLOW';

    return (
        <aside className="flex flex-col gap-3 xl:w-[270px]">
            <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                <div
                    className={cn(
                        'flex h-[41px] items-center border-b px-4',
                        previewTheme.previewHeaderBg,
                        previewTheme.previewHeaderBorder,
                    )}
                >
                    <Eye className={cn('size-4', previewTheme.text)} />
                    <p
                        className={cn(
                            'ml-2 text-xs leading-4 font-bold',
                            previewTheme.text,
                        )}
                    >
                        {preview.label}
                    </p>
                    <span
                        className="ml-auto text-[10px] leading-[15px] font-medium"
                        style={{ color: previewTheme.accentMuted }}
                    >
                        {preview.stepIndicator}
                    </span>
                </div>

                <div className="flex flex-col gap-4 px-4 pt-4 pb-[17px]">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            {config ? (
                                <config.icon
                                    className={cn('size-3.5', typeTheme.text)}
                                />
                            ) : (
                                <FileText
                                    className={cn('size-3.5', typeTheme.text)}
                                />
                            )}
                            <p
                                className={cn(
                                    'text-[10px] leading-[15px] font-bold',
                                    typeTheme.text,
                                )}
                            >
                                {preview.typeLabel}
                            </p>
                        </div>
                        <p className="text-sm leading-[19.25px] font-semibold text-[#1e2939]">
                            {preview.title}
                        </p>
                        {preview.variant === 'report' ? (
                            <p className="text-[10px] leading-[15px] text-[#99a1af]">
                                2026
                            </p>
                        ) : null}
                    </div>

                    {preview.variant === 'report' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <MetricCard
                                value="0"
                                label="Projects"
                                valueClass="text-[#1e3a8a]"
                                bgClass="bg-[#eff6ff]"
                            />
                            <MetricCard
                                value="0%"
                                label="Completion"
                                valueClass="text-[#00a63e]"
                                bgClass="bg-[#f0fdf4]"
                            />
                        </div>
                    ) : (
                        <div className="flex h-[31px] items-center gap-2 rounded-[10px] bg-[#eff6ff] p-2">
                            <Shield className="size-3.5 text-[#1e3a8a]" />
                            <span className="text-[10px] leading-[15px] font-semibold text-[#1e3a8a]">
                                Public Download
                            </span>
                        </div>
                    )}

                    <ReadinessBar
                        readiness={preview.readiness}
                        progressPercent={preview.progressPercent}
                        theme={previewTheme}
                    />
                </div>
            </div>

            <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-[17px] pt-[17px] pb-[13px] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                <p className="text-[9px] leading-[13.5px] font-bold text-[#99a1af] uppercase">
                    {flowTitle}
                </p>
                <div className="mt-2.5 flex flex-col gap-1.5">
                    {flowSteps.map((step, index) => (
                        <MiniStep
                            key={step}
                            index={index}
                            label={step}
                            theme={previewTheme}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
}

function MetricCard({
    value,
    label,
    valueClass,
    bgClass,
}: {
    value: string;
    label: string;
    valueClass: string;
    bgClass: string;
}) {
    return (
        <div
            className={cn(
                'flex h-[53.5px] flex-col items-center rounded-[10px] pt-2',
                bgClass,
            )}
        >
            <span className={cn('text-base leading-6 font-bold', valueClass)}>
                {value}
            </span>
            <span className="text-[9px] leading-[13.5px] text-[#99a1af]">
                {label}
            </span>
        </div>
    );
}

function ReadinessBar({
    readiness,
    progressPercent,
    theme,
}: {
    readiness: string;
    progressPercent: number;
    theme: ThemeClasses;
}) {
    return (
        <div className="border-t border-[#f3f4f6] pt-[9px]">
            <div className="flex items-center justify-between">
                <p className="text-[9px] leading-[13.5px] font-bold text-[#99a1af] uppercase">
                    Readiness
                </p>
                <p
                    className="text-[10px] leading-[15px] font-bold"
                    style={{ color: theme.accent }}
                >
                    {readiness}
                </p>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3f4f6]">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${progressPercent}%`,
                        backgroundColor: theme.accent,
                    }}
                />
            </div>
        </div>
    );
}

function MiniStep({
    index,
    label,
    theme,
}: {
    index: number;
    label: string;
    theme: ThemeClasses;
}) {
    const isActive = index === 0;

    return (
        <div className="flex h-[16.5px] items-center gap-2">
            <span
                className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-[13.5px] font-medium',
                    isActive ? 'text-white' : 'bg-[#f3f4f6] text-[#99a1af]',
                )}
                style={isActive ? { backgroundColor: '#1e3a8a' } : undefined}
            >
                {index + 1}
            </span>
            <span
                className={cn(
                    'text-[11px] leading-[16.5px] font-medium',
                    isActive ? 'text-[#1e3a8a]' : 'text-[#d1d5dc]',
                )}
            >
                {label}
            </span>
            {isActive && (
                <span className="sr-only" style={{ color: theme.accent }}>
                    Current step
                </span>
            )}
        </div>
    );
}

function BottomNavigation({
    selectedConfig,
    onContinue,
}: {
    selectedConfig: UploadTypeConfig | null;
    onContinue: () => void;
}) {
    const isEnabled = Boolean(selectedConfig);

    return (
        <div className="flex h-10 items-center justify-between">
            <button
                type="button"
                disabled
                className="flex h-10 items-center gap-2 rounded-[14px] px-4 text-sm font-medium text-[#d1d5dc]"
            >
                <ArrowLeft className="size-4" />
                Previous
            </button>
            <div className="flex items-center gap-3">
                <span className="text-xs leading-4 font-medium text-[#99a1af]">
                    1 / {selectedConfig?.stepCount ?? '?'}
                </span>
                <button
                    type="button"
                    disabled={!isEnabled}
                    onClick={onContinue}
                    className={cn(
                        'flex h-10 items-center gap-2 rounded-[14px] px-5 text-sm font-medium shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition',
                        isEnabled
                            ? 'bg-[#1e3a8a] text-white hover:bg-[#172f73]'
                            : 'cursor-not-allowed bg-[#e5e7eb] text-[#99a1af]',
                    )}
                >
                    Continue
                    <ArrowRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
