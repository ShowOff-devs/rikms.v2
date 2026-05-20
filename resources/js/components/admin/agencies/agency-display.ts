import type { AgencyType } from '@/types/admin-agencies';

export const agencyTypeLabels: Record<AgencyType, string> = {
    'government-agency': 'Government Agency',
    'higher-education-institution': 'Higher Education Institution',
    'research-consortium': 'Research Consortium',
    'industry-partner': 'Industry Partner',
    other: 'Other',
};

export const agencyTypeOptions = Object.entries(agencyTypeLabels).map(
    ([value, label]) => ({
        value: value as AgencyType,
        label,
    }),
);

export function formatAgencyDate(value: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}
