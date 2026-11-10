import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            uploadLimits: {
                configuredMb: number;
                phpUploadMaxFilesizeMb: number;
                phpPostMaxSizeMb: number;
                effectiveMb: number;
            };
            flash?: Partial<
                Record<
                    'success' | 'info' | 'warning' | 'error',
                    | string
                    | {
                          title?: string;
                          description?: string;
                          message?: string;
                      }
                    | null
                >
            >;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
