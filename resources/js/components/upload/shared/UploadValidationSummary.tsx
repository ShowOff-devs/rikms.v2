import type { FieldErrors } from 'react-hook-form';

type UploadValidationSummaryProps = {
    errors: FieldErrors;
};

function collectMessages(errors: FieldErrors) {
    return Object.values(errors)
        .map((error) => {
            if (error && 'message' in error && error.message) {
                return String(error.message);
            }

            return null;
        })
        .filter((message): message is string => Boolean(message));
}

export default function UploadValidationSummary({
    errors,
}: UploadValidationSummaryProps) {
    const messages = collectMessages(errors);

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 rounded-[10px] border border-[#fecaca] bg-[#fff1f2] p-3 text-sm text-[#b91c1c]">
            <p className="font-semibold">Please resolve this step first.</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                {messages.map((message) => (
                    <li key={message}>{message}</li>
                ))}
            </ul>
        </div>
    );
}
