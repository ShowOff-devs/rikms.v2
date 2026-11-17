import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAccomplishmentUploadPage from '@/pages/agency/upload/project-accomplishment';
import type { AgencyAuthSession } from '@/types/auth';

const { useAgencySession, uploadWizard } = vi.hoisted(() => ({
    useAgencySession: vi.fn<() => AgencyAuthSession | null>(),
    uploadWizard: vi.fn<
        (props: {
            agencyName?: string;
            initialResearchId?: string;
            recoveryScope?: {
                agencyId: string;
                userId: string;
                documentType: string;
            };
        }) => React.ReactNode
    >(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: { visit: vi.fn() },
}));

vi.mock('@/components/agency/AgencyAdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

vi.mock('@/components/upload/wizard/UploadWizard', () => ({
    default: (props: {
        agencyName?: string;
        initialResearchId?: string;
        recoveryScope?: {
            agencyId: string;
            userId: string;
            documentType: string;
        };
    }) => {
        uploadWizard(props);

        return <div data-agency-name={props.agencyName}>PAR wizard</div>;
    },
}));

vi.mock('@/lib/auth/agency-auth', () => ({ useAgencySession }));

function agencySession(
    overrides: Partial<AgencyAuthSession> = {},
): AgencyAuthSession {
    return {
        userId: 17,
        agencyId: 'dost-xi',
        agencyName: 'DOST XI',
        logoUrl: null,
        email: 'agency@example.test',
        portal: 'agency-admin',
        remember: false,
        loggedInAt: '2026-11-17T00:00:00.000Z',
        ...overrides,
    };
}

describe('Project Accomplishment Report upload agency context', () => {
    beforeEach(() => {
        useAgencySession.mockReset();
        uploadWizard.mockClear();
    });

    it('initializes the wizard with the authenticated agency name', () => {
        useAgencySession.mockReturnValue(agencySession());

        const html = renderToStaticMarkup(<ProjectAccomplishmentUploadPage />);

        expect(uploadWizard).toHaveBeenCalledWith(
            expect.objectContaining({
                agencyName: 'DOST XI',
                recoveryScope: {
                    agencyId: 'dost-xi',
                    userId: '17',
                    documentType: 'project-accomplishment',
                },
            }),
        );
        expect(html).toContain('data-agency-name="DOST XI"');
    });

    it('resumes the requested PAR draft with its isolated recovery scope', () => {
        useAgencySession.mockReturnValue(agencySession());

        renderToStaticMarkup(
            <ProjectAccomplishmentUploadPage researchId="73" />,
        );

        expect(uploadWizard).toHaveBeenCalledWith(
            expect.objectContaining({
                initialResearchId: '73',
                recoveryScope: {
                    agencyId: 'dost-xi',
                    userId: '17',
                    documentType: 'project-accomplishment',
                },
            }),
        );
    });

    it('blocks the wizard with a friendly message when agency context is missing', () => {
        useAgencySession.mockReturnValue(agencySession({ agencyName: '  ' }));

        const html = renderToStaticMarkup(<ProjectAccomplishmentUploadPage />);

        expect(uploadWizard).not.toHaveBeenCalled();
        expect(html).toContain('Agency context is unavailable');
        expect(html).toContain('uploads are blocked');
    });
});
