import PolicyPageLayout, {
    PolicyList,
    PolicySection,
    PolicySubsection,
} from '@/components/public/policy-page-layout';

const description =
    'This Privacy Policy explains how the Regionwide Integrated Knowledge Management System (RIKMS) collects, uses, protects, stores, and manages personal information and research-related information processed through the platform.';

const sections = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'information-we-may-collect', label: 'Information We May Collect' },
    { id: 'purpose-of-processing', label: 'Purpose of Processing' },
    { id: 'lawful-processing', label: 'Lawful Processing' },
    {
        id: 'public-and-restricted-information',
        label: 'Public and Restricted Information',
    },
    { id: 'disclosure-and-sharing', label: 'Disclosure and Sharing' },
    { id: 'data-security', label: 'Data Security' },
    { id: 'data-retention', label: 'Data Retention' },
    { id: 'rights-of-data-subjects', label: 'Rights of Data Subjects' },
    { id: 'third-party-links', label: 'Third-Party Links' },
    { id: 'changes', label: 'Changes to this Privacy Policy' },
    { id: 'privacy-contact', label: 'Privacy Contact' },
];

export default function PrivacyPolicyPage() {
    return (
        <PolicyPageLayout
            currentPage="privacy-policy"
            title="Privacy Policy"
            description={description}
            sections={sections}
        >
            <PolicySection id="introduction" title="1. Introduction">
                <p>
                    RIKMS is a digital research and knowledge repository
                    established to support the submission, management,
                    preservation, discovery, monitoring, and dissemination of
                    research outputs in the Davao Region.
                </p>
                <p>
                    RIKMS is committed to handling personal information in
                    accordance with applicable Philippine data privacy laws and
                    regulations. This policy applies to public visitors,
                    registered users, researchers, institutional personnel, and
                    other individuals whose information is processed through the
                    platform.
                </p>
            </PolicySection>

            <PolicySection
                id="information-we-may-collect"
                title="2. Information We May Collect"
            >
                <PolicySubsection title="2.1 Account and Profile Information">
                    <p>
                        Account administration may require information such as:
                    </p>
                    <PolicyList
                        items={[
                            'Full name',
                            'Institutional or agency affiliation',
                            'Position or designation',
                            'Email address and contact information',
                            'Account authentication information',
                            'User roles and permissions',
                        ]}
                    />
                </PolicySubsection>
                <PolicySubsection title="2.2 Research and Submission Information">
                    <p>Information submitted to the repository may include:</p>
                    <PolicyList
                        items={[
                            'Research title, authors, researchers, and proponents',
                            'Abstracts, keywords, and research classifications',
                            'Research dates and institutional affiliations',
                            'Funding information and SDG classifications',
                            'Performance information and project accomplishments',
                            'Uploaded research documents and supporting files',
                        ]}
                    />
                </PolicySubsection>
                <PolicySubsection title="2.3 Technical and Usage Information">
                    <p>
                        RIKMS may process device, browser, network, request,
                        download, authentication, audit, and technical/security
                        logs needed to operate, secure, troubleshoot, and
                        improve the service.
                    </p>
                </PolicySubsection>
                <PolicySubsection title="2.4 Cookies and Similar Technologies">
                    <p>
                        Essential cookies and comparable browser storage may be
                        used to maintain sessions, remember necessary interface
                        preferences, protect forms, and support security. RIKMS
                        does not use this policy to authorize unrelated
                        advertising tracking.
                    </p>
                </PolicySubsection>
            </PolicySection>

            <PolicySection
                id="purpose-of-processing"
                title="3. Purpose of Processing"
            >
                <p>Information may be processed to:</p>
                <PolicyList
                    items={[
                        'Create and administer authorized accounts and permissions',
                        'Receive, validate, manage, archive, and publish research records',
                        'Enable research discovery, access requests, and institutional communication',
                        'Produce authorized monitoring, reporting, and repository analytics',
                        'Protect the platform, investigate misuse, and preserve auditability',
                        'Comply with applicable legal, ethical, contractual, and institutional requirements',
                    ]}
                />
            </PolicySection>

            <PolicySection id="lawful-processing" title="4. Lawful Processing">
                <p>
                    RIKMS processes information only when an appropriate basis
                    applies, which may include consent, legal obligation,
                    performance of official or institutional functions,
                    fulfillment of an authorized service, protection of
                    legitimate interests, or another basis recognized by
                    applicable law. The applicable basis depends on the
                    information and the context in which it is processed.
                </p>
            </PolicySection>

            <PolicySection
                id="public-and-restricted-information"
                title="5. Public and Restricted Information"
            >
                <p>
                    Approved research metadata and documents classified for
                    public access may be visible without an account. Restricted
                    records may expose only approved descriptive metadata and
                    require authorization before a full document is released.
                    Account credentials, internal security data, confidential
                    material, and non-public administrative information are not
                    intended for public disclosure.
                </p>
                <p>
                    Submitters must avoid including personal, confidential, or
                    sensitive information in public fields unless its disclosure
                    is lawful, necessary, and properly authorized.
                </p>
            </PolicySection>

            <PolicySection
                id="disclosure-and-sharing"
                title="6. Disclosure and Sharing"
            >
                <p>
                    Information may be shared with authorized RIKMS personnel,
                    the responsible originating institution, approved service
                    providers, lawful oversight bodies, or other parties when
                    required or permitted by law. Access is limited to what is
                    necessary for repository operations, review, security,
                    support, preservation, or a valid legal requirement. RIKMS
                    does not sell personal information.
                </p>
            </PolicySection>

            <PolicySection id="data-security" title="7. Data Security">
                <p>
                    RIKMS applies administrative, organizational, and technical
                    safeguards appropriate to the information and operational
                    risks involved. Safeguards may include:
                </p>
                <PolicyList
                    items={[
                        'Role-based access control and account authentication',
                        'Secure communication and encryption where appropriate',
                        'Audit trails and security monitoring',
                        'File security validation and controlled storage',
                        'Backup and recovery mechanisms',
                        'Access review, incident handling, and operational maintenance',
                    ]}
                />
                <p>
                    No system can guarantee absolute security. Users must
                    protect their credentials and promptly report suspected
                    unauthorized access.
                </p>
            </PolicySection>

            <PolicySection id="data-retention" title="8. Data Retention">
                <p>
                    Information is retained only for as long as reasonably
                    necessary for the repository purpose, institutional record
                    management, research preservation, audit, security, dispute
                    resolution, and applicable legal requirements. Retention may
                    differ by record type and access classification. No fixed
                    retention period is established by this public policy.
                </p>
            </PolicySection>

            <PolicySection
                id="rights-of-data-subjects"
                title="9. Rights of Data Subjects"
            >
                <p>
                    Subject to applicable law and valid limitations, individuals
                    may request information about processing and exercise rights
                    concerning access, correction, objection, erasure or
                    blocking, data portability, withdrawal of consent, and
                    complaints. RIKMS may need to verify identity and coordinate
                    with the institution responsible for the record before
                    acting on a request.
                </p>
            </PolicySection>

            <PolicySection id="third-party-links" title="10. Third-Party Links">
                <p>
                    RIKMS may link to institutional repositories, external
                    publications, or other websites. Their operators control
                    their own content and privacy practices. Users should review
                    the applicable third-party policies before providing
                    information or using those services.
                </p>
            </PolicySection>

            <PolicySection
                id="changes"
                title="11. Changes to this Privacy Policy"
            >
                <p>
                    This policy may be revised to reflect operational, legal,
                    security, or service changes. Material revisions will be
                    published on this page with an updated revision date where
                    appropriate.
                </p>
            </PolicySection>

            <PolicySection id="privacy-contact" title="12. Privacy Contact">
                <p>
                    Privacy questions, requests, or concerns may be directed to:
                </p>
                <address className="not-italic">
                    <strong>Data Protection Officer / Privacy Office</strong>
                    <br />
                    Email: [Privacy Email Address]
                    <br />
                    Telephone: [Contact Number]
                    <br />
                    Address: [Official Address]
                </address>
            </PolicySection>
        </PolicyPageLayout>
    );
}
