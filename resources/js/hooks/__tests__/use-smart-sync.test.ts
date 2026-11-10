import { describe, expect, it } from 'vitest';
import { settledSyncState } from '@/hooks/use-smart-sync';

describe('smart document synchronization', () => {
    it('only marks the exact saved local version as synced', () => {
        expect(
            settledSyncState({ requestId: 2, editVersion: 4 }, 2, 4, true),
        ).toBe('synced');
        expect(
            settledSyncState({ requestId: 2, editVersion: 4 }, 2, 5, true),
        ).toBe('unsaved');
    });

    it('ignores stale requests and preserves failed state for the latest version', () => {
        expect(
            settledSyncState({ requestId: 1, editVersion: 4 }, 2, 4, true),
        ).toBeNull();
        expect(
            settledSyncState({ requestId: 2, editVersion: 4 }, 2, 4, false),
        ).toBe('failed');
    });
});
