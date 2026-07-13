import { usePage } from '@inertiajs/react';

type SharedUploadLimits = {
    effectiveMb?: unknown;
};

export function useEffectiveUploadLimitMb(fallbackMb = 10) {
    const { uploadLimits } = usePage().props as {
        uploadLimits?: SharedUploadLimits;
    };
    const limit = Number(uploadLimits?.effectiveMb);

    return Number.isFinite(limit) && limit > 0 ? limit : fallbackMb;
}

export function uploadLimitBytes(limitMb: number) {
    return limitMb * 1024 * 1024;
}

export function uploadLimitLabel(limitMb: number) {
    return `${limitMb} MB`;
}
