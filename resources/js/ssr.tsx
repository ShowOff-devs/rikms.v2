import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { ToastProvider } from '@/components/ui/toast-provider';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) =>
            title
                ? title.endsWith(`| ${appName}`)
                    ? title
                    : `${title} - ${appName}`
                : appName,
        resolve: (name) =>
            resolvePageComponent(
                `./pages/${name}.tsx`,
                import.meta.glob('./pages/**/*.tsx'),
            ),
        setup: ({ App, props }) => {
            return (
                <ToastProvider initialPage={page}>
                    <App {...props} />
                </ToastProvider>
            );
        },
    }),
);
