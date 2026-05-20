import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type {
    DefaultValues,
    FieldValues,
    Resolver,
    SubmitHandler,
} from 'react-hook-form';
import type { z } from 'zod';

type UploadStepFormProps<TFieldValues extends FieldValues> = {
    defaultValues: DefaultValues<TFieldValues>;
    schema?: z.ZodTypeAny;
    children: ReactNode;
    className?: string;
    onChange: (values: TFieldValues) => void;
    onSubmit?: SubmitHandler<TFieldValues>;
};

export default function UploadStepForm<TFieldValues extends FieldValues>({
    defaultValues,
    schema,
    children,
    className,
    onChange,
    onSubmit,
}: UploadStepFormProps<TFieldValues>) {
    const resolver = schema
        ? (
              zodResolver as unknown as (
                  schema: z.ZodTypeAny,
              ) => Resolver<TFieldValues>
          )(schema)
        : undefined;
    const form = useForm<TFieldValues>({
        defaultValues,
        mode: 'onChange',
        resolver,
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/incompatible-library
        const subscription = form.watch((values) =>
            onChange(values as TFieldValues),
        );

        return () => subscription.unsubscribe();
    }, [form, onChange]);

    return (
        <FormProvider {...form}>
            <form
                className={className}
                onSubmit={form.handleSubmit(
                    (onSubmit ??
                        (() => undefined)) as SubmitHandler<TFieldValues>,
                )}
            >
                {children}
            </form>
        </FormProvider>
    );
}
