import { describe, expect, it } from 'vitest';
import { formatActivityAction } from '@/components/admin/dashboard/SystemActivityFeed';

describe('formatActivityAction', () => {
    it('turns namespaced audit events into readable actions', () => {
        expect(formatActivityAction('admin.agency.deleted')).toBe('deleted');
        expect(formatActivityAction('agency.research.updated_metadata')).toBe(
            'updated metadata',
        );
    });

    it('supports non-namespaced actions', () => {
        expect(formatActivityAction('Access-Approved')).toBe('access approved');
    });
});
