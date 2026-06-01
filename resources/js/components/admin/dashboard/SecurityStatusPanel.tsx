import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    LockKeyhole,
    ShieldAlert,
    ShieldCheck,
    UserX,
} from 'lucide-react';
import type { SecurityStatus } from '@/types/admin-dashboard';

type SecurityStatusPanelProps = {
    status: SecurityStatus | null;
    isLoading: boolean;
};

export function SecurityStatusPanel({
    status,
    isLoading,
}: SecurityStatusPanelProps) {
    const statusItems = status
        ? [
              {
                  label: 'MFA-enabled accounts',
                  value: status.mfaEligibleAccounts
                      ? `${status.mfaEnabledAccounts} / ${status.mfaEligibleAccounts}`
                      : String(status.mfaEnabledAccounts),
                  icon: ShieldCheck,
                  className: 'bg-[#ecfdf5] text-[#047857]',
              },
              {
                  label: 'Recent failed logins',
                  value: String(status.recentFailedLogins),
                  icon: ShieldAlert,
                  className: 'bg-[#fff7ed] text-[#c2410c]',
              },
              {
                  label: 'Locked accounts',
                  value: String(status.lockedAccounts),
                  icon: UserX,
                  className: 'bg-[#fef2f2] text-[#b91c1c]',
              },
              {
                  label: 'Security alerts',
                  value: String(status.securityAlerts),
                  icon: AlertTriangle,
                  className: 'bg-[#eff6ff] text-[#1e3a8a]',
              },
          ]
        : [];

    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] xl:col-span-2">
            <div className="flex h-[65px] items-center justify-between gap-4 border-b border-[#f3f4f6] px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#fef2f2] text-[#fb2c36]">
                        <LockKeyhole className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                        Security Status
                    </h2>
                </div>
                <Link
                    href="/admin/security"
                    className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[8px] border border-[#ffc9c9] bg-[#fef2f2] px-3 text-xs font-medium text-[#e7000b] transition hover:bg-[#fee2e2]"
                >
                    <LockKeyhole className="size-3" aria-hidden="true" />
                    Open Security Center
                </Link>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                {isLoading
                    ? Array.from({ length: 4 }, (_, index) => (
                          <div
                              key={index}
                              className="h-[78px] animate-pulse rounded-[10px] bg-[#f1f5f9]"
                          />
                      ))
                    : statusItems.map((item) => (
                          <div
                              key={item.label}
                              className="h-[78px] rounded-[10px] border border-[#f3f4f6] bg-[#f9fafb] p-4"
                          >
                              <div className="flex items-center gap-3">
                                  <span
                                      className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] ${item.className}`}
                                  >
                                      <item.icon
                                          className="size-5"
                                          aria-hidden="true"
                                      />
                                  </span>
                                  <div>
                                      <p className="text-xl leading-7 font-bold text-[#1e2939]">
                                          {item.value}
                                      </p>
                                      <p className="text-xs leading-4 font-medium text-[#6a7282]">
                                          {item.label}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      ))}
            </div>
        </article>
    );
}
