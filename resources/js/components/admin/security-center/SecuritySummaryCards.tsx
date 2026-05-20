import { summaryIconStyles } from '@/components/admin/security-center/security-center-display';
import { cn } from '@/lib/utils';
import type { SecuritySummary } from '@/types/security-center';

type SummaryCardConfig = {
    id: keyof typeof summaryIconStyles;
    label: string;
    value: string;
    helperText: string;
};

type SecuritySummaryCardsProps = {
    summary: SecuritySummary | null;
    isLoading: boolean;
};

function formatNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

export function SecuritySummaryCards({
    summary,
    isLoading,
}: SecuritySummaryCardsProps) {
    if (isLoading) {
        return (
            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="h-[114px] animate-pulse rounded-[10px] border border-[#e5e7eb] bg-white"
                    />
                ))}
            </section>
        );
    }

    const cards: SummaryCardConfig[] = summary
        ? [
              {
                  id: 'mfa',
                  label: 'MFA-Enabled Admins',
                  value: `${formatNumber(summary.mfaEnabledAdminAccounts)}/${formatNumber(summary.mfaEligibleAdminAccounts)}`,
                  helperText: '85% coverage',
              },
              {
                  id: 'failed',
                  label: 'Failed Login Attempts',
                  value: formatNumber(summary.failedLoginAttempts),
                  helperText: 'Last 24 hours',
              },
              {
                  id: 'locked',
                  label: 'Locked Accounts',
                  value: formatNumber(summary.lockedAccounts),
                  helperText: 'Requires review',
              },
              {
                  id: 'sessions',
                  label: 'Active Admin Sessions',
                  value: formatNumber(summary.activeAdminSessions),
                  helperText: 'Currently online',
              },
              {
                  id: 'alerts',
                  label: 'Security Alerts',
                  value: formatNumber(summary.securityAlerts),
                  helperText: '3 high priority',
              },
          ]
        : [];

    if (cards.length === 0) {
        return (
            <section className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
                <p className="text-sm font-semibold text-[#1e2939]">
                    No security summary available
                </p>
                <p className="mt-1 text-xs text-[#6a7282]">
                    Security metrics will appear when the monitoring service
                    returns data.
                </p>
            </section>
        );
    }

    return (
        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
                const iconStyle = summaryIconStyles[card.id];
                const Icon = iconStyle.icon;

                return (
                    <article
                        key={card.id}
                        className="min-h-[114px] rounded-[10px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    >
                        <span
                            className={cn(
                                'flex size-8 items-center justify-center rounded-[8px]',
                                iconStyle.className,
                            )}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-2xl leading-8 font-bold text-[#111827]">
                            {card.value}
                        </p>
                        <p className="text-xs leading-4 text-[#4a5565]">
                            {card.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-4 text-[#99a1af]">
                            {card.helperText}
                        </p>
                    </article>
                );
            })}
        </section>
    );
}
