import { beforeEach, describe, expect, it } from 'vitest';
import {
    getToastSnapshot,
    resetToastsForTests,
    toast,
    TOAST_DURATIONS,
} from '@/lib/toast';

describe('global toast service', () => {
    beforeEach(resetToastsForTests);

    it('uses the required duration and persistence rules', () => {
        expect(TOAST_DURATIONS).toEqual({
            success: 3000,
            info: 4000,
            warning: 5000,
            error: null,
            loading: null,
        });
    });

    it('prevents duplicate notifications', () => {
        toast.success('Saved', 'The record was saved.');
        toast.success('Changes saved', 'The record was saved.');

        expect(getToastSnapshot()).toHaveLength(1);
    });

    it('updates a loading notification in place', () => {
        const id = toast.loading('Uploading document');
        toast.update(id, {
            type: 'success',
            title: 'Document uploaded',
        });

        expect(getToastSnapshot()).toMatchObject([
            { id, type: 'success', title: 'Document uploaded', duration: 3000 },
        ]);
    });

    it('keeps persistent errors until they are dismissed', () => {
        const id = toast.error('Unable to save');

        expect(getToastSnapshot()[0].duration).toBeNull();
        toast.dismiss(id);
        expect(getToastSnapshot()).toEqual([]);
    });
});
