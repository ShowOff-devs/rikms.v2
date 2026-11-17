type RequiredIndicatorProps = {
    className?: string;
};

export function RequiredIndicator({ className = '' }: RequiredIndicatorProps) {
    return (
        <span
            aria-hidden="true"
            className={`ml-0.5 text-[#fb2c36] ${className}`}
        >
            *
        </span>
    );
}

export function InlineFieldError({
    id,
    message,
}: {
    id: string;
    message?: string;
}) {
    if (!message) {
        return null;
    }

    return (
        <span
            id={id}
            role="alert"
            className="mt-1 block text-xs font-medium text-[#b91c1c]"
        >
            {message}
        </span>
    );
}
