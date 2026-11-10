import { useCallback, useRef, useState } from 'react';
import type { DocumentSyncState } from '@/components/repository/edit/DocumentSyncStatus';

export type SaveToken = {
    requestId: number;
    editVersion: number;
};

export function settledSyncState(
    token: SaveToken,
    latestRequestId: number,
    latestEditVersion: number,
    succeeded: boolean,
): DocumentSyncState | null {
    if (token.requestId !== latestRequestId) {
        return null;
    }

    if (token.editVersion !== latestEditVersion) {
        return 'unsaved';
    }

    return succeeded ? 'synced' : 'failed';
}

export function useSmartSync() {
    const [state, setState] = useState<DocumentSyncState>('unverified');
    const editVersion = useRef(0);
    const requestId = useRef(0);

    const markChanged = useCallback(() => {
        editVersion.current += 1;
        setState((current) => (current === 'saving' ? current : 'unsaved'));
    }, []);

    const beginSave = useCallback((): SaveToken => {
        const token = {
            requestId: ++requestId.current,
            editVersion: editVersion.current,
        };
        setState('saving');

        return token;
    }, []);

    const settle = useCallback((token: SaveToken, succeeded: boolean) => {
        const next = settledSyncState(
            token,
            requestId.current,
            editVersion.current,
            succeeded,
        );

        if (next) {
            setState(next);
        }

        return next === 'synced';
    }, []);

    return {
        state,
        markChanged,
        beginSave,
        completeSave: (token: SaveToken) => settle(token, true),
        failSave: (token: SaveToken) => settle(token, false),
    };
}
