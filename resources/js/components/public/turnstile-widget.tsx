import { useEffect, useRef } from 'react';

type TurnstileApi = {
    render: (
        element: HTMLElement,
        options: {
            sitekey: string;
            action: string;
            callback: (token: string) => void;
            'expired-callback': () => void;
            'error-callback': () => void;
        },
    ) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

type TurnstileWidgetProps = {
    id: string;
    enabled: boolean;
    siteKey?: string;
    action: string;
    resetKey?: number;
    onTokenChange: (token: string) => void;
    onError: (message: string) => void;
};

export default function TurnstileWidget({
    id,
    enabled,
    siteKey,
    action,
    resetKey = 0,
    onTokenChange,
    onError,
}: TurnstileWidgetProps) {
    const widgetId = useRef<string | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onTokenChangeRef.current = onTokenChange;
        onErrorRef.current = onError;
    }, [onError, onTokenChange]);

    useEffect(() => {
        if (!enabled || !siteKey) {
            return;
        }

        const reportUnavailable = () => {
            onTokenChangeRef.current('');
            onErrorRef.current(
                'Verification is temporarily unavailable. Please try again later.',
            );
        };

        const renderWidget = () => {
            const container = document.getElementById(id);

            if (
                !container ||
                container.childElementCount > 0 ||
                !window.turnstile
            ) {
                return;
            }

            widgetId.current = window.turnstile.render(container, {
                sitekey: siteKey,
                action,
                callback: (token) => {
                    onErrorRef.current('');
                    onTokenChangeRef.current(token);
                },
                'expired-callback': () => {
                    onTokenChangeRef.current('');
                    onErrorRef.current(
                        'Verification expired. Please complete it again.',
                    );
                },
                'error-callback': reportUnavailable,
            });
        };

        const removeWidget = () => {
            if (widgetId.current && window.turnstile) {
                window.turnstile.remove(widgetId.current);
                widgetId.current = null;
            }
        };

        if (window.turnstile) {
            renderWidget();

            return removeWidget;
        }

        const existingScript = document.querySelector<HTMLScriptElement>(
            'script[data-rikms-turnstile]',
        );

        if (existingScript) {
            existingScript.addEventListener('load', renderWidget, {
                once: true,
            });
            existingScript.addEventListener('error', reportUnavailable, {
                once: true,
            });

            return () => {
                existingScript.removeEventListener('load', renderWidget);
                existingScript.removeEventListener('error', reportUnavailable);
                removeWidget();
            };
        }

        const script = document.createElement('script');
        script.src =
            'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.rikmsTurnstile = 'true';
        script.addEventListener('load', renderWidget, { once: true });
        script.addEventListener('error', reportUnavailable, { once: true });
        document.head.appendChild(script);

        return () => {
            script.removeEventListener('load', renderWidget);
            script.removeEventListener('error', reportUnavailable);
            removeWidget();
        };
    }, [action, enabled, id, siteKey]);

    useEffect(() => {
        if (resetKey > 0 && widgetId.current && window.turnstile) {
            window.turnstile.reset(widgetId.current);
            onTokenChangeRef.current('');
        }
    }, [resetKey]);

    if (!enabled || !siteKey) {
        return null;
    }

    return (
        <div
            id={id}
            className="min-h-[65px] max-w-full overflow-hidden"
            aria-label="Security verification"
        />
    );
}
