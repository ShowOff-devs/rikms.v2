import { describe, expect, it } from 'vitest';
import { securityCenterPaginationItems } from '@/components/admin/security-center/SecurityCenterPagination';

describe('securityCenterPaginationItems', () => {
    it('shows every page when there are seven or fewer', () => {
        expect(securityCenterPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
    });

    it('condenses pages around the current page', () => {
        expect(securityCenterPaginationItems(10, 20)).toEqual([
            1,
            'ellipsis-left',
            9,
            10,
            11,
            'ellipsis-right',
            20,
        ]);
    });

    it('keeps the first and last page ranges visible', () => {
        expect(securityCenterPaginationItems(1, 20)).toEqual([
            1,
            2,
            3,
            4,
            5,
            'ellipsis-right',
            20,
        ]);
        expect(securityCenterPaginationItems(20, 20)).toEqual([
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
