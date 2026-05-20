import type {
    FieldError,
    FieldErrors,
    FieldValues,
    Path,
} from 'react-hook-form';

type UploadFieldErrorProps<TFieldValues extends FieldValues> = {
    errors: FieldErrors<TFieldValues>;
    name: Path<TFieldValues>;
};

export default function UploadFieldError<TFieldValues extends FieldValues>({
    errors,
    name,
}: UploadFieldErrorProps<TFieldValues>) {
    const error = errors[name] as FieldError | undefined;

    if (!error?.message) {
        return null;
    }

    return (
        <p className="mt-1 text-xs font-medium text-[#dc2626]">
            {error.message}
        </p>
    );
}
