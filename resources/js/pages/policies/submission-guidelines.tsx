import PolicyPageLayout, {
    AccessClassificationCards,
    PolicyList,
    PolicySection,
    PolicySubsection,
} from '@/components/public/policy-page-layout';

const description =
    'These guidelines establish the minimum requirements for submitting research outputs to RIKMS and maintaining a reliable, searchable, secure, and consistent regional research repository.';

const sections = [
    { id: 'purpose', label: 'Purpose' },
    { id: 'who-may-submit', label: 'Who May Submit' },
    { id: 'accepted-outputs', label: 'Accepted Research Outputs' },
    { id: 'general-requirements', label: 'General Submission Requirements' },
    { id: 'required-metadata', label: 'Required Metadata' },
    { id: 'document-requirements', label: 'Document Requirements' },
    { id: 'accuracy', label: 'Accuracy and Completeness' },
    { id: 'privacy', label: 'Privacy and Confidentiality' },
    { id: 'copyright', label: 'Copyright and Submission Authority' },
    { id: 'access-classification', label: 'Access Classification' },
    { id: 'review', label: 'Review and Validation' },
    { id: 'duplicates', label: 'Duplicate Submissions' },
    { id: 'changes-after-submission', label: 'Changes After Submission' },
    { id: 'rejection', label: 'Grounds for Rejection or Restriction' },
    {
        id: 'institutional-responsibility',
        label: 'Responsibility of the Originating Institution',
    },
    { id: 'assistance', label: 'Assistance' },
];

export default function SubmissionGuidelinesPage() {
    return (
        <PolicyPageLayout
            currentPage="submission-guidelines"
            title="Submission Guidelines"
            description={description}
            sections={sections}
        >
            <PolicySection id="purpose" title="1. Purpose">
                <p>
                    These guidelines define baseline quality, authority,
                    security, and metadata expectations for research outputs
                    managed through RIKMS. Participating institutions may apply
                    additional lawful review requirements appropriate to their
                    records.
                </p>
            </PolicySection>

            <PolicySection id="who-may-submit" title="2. Who May Submit">
                <p>
                    Submissions may be made by authorized personnel of a
                    participating institution or by another person expressly
                    permitted to act for the originating institution or lawful
                    rights holder. Public visitors cannot directly publish
                    research records through the public portal.
                </p>
            </PolicySection>

            <PolicySection
                id="accepted-outputs"
                title="3. Accepted Research Outputs"
            >
                <p>The primary RIKMS research outputs are:</p>
                <PolicyList
                    ordered
                    items={[
                        'Research Studies',
                        'Terminal Reports',
                        'Project Accomplishment Reports',
                    ]}
                />
            </PolicySection>

            <PolicySection
                id="general-requirements"
                title="4. General Submission Requirements"
            >
                <p>A submission must:</p>
                <PolicyList
                    items={[
                        'Fall within an accepted output type and the submitting institution’s authority',
                        'Contain complete, consistent, and understandable metadata',
                        'Include the required document and directly relevant supporting files',
                        'Use an appropriate access classification',
                        'Respect copyright, privacy, confidentiality, ethics, and security requirements',
                        'Be submitted through an authorized account and repository workflow',
                    ]}
                />
            </PolicySection>

            <PolicySection id="required-metadata" title="5. Required Metadata">
                <PolicySubsection title="Research information">
                    <PolicyList
                        items={[
                            'Title',
                            'Authors, researchers, or proponents',
                            'Institutional affiliation',
                            'Abstract or executive summary',
                            'Keywords and research category',
                            'Year and research status',
                        ]}
                    />
                </PolicySubsection>
                <PolicySubsection title="Project or report information, where applicable">
                    <PolicyList
                        items={[
                            'Project start and end dates',
                            'Reporting period and funding source',
                            'PAP classification and beneficiary information',
                            'Project accomplishments and highlights',
                            'Performance targets and actual accomplishments',
                        ]}
                    />
                </PolicySubsection>
                <PolicySubsection title="Financial information, where applicable">
                    <PolicyList
                        items={[
                            'Approved or allotted amount',
                            'Obligated amount',
                            'Released or utilized amount',
                            'Financial reporting date',
                        ]}
                    />
                </PolicySubsection>
                <PolicySubsection title="Development alignment">
                    <PolicyList
                        items={[
                            'Sustainable Development Goals (SDGs)',
                            'Other approved development priorities',
                        ]}
                    />
                </PolicySubsection>
            </PolicySection>

            <PolicySection
                id="document-requirements"
                title="6. Document Requirements"
            >
                <PolicyList
                    items={[
                        'The main document should normally be provided as a PDF',
                        'The document must be readable and complete',
                        'Scanned files must have sufficient quality for review and use',
                        'Files must not contain malware or other harmful content',
                        'Password-protected or encrypted files should not be submitted unless specifically permitted',
                        'Metadata must correspond to the uploaded document',
                        'Supporting documents must relate directly to the research or project',
                        'Documents must not contain unauthorized confidential or personal information',
                    ]}
                />
            </PolicySection>

            <PolicySection id="accuracy" title="7. Accuracy and Completeness">
                <p>
                    The submitter must review names, titles, dates, figures,
                    classifications, access settings, and documents before
                    submission. Material omissions, conflicting information,
                    unreadable files, or unsupported claims may delay review or
                    result in return, restriction, or rejection.
                </p>
            </PolicySection>

            <PolicySection id="privacy" title="8. Privacy and Confidentiality">
                <p>
                    Submitters must remove or appropriately restrict personal,
                    confidential, sensitive, proprietary, or ethics-protected
                    information that is not authorized for public disclosure.
                    Consent, ethics approval, redaction, or another lawful basis
                    must be obtained where required. Public metadata fields must
                    not be used to disclose restricted information.
                </p>
            </PolicySection>

            <PolicySection
                id="copyright"
                title="9. Copyright and Submission Authority"
            >
                <p>
                    The submitter must have authority to deposit the record and
                    permit its selected level of access. Submission does not
                    automatically transfer copyright to RIKMS. Any publisher,
                    funder, contractual, institutional, or third-party rights
                    conditions must be observed and documented where necessary.
                </p>
            </PolicySection>

            <PolicySection
                id="access-classification"
                title="10. Access Classification"
            >
                <p>
                    The originating institution must choose and justify the
                    classification appropriate to the content and its rights.
                </p>
                <AccessClassificationCards />
            </PolicySection>

            <PolicySection id="review" title="11. Review and Validation">
                <p>
                    Authorized reviewers may check metadata quality, document
                    readability, duplication, institutional ownership, access
                    classification, security validation, and compliance with
                    repository requirements. Submission does not guarantee
                    publication. Review may include requests for clarification,
                    correction, replacement, or additional authorization.
                </p>
            </PolicySection>

            <PolicySection id="duplicates" title="12. Duplicate Submissions">
                <p>
                    Submitters should search RIKMS before creating a new record.
                    A duplicate, near-duplicate, or revised version must be
                    identified and handled through the applicable correction or
                    revision workflow. Separate records should not be used to
                    bypass review or access decisions.
                </p>
            </PolicySection>

            <PolicySection
                id="changes-after-submission"
                title="13. Changes After Submission"
            >
                <p>
                    Changes to submitted or published records must use
                    authorized editing, review, revision, correction, or
                    archival workflows. Significant changes may require renewed
                    validation. Audit and preservation information may be
                    retained to protect record integrity.
                </p>
            </PolicySection>

            <PolicySection
                id="rejection"
                title="14. Grounds for Rejection or Restriction"
            >
                <p>
                    A submission may be rejected, returned, or restricted when
                    it:
                </p>
                <PolicyList
                    items={[
                        'Is incomplete, inaccurate, unreadable, or outside the repository scope',
                        'Duplicates an existing record without a valid revision purpose',
                        'Contains malware, unsafe files, or unsupported protected files',
                        'Lacks submission authority or conflicts with copyright or contractual conditions',
                        'Contains unauthorized personal, confidential, sensitive, or unethical material',
                        'Uses an inappropriate access classification or fails required validation',
                    ]}
                />
            </PolicySection>

            <PolicySection
                id="institutional-responsibility"
                title="15. Responsibility of the Originating Institution"
            >
                <p>
                    The originating institution remains responsible for the
                    authority, accuracy, classification, validation, correction,
                    and continuing management of its submissions. It should
                    designate authorized personnel, respond to legitimate review
                    or access matters, and notify RIKMS when a record requires
                    correction, restriction, withdrawal, or archival treatment.
                </p>
            </PolicySection>

            <PolicySection id="assistance" title="16. Assistance">
                <p>
                    For clarification about metadata, document preparation,
                    classification, or repository review, contact the authorized
                    RIKMS representative for the originating institution or the
                    RIKMS Administrator.
                </p>
                <address className="not-italic">
                    <strong>RIKMS Administrator</strong>
                    <br />
                    Email: [Official Email]
                    <br />
                    Telephone: [Contact Number]
                </address>
            </PolicySection>
        </PolicyPageLayout>
    );
}
