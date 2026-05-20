import type {
    DuplicateResearchMatch,
    FlaggedResearchRecord,
    ModerationActivity,
    ModerationIssueType,
    ModerationStatus,
} from '@/types/research-moderation';

export const moderationIssueTypeLabels: Record<ModerationIssueType, string> = {
    'duplicate-research': 'Duplicate Research',
    'incomplete-metadata': 'Incomplete Metadata',
    'policy-violation': 'Policy Violation',
    'missing-abstract': 'Missing Abstract',
    'missing-keywords': 'Missing Keywords',
    'incomplete-author-affiliation': 'Incomplete Author Affiliation',
};

export const moderationStatusLabels: Record<ModerationStatus, string> = {
    'pending-review': 'Pending Review',
    resolved: 'Resolved',
    flagged: 'Flagged',
    'needs-review': 'Needs Review',
};

export const flaggedResearchRecords: FlaggedResearchRecord[] = [
    {
        id: 'mod-001',
        title: 'Indigenous Knowledge Systems in Mindanao Agriculture',
        agency: 'DOST XI',
        uploadedBy: 'Angelica Reyes',
        uploaderRole: 'Agency Admin - DOST XI',
        issueType: 'duplicate-research',
        year: 2025,
        status: 'resolved',
        dateFlagged: '2026-02-20',
        authors: ['L. Mateo', 'A. Reyes'],
        abstract:
            'Documents local farming practices and knowledge-transfer patterns among upland communities in Mindanao.',
        issueDescription:
            'System similarity scan found overlapping title, agency tags, and abstract phrases with an archived submission.',
        recommendedAction:
            'Keep the current record resolved and monitor the linked archived copy for future restoration requests.',
    },
    {
        id: 'mod-002',
        title: 'Digital Literacy Assessment Tool for Rural Learners',
        agency: 'NEDA XI',
        uploadedBy: 'Francisco Aguilar',
        uploaderRole: 'Agency Admin - NEDA XI',
        issueType: 'incomplete-metadata',
        year: 2026,
        status: 'pending-review',
        dateFlagged: '2026-02-22',
        authors: ['F. Aguilar', 'M. Ortega'],
        abstract:
            'Evaluates baseline digital literacy indicators for rural learners in Region XI using mixed methods.',
        issueDescription:
            'Funding source, SDG tags, and methodology metadata are incomplete.',
        recommendedAction:
            'Request metadata completion before approving the public repository entry.',
    },
    {
        id: 'mod-003',
        title: 'Sustainable Agriculture Practices in Davao del Sur',
        agency: 'SMAARRDEC',
        uploadedBy: 'Carmen Navarro',
        uploaderRole: 'Agency Admin - SMAARRDEC',
        issueType: 'policy-violation',
        year: 2025,
        status: 'pending-review',
        dateFlagged: '2026-02-23',
        authors: ['C. Navarro'],
        abstract:
            'Compares adoption barriers for soil conservation, crop rotation, and water-saving systems among farms.',
        issueDescription:
            'Attached file includes unmasked respondent identifiers in appendix tables.',
        recommendedAction:
            'Hold publication and require a sanitized file before repository release.',
    },
    {
        id: 'mod-004',
        title: 'Higher Education Quality Assurance Metrics in Region XI',
        agency: 'CHED XI',
        uploadedBy: 'Maria Santos',
        uploaderRole: 'Agency Admin - CHED XI',
        issueType: 'duplicate-research',
        year: 2026,
        status: 'resolved',
        dateFlagged: '2026-02-24',
        authors: ['M. Santos', 'J. Dela Cruz'],
        abstract:
            'Analyzes research quality assurance indicators used by higher education institutions in Region XI.',
        issueDescription:
            'Duplicate alert was reviewed against the prior institutional copy and marked as a valid updated version.',
        recommendedAction:
            'No further action required unless a new duplicate alert is produced.',
    },
    {
        id: 'mod-005',
        title: 'Coastal Ecosystem Mapping Using Remote Sensing',
        agency: 'DOST XI',
        uploadedBy: 'Patricia Lim',
        uploaderRole: 'Agency Admin - DOST XI',
        issueType: 'incomplete-metadata',
        year: 2025,
        status: 'pending-review',
        dateFlagged: '2026-02-25',
        authors: ['P. Lim', 'R. Velasco'],
        abstract:
            'Maps mangrove and coral cover changes using satellite imagery and field validation data.',
        issueDescription:
            'Geographic coverage, data source, and access restrictions are missing.',
        recommendedAction:
            'Ask agency uploader to complete geospatial metadata and embargo information.',
    },
    {
        id: 'mod-006',
        title: 'Renewable Energy Potential Assessment for Off-grid Communities',
        agency: 'DRIEERDC',
        uploadedBy: 'Andres Ramos',
        uploaderRole: 'Agency Admin - DRIEERDC',
        issueType: 'policy-violation',
        year: 2024,
        status: 'pending-review',
        dateFlagged: '2026-02-26',
        authors: ['A. Ramos'],
        abstract:
            'Assesses solar, micro-hydro, and biomass potential across off-grid communities in Davao Region.',
        issueDescription:
            'Pre-publication record contains partner-provided technical estimates marked for internal use only.',
        recommendedAction:
            'Coordinate with the agency admin to verify release permissions or archive the public copy.',
    },
    {
        id: 'mod-007',
        title: 'Public Health Framework for Disease Surveillance in Region XI',
        agency: 'RHRDC XI',
        uploadedBy: 'Ana Fernandez',
        uploaderRole: 'Agency Admin - RHRDC XI',
        issueType: 'incomplete-metadata',
        year: 2025,
        status: 'resolved',
        dateFlagged: '2026-02-27',
        authors: ['A. Fernandez', 'K. Yu'],
        abstract:
            'Proposes a region-wide surveillance coordination framework for local health offices and research partners.',
        issueDescription:
            'Original flag cited missing ethics review details; agency supplied documentation on March 2, 2026.',
        recommendedAction:
            'Keep the resolution note in the audit trail for future compliance review.',
    },
    {
        id: 'mod-008',
        title: 'Economic Impact of Digital Transformation on MSMEs',
        agency: 'DTI XI',
        uploadedBy: 'Elena Marquez',
        uploaderRole: 'Agency Admin - DTI XI',
        issueType: 'duplicate-research',
        year: 2025,
        status: 'resolved',
        dateFlagged: '2026-02-28',
        authors: ['E. Marquez', 'N. Pangan'],
        abstract:
            'Measures the impact of digital transformation programs on productivity and market access among MSMEs.',
        issueDescription:
            'Duplicate scan matched an earlier preprint. Moderator confirmed this record is the final approved version.',
        recommendedAction:
            'Retain final version and keep preprint archived.',
    },
    {
        id: 'mod-009',
        title: 'Urban Flood Risk Modeling for Davao River Communities',
        agency: 'NEDA XI',
        uploadedBy: 'Samuel Tan',
        uploaderRole: 'Agency Admin - NEDA XI',
        issueType: 'missing-abstract',
        year: 2026,
        status: 'flagged',
        dateFlagged: '2026-03-01',
        authors: ['S. Tan'],
        issueDescription:
            'Record passed file validation but has no abstract or executive summary for repository review.',
        recommendedAction:
            'Request an abstract before approving discovery in the public browser.',
    },
    {
        id: 'mod-010',
        title: 'Food Safety Compliance Survey for Community Markets',
        agency: 'DTI XI',
        uploadedBy: 'Nina Galvez',
        uploaderRole: 'Agency Admin - DTI XI',
        issueType: 'missing-keywords',
        year: 2025,
        status: 'needs-review',
        dateFlagged: '2026-03-02',
        authors: ['N. Galvez', 'P. Lizada'],
        abstract:
            'Surveys food safety practices and compliance gaps in community markets across selected Davao cities.',
        issueDescription:
            'Keyword list is empty, reducing search quality and SDG tagging confidence.',
        recommendedAction:
            'Add controlled keywords before publishing the updated metadata.',
    },
    {
        id: 'mod-011',
        title: 'Teacher Upskilling Pathways for STEM Instruction',
        agency: 'CHED XI',
        uploadedBy: 'Joel Mendoza',
        uploaderRole: 'Agency Admin - CHED XI',
        issueType: 'incomplete-author-affiliation',
        year: 2026,
        status: 'pending-review',
        dateFlagged: '2026-03-03',
        authors: ['J. Mendoza', 'R. Cruz'],
        abstract:
            'Reviews STEM teacher upskilling pathways and professional development outcomes in higher education.',
        issueDescription:
            'Two listed co-authors do not include institution, department, or ORCID details.',
        recommendedAction:
            'Return the metadata form to the agency admin for author affiliation completion.',
    },
    {
        id: 'mod-012',
        title: 'Inclusive Livelihood Models for Coastal Women',
        agency: 'SMAARRDEC',
        uploadedBy: 'Rhea Castillo',
        uploaderRole: 'Agency Admin - SMAARRDEC',
        issueType: 'policy-violation',
        year: 2024,
        status: 'flagged',
        dateFlagged: '2026-03-04',
        authors: ['R. Castillo'],
        abstract:
            'Evaluates inclusive livelihood models and cooperative governance for coastal women-led enterprises.',
        issueDescription:
            'Narrative section includes consent language that conflicts with repository public-release policy.',
        recommendedAction:
            'Keep flagged until legal and ethics compliance review is complete.',
    },
];

export const duplicateResearchMatches: DuplicateResearchMatch[] = [
    {
        id: 'dup-001',
        originalTitle: 'Climate Adaptation Strategies in Davao Agriculture',
        matchingTitle: 'Climate Adaptation Strategies for Davao Agriculture',
        originalAgency: 'DOST XI',
        matchingAgency: 'CHED XI',
        similarityScore: 94,
        detectedAt: '2026-03-04T10:20:00.000Z',
        originalAuthors: ['L. Mateo', 'R. Velasco'],
        matchingAuthors: ['L. Mateo', 'J. Dela Cruz'],
        originalYear: 2025,
        matchingYear: 2026,
        matchReason:
            'Title similarity, overlapping author, related methodology terms, and shared regional crop keywords.',
        originalAbstract:
            'Studies climate adaptation practices among agricultural communities across Davao provinces.',
        matchingAbstract:
            'Reviews adaptation strategies for Davao agriculture with similar intervention categories and crop terms.',
    },
    {
        id: 'dup-002',
        originalTitle: 'Watershed Governance Indicators for Local Planning',
        matchingTitle: 'Local Planning Indicators for Watershed Governance',
        originalAgency: 'NEDA XI',
        matchingAgency: 'DOST XI',
        similarityScore: 88,
        detectedAt: '2026-03-05T08:45:00.000Z',
        originalAuthors: ['M. Ortega'],
        matchingAuthors: ['M. Ortega', 'P. Lim'],
        originalYear: 2024,
        matchingYear: 2025,
        matchReason:
            'Shared lead author, reversed title phrasing, and high abstract phrase overlap.',
        originalAbstract:
            'Defines watershed governance indicators for province-level planning and monitoring.',
        matchingAbstract:
            'Presents local planning indicators designed to improve watershed governance monitoring.',
    },
];

export const moderationActivities: ModerationActivity[] = [
    {
        id: 'act-001',
        actor: 'System Admin',
        action: 'Approved research:',
        researchTitle: 'Economic Impact of Digital Transformation on MSMEs',
        timestamp: '2026-03-03T14:15:00.000Z',
        type: 'approved',
    },
    {
        id: 'act-002',
        actor: 'System Admin',
        action: 'Requested revision:',
        researchTitle: 'Public Health Framework for Disease Surveillance in Region XI',
        timestamp: '2026-03-02T10:30:00.000Z',
        type: 'revision-requested',
    },
    {
        id: 'act-003',
        actor: 'System Admin',
        action: 'Resolved duplicate flag:',
        researchTitle: 'Higher Education Quality Assurance Metrics in Region XI',
        timestamp: '2026-03-01T16:45:00.000Z',
        type: 'duplicate-resolved',
    },
    {
        id: 'act-004',
        actor: 'System Admin',
        action: 'Archived research:',
        researchTitle: 'Indigenous Knowledge Systems in Mindanao Agriculture',
        timestamp: '2026-02-28T11:20:00.000Z',
        type: 'archived',
    },
    {
        id: 'act-005',
        actor: 'System Admin',
        action: 'Approved updated version:',
        researchTitle: 'Gender Equality in STEM - Updated Version 2.1',
        timestamp: '2026-02-27T09:00:00.000Z',
        type: 'version-approved',
    },
];
