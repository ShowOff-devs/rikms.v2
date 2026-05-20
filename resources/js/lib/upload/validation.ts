import { z } from 'zod';
import type { UploadFileMock } from '@/types/agency-upload';
import type {
    BeneficiarySector,
    ReportMetadataKey,
    ReportProjectStatus,
} from '@/types/upload/reportWorkflow';

export const uploadFileMockSchema = z.object({
    name: z.string().min(1, 'File name is required.'),
    size: z.number().positive('File size must be greater than zero.'),
    type: z.string().min(1, 'File type is required.'),
}) satisfies z.ZodType<UploadFileMock>;

export const metadataFieldSchema = z.object({
    key: z.enum([
        'title',
        'abstract',
        'methodology',
        'reviewOfRelatedLiterature',
        'theoreticalFramework',
        'resultsAndDiscussion',
        'keywords',
        'authors',
    ]),
    label: z.string().min(1),
    value: z.string(),
    isPublic: z.boolean(),
});

export const researchStepSchemas = {
    docType: z.object({
        documentType: z.literal('research', {
            message: 'Choose Research Study to continue.',
        }),
    }),
    upload: z
        .object({
            file: uploadFileMockSchema.nullable(),
            manualTitle: z.string(),
        })
        .refine((value) => value.file !== null, {
            message: 'Upload a research document before continuing.',
            path: ['file'],
        }),
    metadata: z
        .object({
            aiHasRun: z.boolean(),
            metadata: z.array(metadataFieldSchema),
        })
        .refine(
            (value) =>
                value.aiHasRun &&
                value.metadata.length > 0 &&
                value.metadata.some((field) => field.isPublic),
            {
                message:
                    'Run metadata extraction and select at least one public field.',
                path: ['metadata'],
            },
        ),
    sdg: z.object({
        selectedSdgs: z.array(z.number().int().min(1).max(17)).min(1, {
            message: 'Select at least one SDG tag.',
        }),
        suggestedSdgs: z.array(z.number().int().min(1).max(17)),
    }),
    access: z
        .object({
            accessType: z.enum([
                'public',
                'request',
                'restricted',
                'embargo',
                'external-link',
            ]),
            embargoDate: z.string(),
            externalUrl: z.string(),
        })
        .superRefine((value, context) => {
            if (value.accessType === 'embargo' && !value.embargoDate) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Choose an embargo date.',
                    path: ['embargoDate'],
                });
            }

            if (
                value.accessType === 'external-link' &&
                !value.externalUrl.trim()
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Enter the external document URL.',
                    path: ['externalUrl'],
                });
            }
        }),
    review: z.object({}),
} satisfies Record<string, z.ZodTypeAny>;

const reportMetadataKeySchema = z.enum([
    'title',
    'abstract',
    'methodology',
    'reviewOfRelatedLiterature',
    'theoreticalFramework',
    'resultsAndDiscussion',
    'keywords',
    'authors',
]) satisfies z.ZodType<ReportMetadataKey>;

const beneficiarySectorSchema = z.enum([
    'government',
    'academe',
    'business',
    'civil-society',
    'media',
]) satisfies z.ZodType<BeneficiarySector>;

const reportProjectStatusSchema = z.enum([
    'not-started',
    'in-progress',
    'completed',
]) satisfies z.ZodType<ReportProjectStatus>;

const reportUploadedFileSchema = z.custom<File | null>(
    (value) => value === null || typeof value === 'object',
);

const reportDetailsSchema = z
    .object({
        uploadedFile: reportUploadedFileSchema,
        uploadedFileName: z.string().optional(),
        uploadedFileType: z.string().optional(),
        uploadedFileSize: z.number().optional(),
        reportTitle: z.string().trim().min(1, 'Report title is required.'),
        reportDescription: z.string(),
        reportingQuarter: z.string().trim().min(1, 'Quarter is required.'),
        reportingYear: z.string().trim().min(1, 'Year is required.'),
        agency: z.string().trim().min(1),
        uploadStatus: z.enum(['idle', 'uploaded', 'error']),
    })
    .superRefine((value, context) => {
        if (!value.uploadedFileName || value.uploadStatus !== 'uploaded') {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Upload a PDF, DOCX, or DOC report before continuing.',
                path: ['uploadedFile'],
            });
        }

        const extension = value.uploadedFileName
            ?.split('.')
            .pop()
            ?.toLowerCase();

        if (extension && !['pdf', 'docx', 'doc'].includes(extension)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Supported formats are PDF, DOCX, and DOC.',
                path: ['uploadedFile'],
            });
        }

        if (
            value.uploadedFileSize &&
            value.uploadedFileSize > 50 * 1024 * 1024
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Maximum file size is 50 MB.',
                path: ['uploadedFile'],
            });
        }
    });

export const reportStepSchemas = {
    docType: z.object({
        documentType: z.enum(['terminal-report', 'project-accomplishment']),
        selectedWorkflow: z.enum([
            'terminal-report',
            'project-accomplishment',
            'research-study',
        ]),
    }),
    details: reportDetailsSchema,
    aiMetadata: z
        .object({
            aiAnalysisStarted: z.boolean(),
            aiAnalysisCompleted: z.boolean(),
            extractionStatus: z.enum(['idle', 'running', 'success', 'error']),
            extractedMetadata: z.object({
                title: z.string(),
                abstract: z.string(),
                methodology: z.string(),
                reviewOfRelatedLiterature: z.string(),
                theoreticalFramework: z.string(),
                resultsAndDiscussion: z.string(),
                keywords: z.array(z.string()),
                authors: z.array(z.string()),
            }),
            selectedPublicMetadata: z.array(reportMetadataKeySchema),
            aiGeneratedFields: z.array(reportMetadataKeySchema),
            userEditedFields: z.array(reportMetadataKeySchema),
            metadataValidated: z.boolean(),
        })
        .superRefine((value, context) => {
            if (
                !value.aiAnalysisCompleted ||
                value.extractionStatus !== 'success'
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Run AI metadata extraction before continuing.',
                    path: ['extractionStatus'],
                });
            }

            if (!value.extractedMetadata.title.trim()) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Metadata title is required.',
                    path: ['extractedMetadata'],
                });
            }

            if (!value.extractedMetadata.abstract.trim()) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Metadata abstract is required.',
                    path: ['extractedMetadata'],
                });
            }

            if (value.selectedPublicMetadata.length === 0) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Select at least one public metadata field.',
                    path: ['selectedPublicMetadata'],
                });
            }
        }),
    performance: z.object({
        performanceProjects: z
            .array(
                z.object({
                    id: z.string().min(1),
                    projectName: z.string().trim().min(1),
                    targetValue: z.number().positive(),
                    actualValue: z.number().min(0),
                    accomplishmentPercentage: z.number().min(0),
                    projectStatus: reportProjectStatusSchema,
                    remarks: z.string().optional(),
                }),
            )
            .min(1, 'Add at least one project performance row.'),
        performanceRemarks: z.string().optional(),
    }),
    papClassification: z.object({
        papCategories: z
            .array(z.string())
            .min(1, 'Select at least one PAP category.'),
        aiSuggestedPAPCategories: z.array(z.string()),
        papDescription: z
            .string()
            .trim()
            .min(1, 'PAP description is required.'),
        beneficiarySectors: z
            .array(beneficiarySectorSchema)
            .min(1, 'Select at least one beneficiary sector.'),
        aiSuggestionApplied: z.boolean(),
    }),
    financials: z
        .object({
            allocatedBudget: z
                .number()
                .positive('Allocated budget is required.'),
            usedBudget: z.number().min(0, 'Used budget is required.'),
            remainingBalance: z.number(),
            utilizationRate: z.number(),
            financialValidated: z.boolean(),
        })
        .refine((value) => value.usedBudget <= value.allocatedBudget, {
            message: 'Used budget cannot exceed allocated budget.',
            path: ['usedBudget'],
        }),
    highlights: z.object({
        highlightTitle: z
            .string()
            .trim()
            .min(1, 'Highlight title is required.'),
        highlightDescription: z
            .string()
            .trim()
            .min(40, 'Description must be at least 40 characters.'),
        supportingFiles: z.array(z.custom<File>()),
        featuredHighlight: z.boolean(),
    }),
    sdgTagging: z.object({
        selectedSDGs: z
            .array(z.number().int().min(1).max(17))
            .min(1, 'Select at least one SDG.'),
        aiSuggestedSDGs: z.array(z.number().int().min(1).max(17)),
        aiSuggestionsApplied: z.boolean(),
        sdgSelectionValidated: z.boolean(),
    }),
    review: z.object({
        reviewStatus: z.enum(['not-reviewed', 'reviewed']),
        draftStatus: z.enum(['not-saved', 'saved']),
        submissionStatus: z.enum(['draft', 'pending', 'submitted']),
        submittedAt: z.string().optional(),
    }),
} satisfies Record<string, z.ZodTypeAny>;
