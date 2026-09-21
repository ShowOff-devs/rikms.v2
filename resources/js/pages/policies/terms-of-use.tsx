import PolicyPageLayout, {
    PolicyList,
    PolicySection,
} from '@/components/public/policy-page-layout';

const description =
    'These Terms govern access to and use of the Regionwide Integrated Knowledge Management System (RIKMS) and its public and authorized services.';

const sections = [
    { id: 'acceptance', label: 'Acceptance of Terms' },
    { id: 'purpose', label: 'Purpose of RIKMS' },
    { id: 'user-responsibilities', label: 'User Responsibilities' },
    { id: 'prohibited-activities', label: 'Prohibited Activities' },
    { id: 'accounts-and-access', label: 'Accounts and Access' },
    { id: 'research-content', label: 'Research Content' },
    { id: 'intellectual-property', label: 'Intellectual Property' },
    { id: 'availability', label: 'Availability of the Service' },
    { id: 'accuracy', label: 'Accuracy of Information' },
    { id: 'restricted-research', label: 'Restricted Research' },
    { id: 'suspension', label: 'Suspension and Enforcement' },
    { id: 'changes', label: 'Changes to These Terms' },
    { id: 'governing-law', label: 'Governing Law' },
    { id: 'contact', label: 'Contact' },
];

export default function TermsOfUsePage() {
    return (
        <PolicyPageLayout
            currentPage="terms-of-use"
            title="Terms of Use"
            description={description}
            sections={sections}
        >
            <PolicySection id="acceptance" title="1. Acceptance of Terms">
                <p>
                    By accessing or using RIKMS, you agree to follow these Terms
                    and all applicable laws, ethical requirements, institutional
                    policies, and access conditions. If you do not agree, do not
                    use the platform.
                </p>
            </PolicySection>

            <PolicySection id="purpose" title="2. Purpose of RIKMS">
                <p>
                    RIKMS supports authorized public and institutional
                    activities including:
                </p>
                <PolicyList
                    items={[
                        'Research discovery and repository management',
                        'Research document submission and metadata management',
                        'Search, filtering, and responsible public access',
                        'Restricted-access management',
                        'Analytics, reporting, and institutional monitoring',
                        'Archiving and preservation of research records',
                    ]}
                />
            </PolicySection>

            <PolicySection
                id="user-responsibilities"
                title="3. User Responsibilities"
            >
                <p>
                    Users must provide accurate information, use RIKMS only for
                    lawful and authorized purposes, respect access
                    classifications, protect account credentials, follow
                    applicable research ethics and privacy obligations, and
                    promptly report suspected errors or security incidents.
                </p>
            </PolicySection>

            <PolicySection
                id="prohibited-activities"
                title="4. Prohibited Activities"
            >
                <p>Users must not:</p>
                <PolicyList
                    items={[
                        'Attempt unauthorized access or circumvent access controls',
                        'Upload malicious files or interfere with system availability or security',
                        'Perform unauthorized scraping, bulk extraction, or automated access',
                        'Upload intentionally false, misleading, or fraudulent information',
                        'Disclose confidential, restricted, or personal information without authority',
                        'Infringe copyright or other intellectual property rights',
                        'Misrepresent authorship, identity, authority, or institutional affiliation',
                        'Modify, replace, or remove research records without authorization',
                    ]}
                />
            </PolicySection>

            <PolicySection
                id="accounts-and-access"
                title="5. Accounts and Access"
            >
                <p>
                    Some services require an approved account and assigned role.
                    Account holders are responsible for activities conducted
                    through their credentials and must not share access. RIKMS
                    may require identity, affiliation, authorization, or email
                    verification before enabling protected functions.
                </p>
            </PolicySection>

            <PolicySection id="research-content" title="6. Research Content">
                <p>
                    Originating institutions and authorized submitters remain
                    responsible for the legality, accuracy, completeness,
                    classification, and authority to submit research content.
                    Publication in RIKMS does not constitute endorsement of a
                    study, its findings, or its conclusions.
                </p>
            </PolicySection>

            <PolicySection
                id="intellectual-property"
                title="7. Intellectual Property"
            >
                <p>
                    Submission to RIKMS does not automatically transfer
                    copyright ownership to RIKMS. Ownership remains with the
                    originating institution, author, researcher, or lawful
                    rights holder unless applicable law, contract, grant
                    condition, or institutional policy provides otherwise.
                </p>
                <p>
                    Users must observe copyright notices, licenses, attribution
                    requirements, access restrictions, and other rights attached
                    to each record or document.
                </p>
            </PolicySection>

            <PolicySection
                id="availability"
                title="8. Availability of the Service"
            >
                <p>
                    RIKMS may be unavailable during maintenance, security
                    response, technical failure, or circumstances outside
                    reasonable operational control. Features may be changed,
                    limited, or discontinued when required for lawful,
                    institutional, security, or operational reasons. Continuous
                    availability is not guaranteed.
                </p>
            </PolicySection>

            <PolicySection id="accuracy" title="9. Accuracy of Information">
                <p>
                    RIKMS seeks to maintain reliable repository information, but
                    originating institutions and rights holders are the primary
                    sources of submitted content. Users should verify critical
                    information with the responsible institution and report
                    suspected errors through the available support channel.
                </p>
            </PolicySection>

            <PolicySection
                id="restricted-research"
                title="10. Restricted Research"
            >
                <p>
                    Discoverability of metadata does not create a right to
                    receive a restricted document. Access requests may be
                    reviewed, approved, denied, limited, or revoked by
                    authorized personnel based on privacy, confidentiality,
                    ethics, intellectual property, institutional, or legal
                    requirements.
                </p>
            </PolicySection>

            <PolicySection
                id="suspension"
                title="11. Suspension and Enforcement"
            >
                <p>
                    RIKMS may restrict or suspend access, preserve relevant
                    logs, remove or quarantine content, or refer a matter to the
                    responsible institution when these Terms, access conditions,
                    security requirements, or applicable laws may have been
                    violated. Action will be proportionate to the circumstances
                    and available authority.
                </p>
            </PolicySection>

            <PolicySection id="changes" title="12. Changes to These Terms">
                <p>
                    These Terms may be updated to reflect service, policy,
                    legal, or security changes. Revised Terms will be published
                    on this page. Continued use after publication is subject to
                    the revised Terms.
                </p>
            </PolicySection>

            <PolicySection id="governing-law" title="13. Governing Law">
                <p>
                    These Terms are interpreted in accordance with applicable
                    laws and regulations of the Republic of the Philippines,
                    together with valid institutional requirements governing the
                    relevant user or research record.
                </p>
            </PolicySection>

            <PolicySection id="contact" title="14. Contact">
                <p>Questions about these Terms may be directed to:</p>
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
