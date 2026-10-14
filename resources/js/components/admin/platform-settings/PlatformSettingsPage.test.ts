import { describe, expect, it } from 'vitest';
import { platformSettingsValidationErrors } from '@/components/admin/platform-settings/PlatformSettingsPage';

describe('platformSettingsValidationErrors', () => {
    it('maps bulk-update validation errors to visible form fields', () => {
        expect(
            platformSettingsValidationErrors({
                'settings.site.name': ['The system name is invalid.'],
                'settings.backup.retention_days': [
                    'The value is above the supported maximum.',
                ],
                expected_versions: [
                    'Version checks do not match updated settings.',
                ],
            }),
        ).toEqual({
            systemName: 'The system name is invalid.',
            backupRetentionDays: 'The value is above the supported maximum.',
        });
    });
});
