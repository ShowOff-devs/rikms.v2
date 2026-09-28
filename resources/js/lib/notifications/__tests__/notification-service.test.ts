import { describe, expect, it } from 'vitest';
import { agencyNotificationsPath } from '@/lib/notifications/notification-service';

describe('agency notification pagination paths', () => {
    it('includes page size search and unread state', () => {
        expect(
            agencyNotificationsPath({
                page: 3,
                perPage: 25,
                search: '  budget review  ',
                filter: 'unread',
            }),
        ).toBe(
            '/api/agency/notifications?page=3&per_page=25&search=budget+review&status=unread',
        );
    });

    it('sends notification categories to the paginated endpoint', () => {
        expect(
            agencyNotificationsPath({
                page: 1,
                perPage: 10,
                filter: 'access-request',
            }),
        ).toBe(
            '/api/agency/notifications?page=1&per_page=10&category=access-request',
        );
    });
});
