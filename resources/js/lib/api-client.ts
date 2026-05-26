export type ApiEnvelope<TData, TMeta = Record<string, unknown>> = {
    message: string;
    data: TData;
    meta: TMeta;
};

export async function fetchApi<TData>(
    url: string,
    init: RequestInit = {},
): Promise<ApiEnvelope<TData>> {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(init.headers ?? {}),
        },
        ...init,
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message ?? 'Unable to complete API request.');
    }

    return payload as ApiEnvelope<TData>;
}
