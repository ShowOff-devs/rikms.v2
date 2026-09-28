import { describe, expect, it } from 'vitest';
import { activityPaginationItems } from '@/components/admin/system-activity/ActivityPagination';

describe('activity pagination', () => {
    it('shows every page for short result sets', () => {
        expect(activityPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
    });

    it('compacts long result sets around the active page', () => {
        expect(activityPaginationItems(10, 20)).toEqual([
            1,
            'ellipsis-left',
            9,
            10,
            11,
            'ellipsis-right',
            20,
        ]);
    });

    it('keeps useful page links near both boundaries', () => {
        expect(activityPaginationItems(1, 20)).toEqual([
            1,
            2,
            3,
            4,
            5,
            'ellipsis-right',
            20,
        ]);
        expect(activityPaginationItems(20, 20)).toEqual([
            1,
            'ellipsis-left',
            16,
            17,
            18,
            19,
            20,
        ]);
    });
});
