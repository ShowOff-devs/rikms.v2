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
    'not-reported',
    'not-started',
    'in-progress',
    'substantially-complete',
    'completed',
]) satisfies z.ZodType<ReportProjectStatus>;

const reportUploadedFileSchema = z.custom<File | null>(
    (value) => value === null || typeof value === 'object',
);

const reportingPeriodOptions = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Final'];

const reportDateSchema = z.string().refine(
    (value) => {
        if (!value.trim()) {
            return true;
        }

        return Number.isFinite(Date.parse(value));
    },
    { message: 'Enter a valid date.' },
);

const reportDetailsSchema = z
    .object({
        uploadedFile: reportUploadedFileSchema,
        researchId: z.string().optional(),
        uploadedFileId: z.string().optional(),
        uploadedFileName: z.string().optional(),
        uploadedFileType: z.string().optional(),
        uploadedFileSize: z.number().optional(),
        uploadError: z.string().nullable().optional(),
        reportTitle: z.string(),
        reportDescription: z.string(),
        projectStartDate: reportDateSchema.refine(
            (value) => value.trim() !== '',
            'Project start date is required.',
        ),
        projectEndDate: reportDateSchema.refine(
            (value) => value.trim() !== '',
            'Project end date is required.',
        ),
        reportingPeriod: z
            .string()
            .trim()
            .refine((value) => reportingPeriodOptions.includes(value), {
                message: 'Choose a valid reporting period.',
            }),
        reportingYear: z
            .string()
            .trim()
            .regex(/^\d{4}$/u, 'Enter a four-digit reporting year.')
            .refine(
                (value) => {
                    const year = Number(value);

                    return year >= 1900 && year <= new Date().getFullYear() + 1;
                },
                {
                    message: `Year must be between 1900 and ${new Date().getFullYear() + 1}.`,
                },
            ),
        agency: z.string().trim().min(1),
        uploadStatus: z.enum(['idle', 'uploading', 'uploaded', 'error']),
    })
    .superRefine((value, context) => {
        if (!value.uploadedFileName || value.uploadStatus !== 'uploaded') {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Upload a PDF report before continuing.',
                path: ['uploadedFile'],
            });
        }

        const extension = value.uploadedFileName
            ?.split('.')
            .pop()
            ?.toLowerCase();

        if (extension && extension !== 'pdf') {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'The main report must be a PDF.',
                path: ['uploadedFile'],
            });
        }

        if (
            value.projectStartDate &&
            value.projectEndDate &&
            Date.parse(value.projectEndDate) <
                Date.parse(value.projectStartDate)
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Project end date must be on or after start date.',
                path: ['projectEndDate'],
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
            analysisMessage: z.string().nullable().optional(),
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
    performance: z
        .object({
            performanceProjects: z
                .array(
                    z.object({
                        id: z.string().min(1),
                        projectName: z.string().trim().min(1),
                        targetValue: z.string().max(120).nullable(),
                        actualValue: z.string().max(120).nullable(),
                        targetNumericValue: z
                            .number()
                            .positive('Target must be greater than zero.'),
                        actualNumericValue: z
                            .number()
                            .min(0, 'Actual value cannot be negative.'),
                        unit: z.string().trim().max(80),
                        accomplishmentPercentage: z.number().min(0).nullable(),
                        projectStatus: reportProjectStatusSchema,
                        remarks: z.string().optional(),
                    }),
                )
                .min(1, 'Add at least one project performance row.'),
            physicalAccomplishmentPercent: z
                .number({ message: 'Official accomplishment is required.' })
                .min(0)
                .max(100),
            performanceRemarks: z.string().optional(),
        })
        .superRefine((value, context) => {
            const percentages = value.performanceProjects
                .map((project) => project.accomplishmentPercentage)
                .filter(
                    (percentage): percentage is number => percentage !== null,
                );
            const calculated =
                percentages.length > 0
                    ? percentages.reduce((total, item) => total + item, 0) /
                      percentages.length
                    : null;

            if (
                calculated !== null &&
                Math.abs(value.physicalAccomplishmentPercent - calculated) >
                    5 &&
                !value.performanceRemarks?.trim()
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'Explain the difference between official and calculated accomplishment.',
                    path: ['performanceRemarks'],
                });
            }
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
                .number({ message: 'Allocated budget is required.' })
                .min(0, 'Allocated budget must be zero or greater.'),
            releasedAmount: z
                .number({ message: 'Released amount is required.' })
                .min(0, 'Released amount must be zero or greater.'),
            obligatedAmount: z
                .number({ message: 'Obligated amount is required.' })
                .min(0, 'Obligated amount must be zero or greater.'),
            usedBudget: z
                .number({ message: 'Used budget is required.' })
                .min(0, 'Used budget must be zero or greater.'),
            financialAsOfDate: reportDateSchema.refine(
                (value) => value.trim() !== '',
                'Financial as-of date is required.',
            ),
            remainingBalance: z.number().nullable(),
            utilizationRate: z.number().nullable(),
            financialValidated: z.literal(true, {
                message: 'Enter the required financial amounts.',
            }),
        })
        .superRefine((value, context) => {
            if (value.releasedAmount > value.allocatedBudget) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Released amount cannot exceed allotted budget.',
                    path: ['releasedAmount'],
                });
            }

            if (value.obligatedAmount > value.allocatedBudget) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Obligated amount cannot exceed allotted budget.',
                    path: ['obligatedAmount'],
                });
            }

            if (
                value.usedBudget > value.allocatedBudget ||
                value.usedBudget > value.releasedAmount
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'Used budget cannot exceed allotted or released amounts.',
                    path: ['usedBudget'],
                });
            }
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
        supportingFiles: z
            .array(
                z.object({
                    id: z.string().min(1),
                    name: z.string().min(1),
                    size: z.number().nonnegative(),
                    type: z.string().min(1),
                }),
            )
            .max(5),
        featuredHighlight: z.boolean(),
        uploadError: z.string().nullable().optional(),
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
