import { researchStepSchemas } from '@/lib/upload/validation';
import type { UploadWizardConfig } from '@/types/uploadWizard';

export const researchUploadConfig: UploadWizardConfig = {
    type: 'research',
    title: 'Research Study Upload',
    description:
        'Prepare a research study submission with a focused 6-step workflow.',
    eyebrow: 'Research Study',
    steps: [
        {
            id: 'doc-type',
            title: 'Doc Type',
            description: 'Confirm the submission type before collecting files.',
            defaultValues: {
                documentType: 'research',
            },
            schema: researchStepSchemas.docType,
        },
        {
            id: 'upload',
            title: 'Upload',
            description:
                'Attach the research study file and supporting assets.',
            defaultValues: {
                file: null,
                manualTitle: '',
            },
            schema: researchStepSchemas.upload,
        },
        {
            id: 'ai-metadata',
            title: 'AI Metadata',
            description: 'Review extracted metadata when AI support is added.',
            defaultValues: {
                aiHasRun: false,
                metadata: [],
            },
            schema: researchStepSchemas.metadata,
        },
        {
            id: 'sdg-tagging',
            title: 'SDG Tagging',
            description: 'Tag the study against relevant SDG goals.',
            defaultValues: {
                selectedSdgs: [],
                suggestedSdgs: [],
            },
            schema: researchStepSchemas.sdg,
        },
        {
            id: 'access',
            title: 'Access',
            description: 'Configure repository access rules for the study.',
            defaultValues: {
                accessType: 'public',
                embargoDate: '',
                externalUrl: '',
            },
            schema: researchStepSchemas.access,
        },
        {
            id: 'review',
            title: 'Review',
            description: 'Review the prepared research study submission.',
            defaultValues: {},
            schema: researchStepSchemas.review,
        },
    ],
};
