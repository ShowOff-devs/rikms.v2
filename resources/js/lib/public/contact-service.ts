import { fetchApi } from '@/lib/api-client';

export type PublicContactPayload = {
    name: string;
    email: string;
    organization?: string;
    concern_type: string;
    research_reference?: string;
    subject: string;
    message: string;
    website?: string;
    captcha_token?: string;
};

export async function submitPublicContactInquiry(
    payload: PublicContactPayload,
) {
    return fetchApi<null>('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
