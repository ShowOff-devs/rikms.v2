import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildPlatformSettingsUpdate,
    updatePlatformSettings,
} from '@/lib/admin/platform-settings-service';
import type { PlatformSettings } from '@/types/platform-settings';

function settingsFixture(): PlatformSettings {
    return {
        versions: {
            'site.name': 'a'.repeat(64),
            'site.short_name': 'b'.repeat(64),
            'maintenance.enabled': 'c'.repeat(64),
            'backup.last_backup_at': 'd'.repeat(64),
            'backup.status': 'e'.repeat(64),
        },
        general: {
            systemName: 'RIKMS v2',
            shortName: 'RIKMS',
            defaultLanguage: 'English',
            timezone: 'Asia/Manila (UTC+8)',
        },
        repository: {
            maxUploadSizeMb: 25,
            effectiveMaxUploadSizeMb: 20,
            allowedFileTypes: ['PDF'],
            defaultResearchStatus: 'draft',
            requireAuthors: true,
            requireAbstract: true,
            requireKeywords: false,
            requirePublicationYear: true,
        },
        accessControl: {
            accessRequestEnabled: true,
            defaultAccessPolicy: 'request-access',
            embargoOverrideEnabled: false,
            embargoDurationMonths: 6,
        },
        security: {
            requireMfaForSuperAdmins: true,
            loginAlertsEnabled: true,
            failedLoginThreshold: 5,
            lockoutDurationMinutes: 15,
            sessionTimeoutMinutes: 60,
        },
        notifications: {
            systemNotificationsEnabled: true,
            emailNotificationsEnabled: false,
            securityAlertsEnabled: true,
            notifyAccessRequestSubmitted: true,
            notifyResearchPublished: true,
            notifyWeeklyActivityDigest: false,
        },
        maintenance: {
            maintenanceModeEnabled: false,
            maintenanceMessage: 'Maintenance in progress.',
        },
        ai: { processingEnabled: false },
        backup: {
            lastBackupAt: 'Not configured',
            backupFrequency: 'Daily at 03:00 AM',
            backupStatus: 'idle',
            destinationLabel: 'External drive',
            retentionDays: 30,
        },
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('buildPlatformSettingsUpdate', () => {
    it('includes only one changed setting and its matching version', () => {
        const initial = settingsFixture();
        const changed = structuredClone(initial);
        changed.general.systemName = 'RIKMS Pilot';

        expect(buildPlatformSettingsUpdate(changed, initial)).toEqual({
            settings: { 'site.name': 'RIKMS Pilot' },
            expected_versions: { 'site.name': 'a'.repeat(64) },
        });
    });

    it('keeps multiple changed settings and versions in deterministic order', () => {
        const initial = settingsFixture();
        const changed = structuredClone(initial);
        changed.general.systemName = 'RIKMS Pilot';
        changed.general.shortName = 'Pilot';

        const update = buildPlatformSettingsUpdate(changed, initial);

        expect(Object.keys(update.settings)).toEqual([
            'site.name',
            'site.short_name',
        ]);
        expect(Object.keys(update.expected_versions)).toEqual([
            'site.name',
            'site.short_name',
        ]);
    });

    it('returns an empty update for unchanged settings', () => {
        const initial = settingsFixture();

        expect(buildPlatformSettingsUpdate(initial, initial)).toEqual({
            settings: {},
            expected_versions: {},
        });
    });

    it('never includes read-only display settings or their versions', () => {
        const initial = settingsFixture();
        const changed = structuredClone(initial);
        changed.backup.lastBackupAt = '2026-10-14T08:00:00Z';
        changed.backup.backupStatus = 'completed';

        expect(buildPlatformSettingsUpdate(changed, initial)).toEqual({
            settings: {},
            expected_versions: {},
        });
    });
});

describe('updatePlatformSettings', () => {
    it('does not send a request for an empty change set', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const initial = settingsFixture();

        await expect(updatePlatformSettings(initial, initial)).resolves.toBe(
            initial,
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('submits matching keys and refreshes settings and versions after save', async () => {
        const initial = settingsFixture();
        const changed = structuredClone(initial);
        changed.general.systemName = 'RIKMS Pilot';
        const refreshedVersion = 'f'.repeat(64);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({ message: 'Updated.', data: [], meta: {} }),
                    { status: 200 },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        message: 'Loaded.',
                        data: [
                            {
                                key: 'site.name',
                                value: 'RIKMS Pilot',
                                type: 'string',
                                version: refreshedVersion,
                            },
                        ],
                        meta: {},
                    }),
                    { status: 200 },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const result = await updatePlatformSettings(changed, initial);
        const request = JSON.parse(
            String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
        ) as {
            settings: Record<string, unknown>;
            expected_versions: Record<string, string | null>;
        };

        expect(request.settings).toEqual({ 'site.name': 'RIKMS Pilot' });
        expect(request.expected_versions).toEqual({
            'site.name': 'a'.repeat(64),
        });
        expect(fetchMock.mock.calls[1]?.[0]).toBe(
            '/api/admin/platform-settings?per_page=100',
        );
        expect(result.versions['site.name']).toBe(refreshedVersion);
    });
});
