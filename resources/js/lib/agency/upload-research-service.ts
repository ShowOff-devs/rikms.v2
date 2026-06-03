import type {
    AccessType,
    AgencyUploadState,
    DocumentType,
    MetadataField,
} from '@/types/agency-upload';

export const sdgOptions = [
    { id: 1, name: 'No Poverty', color: '#e5243b' },
    { id: 2, name: 'Zero Hunger', color: '#dda63a' },
    { id: 3, name: 'Good Health', color: '#4c9f38' },
    { id: 4, name: 'Quality Edu.', color: '#c5192d' },
    { id: 5, name: 'Gender Eq.', color: '#ff3a21' },
    { id: 6, name: 'Clean Water', color: '#26bde2' },
    { id: 7, name: 'Clean Energy', color: '#fcc30b' },
    { id: 8, name: 'Decent Work', color: '#a21942' },
    { id: 9, name: 'Industry', color: '#fd6925' },
    { id: 10, name: 'Reduced Ineq.', color: '#dd1367' },
    { id: 11, name: 'Sust. Cities', color: '#fd9d24' },
    { id: 12, name: 'Resp. Consump.', color: '#bf8b2e' },
    { id: 13, name: 'Climate', color: '#3f7e44' },
    { id: 14, name: 'Life Below Water', color: '#0a97d9' },
    { id: 15, name: 'Life on Land', color: '#56c02b' },
    { id: 16, name: 'Peace & Justice', color: '#00689d' },
    { id: 17, name: 'Partnerships', color: '#19486a' },
];

export const accessOptions: Array<{
    id: AccessType;
    label: string;
    description: string;
    tone: string;
}> = [
    {
        id: 'public',
        label: 'Public Download',
        description: 'Anyone can download the full research document.',
        tone: 'blue',
    },
    {
        id: 'request',
        label: 'Request Access',
        description: 'Users must submit a request to access the document.',
        tone: 'violet',
    },
    {
        id: 'restricted',
        label: 'Restricted (Admin Only)',
        description: 'Only agency administrators can access the document.',
        tone: 'rose',
    },
    {
        id: 'embargo',
        label: 'Embargo Until Date',
        description:
            'Document becomes publicly available after a specified date.',
        tone: 'amber',
    },
    {
        id: 'external-link',
        label: 'External Link Only',
        description: 'Link to a document hosted on an external platform.',
        tone: 'cyan',
    },
];

export const metadataFieldsTemplate: MetadataField[] = [
    {
        key: 'title',
        label: 'Title',
        value: '',
        isPublic: true,
    },
    {
        key: 'abstract',
        label: 'Abstract',
        value: '',
        isPublic: true,
    },
    {
        key: 'methodology',
        label: 'Methodology',
        value: '',
        isPublic: true,
    },
    {
        key: 'reviewOfRelatedLiterature',
        label: 'Review of Related Literature',
        value: '',
        isPublic: false,
    },
    {
        key: 'theoreticalFramework',
        label: 'Theoretical Framework',
        value: '',
        isPublic: false,
    },
    {
        key: 'resultsAndDiscussion',
        label: 'Results and Discussion',
        value: '',
        isPublic: true,
    },
    {
        key: 'keywords',
        label: 'Keywords',
        value: '',
        isPublic: false,
    },
    {
        key: 'authors',
        label: 'Authors',
        value: '',
        isPublic: false,
    },
];

export const createInitialUploadState = (): AgencyUploadState => ({
    documentType: 'research',
    file: null,
    manualTitle: '',
    uploadStatus: 'idle',
    aiHasRun: false,
    metadata: [],
    aiSuggestedSdgs: [],
    selectedSdgs: [],
    accessType: 'public',
    embargoDate: '',
    externalUrl: '',
    researchOwnerName: '',
    researchOwnerEmail: '',
    notifyAccessRequests: true,
    notifyResearchInquiries: false,
    sendCopyToAdmin: false,
    submissionStatus: 'draft',
    validationResults: [],
    submissionTimestamp: null,
    researchId: null,
});

export function getDisplayTitle(state: AgencyUploadState) {
    return (
        state.metadata.find((field) => field.key === 'title')?.value ||
        state.manualTitle ||
        'Untitled Research'
    );
}

export function getDocumentTypeLabel(type: DocumentType | null) {
    return type === 'research' ? 'Research Study' : 'Research Study';
}

export function getAccessLabel(type: AccessType) {
    return (
        accessOptions.find((option) => option.id === type)?.label ||
        'Public Download'
    );
}
