import { Link } from '@inertiajs/react';
import { Zap } from 'lucide-react';
import { adminDashboardIcons } from '@/components/admin/dashboard/adminDashboardIcons';
import type { QuickManagementAction } from '@/types/admin-dashboard';

const quickActionStyles: Record<string, string> = {
    'create-new-agency': 'bg-[#dbeafe] text-[#1e3a8a]',
    'manage-admin-users': 'bg-[#ede9fe] text-[#7c3aed]',
    'view-system-research': 'bg-[#dcfce7] text-[#16a34a]',
    'open-activity-logs': 'bg-[#fef3c7] text-[#d97706]',
    'manage-rbac-roles': 'bg-[#fee2e2] text-[#dc2626]',
    'open-security-center': 'bg-[#e0f2fe] text-[#0369a1]',
};

export function QuickManagementActions({
    actions,
    isLoading,
}: {
    actions: QuickManagementAction[];
    isLoading: boolean;
}) {
    return (
        <article className="rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] xl:col-span-2">
            <div className="flex h-[65px] items-center gap-2.5 border-b border-[#f3f4f6] px-6">
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#f3f4f6] text-[#4a5565]">
                    <Zap className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-sm leading-5 font-bold text-[#0f172a]">
                    Quick Management Actions
                </h2>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {isLoading
                    ? Array.from({ length: 6 }, (_, index) => (
                          <div
                              key={index}
                              className="h-[118px] animate-pulse rounded-[10px] bg-[#f1f5f9]"
                          />
                      ))
                    : actions.map((action) => {
                          const Icon = action.icon
                              ? adminDashboardIcons[action.icon]
                              : adminDashboardIcons.activity;

                          return (
                              <Link
                                  key={action.id}
                                  href={action.route}
                                  className="group flex h-[118px] flex-col items-center justify-center gap-3 rounded-[10px] border border-[#f3f4f6] bg-[#f9fafb] p-5 text-center transition hover:border-[#1e3a8a] hover:bg-white"
                              >
                                  <span
                                      className={`flex size-12 items-center justify-center rounded-[10px] ${quickActionStyles[action.id] ?? 'bg-[#dbeafe] text-[#1e3a8a]'}`}
                                  >
                                      <Icon
                                          className="size-5"
                                          aria-hidden="true"
                                      />
                                  </span>
                                  <h3 className="text-xs leading-4 font-medium text-[#4a5565]">
                                      {action.label}
                                  </h3>
                              </Link>
                          );
                      })}
            </div>
        </article>
    );
}
