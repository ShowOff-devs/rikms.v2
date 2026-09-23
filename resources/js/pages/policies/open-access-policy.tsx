import PolicyPageLayout, {
    AccessClassificationCards,
    PolicyList,
    PolicySection,
} from '@/components/public/policy-page-layout';

const description =
    'RIKMS supports responsible access to research knowledge while respecting intellectual property, privacy, confidentiality, ethical requirements, and institutional restrictions.';

export default function OpenAccessPolicyPage() {
    return (
        <PolicyPageLayout
            currentPage="open-access-policy"
            title="Open Access Policy"
            description={description}
        >
            <PolicySection id="policy-statement" title="1. Policy Statement">
                <p>
                    RIKMS promotes the discovery and responsible sharing of
                    regional research outputs. Access is provided according to
                    the authorization attached to each record and must balance
                    public benefit with lawful limits concerning intellectual
                    property, privacy, confidentiality, ethics, security, and
                    institutional responsibility.
                </p>
            </PolicySection>

            <PolicySection id="scope" title="2. Scope">
                <p>
                    This policy applies to research metadata, documents,
                    supporting files, and repository records submitted to or
                    managed through RIKMS by participating institutions. It
                    applies to public visitors, registered users, submitters,
                    reviewers, administrators, and authorized recipients.
                </p>
            </PolicySection>

            <PolicySection
                id="access-classifications"
                title="3. Access Classifications"
            >
                <p>
                    Each record must use an access classification approved by
                    the originating institution and supported by the platform.
                </p>
                <AccessClassificationCards />
            </PolicySection>

            <PolicySection id="public-metadata" title="4. Public Metadata">
                <p>Approved public metadata may include:</p>
                <PolicyList
                    items={[
                        'Research title and authors or researchers',
                        'Institutional affiliation',
                        'Abstract and keywords',
                        'Research category and year',
                        'Funding information where appropriate',
                        'Sustainable Development Goal classification',
                        'Other approved descriptive metadata',
                    ]}
                />
                <p>
                    Public metadata should be sufficient to support discovery
                    while excluding confidential, sensitive, or unauthorized
                    personal information.
                </p>
            </PolicySection>

            <PolicySection id="full-text-access" title="5. Full-Text Access">
                <p>
                    Full-text documents are made publicly available only when
                    the originating institution or lawful rights holder has
                    authorized that access. Restricted documents may require an
                    access request, identity or purpose review, acceptance of
                    conditions, or another authorized approval process. A public
                    metadata record does not guarantee full-text access.
                </p>
            </PolicySection>

            <PolicySection id="ownership" title="6. Ownership">
                <p>
                    Deposit or publication in RIKMS does not by itself transfer
                    copyright or other ownership. Rights remain with the author,
                    researcher, originating institution, funder, publisher, or
                    other lawful rights holder as determined by applicable law,
                    agreement, grant condition, or institutional policy.
                </p>
            </PolicySection>

            <PolicySection
                id="attribution-and-reuse"
                title="7. Attribution and Responsible Reuse"
            >
                <p>
                    Open access does not automatically mean unrestricted reuse.
                    Reuse remains subject to copyright, licensing, privacy,
                    research ethics, confidentiality, and institutional
                    requirements. Users must provide appropriate attribution,
                    avoid misleading alteration or representation, and obtain
                    any permission required for reproduction, redistribution,
                    adaptation, or commercial use.
                </p>
            </PolicySection>

            <PolicySection
                id="sensitive-information"
                title="8. Sensitive and Restricted Information"
            >
                <p>
                    Research involving personal data, confidential government or
                    institutional information, culturally sensitive material,
                    protected locations, security concerns, proprietary data,
                    ethics limitations, or third-party rights may be restricted,
                    redacted, or withheld. Only information authorized for
                    discovery should appear in public metadata.
                </p>
            </PolicySection>

            <PolicySection id="embargoes" title="9. Embargoes">
                <p>
                    An institution may delay full-text access for a justified
                    period required by publication, intellectual property,
                    funding, ethics, contractual, or institutional conditions.
                    Metadata may remain discoverable during an embargo when
                    approved. Access may be reconsidered when the applicable
                    condition ends.
                </p>
            </PolicySection>

            <PolicySection
                id="correction-and-withdrawal"
                title="10. Correction and Withdrawal"
            >
                <p>
                    Authorized institutions may request correction,
                    reclassification, replacement, withdrawal, or archiving of a
                    record when needed to address error, rights, privacy,
                    ethics, integrity, security, or legal concerns. RIKMS may
                    retain an appropriate administrative or audit record even
                    when public access is withdrawn.
                </p>
            </PolicySection>

            <PolicySection id="preservation" title="11. Preservation">
                <p>
                    RIKMS supports the continuity and integrity of approved
                    repository records through controlled storage, metadata
                    management, backups, recovery practices, audit information,
                    and archival workflows. Preservation does not override a
                    valid restriction on public access.
                </p>
            </PolicySection>
        </PolicyPageLayout>
    );
}
