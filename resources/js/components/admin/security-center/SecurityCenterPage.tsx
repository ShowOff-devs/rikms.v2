import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ActiveAdminSessions } from '@/components/admin/security-center/ActiveAdminSessions';
import { ExportSecurityReportModal } from '@/components/admin/security-center/ExportSecurityReportModal';
import { LoginActivityTable } from '@/components/admin/security-center/LoginActivityTable';
import { RevokeSessionModal } from '@/components/admin/security-center/RevokeSessionModal';
import { SecurityAlertDetailsModal } from '@/components/admin/security-center/SecurityAlertDetailsModal';
import { SecurityAlertsPanel } from '@/components/admin/security-center/SecurityAlertsPanel';
import { SecurityCenterHeader } from '@/components/admin/security-center/SecurityCenterHeader';
import { SecurityEventsTimeline } from '@/components/admin/security-center/SecurityEventsTimeline';
import { SecuritySummaryCards } from '@/components/admin/security-center/SecuritySummaryCards';
import {
    acknowledgeSecurityAlert,
    exportSecurityReport,
    getActiveAdminSessions,
    getLoginActivity,
    getSecurityAlerts,
    getSecurityEvents,
    getSecuritySummary,
    resolveSecurityAlert,
    revokeAdminSession,
} from '@/lib/admin/security-center-service';
import type {
    AdminSession,
    LoginActivity,
    SecurityAlert,
    SecurityEvent,
    SecurityReportExportOptions,
    SecuritySummary,
} from '@/types/security-center';

function matchesSearch(values: Array<string | undefined>, query: string) {
    if (!query) {
        return true;
    }

    return values.filter(Boolean).join(' ').toLowerCase().includes(query);
}

export function SecurityCenterPage() {
    const [topbarSearch, setTopbarSearch] = useState('');
    const [summary, setSummary] = useState<SecuritySummary | null>(null);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
    const [activeSessions, setActiveSessions] = useState<AdminSession[]>([]);
    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(
        null,
    );
    const [isAlertDetailsOpen, setIsAlertDetailsOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AdminSession | null>(
        null,
    );
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([
            getSecuritySummary(),
            getSecurityAlerts(),
            getLoginActivity(),
            getActiveAdminSessions(),
            getSecurityEvents(),
        ])
            .then(
                ([
                    loadedSummary,
                    loadedAlerts,
                    loadedLogins,
                    loadedSessions,
                    loadedEvents,
                ]) => {
                    if (!isCurrent) {
                        return;
                    }

                    setSummary(loadedSummary);
                    setAlerts(loadedAlerts);
                    setLoginActivity(loadedLogins);
                    setActiveSessions(loadedSessions);
                    setSecurityEvents(loadedEvents);
                    setError(null);
                },
            )
            .catch(() => {
                if (isCurrent) {
                    setError('Unable to load security center data.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setFeedback(null);
        }, 3200);

        return () => window.clearTimeout(timerId);
    }, [feedback]);

    const searchQuery = topbarSearch.trim().toLowerCase();

    const filteredAlerts = useMemo(
        () =>
            alerts.filter((alert) =>
                matchesSearch(
                    [
                        alert.title,
                        alert.description,
                        alert.severity,
                        alert.status,
                        alert.timestamp,
                        alert.source,
                        alert.affectedUser,
                        alert.affectedResource,
                    ],
                    searchQuery,
                ),
            ),
        [alerts, searchQuery],
    );

    const filteredLoginActivity = useMemo(
        () =>
            loginActivity.filter((activity) =>
                matchesSearch(
                    [
                        activity.user,
                        activity.role,
                        activity.ipAddress,
                        activity.location,
                        activity.device,
                        activity.browser,
                        activity.loginTime,
                        activity.status,
                    ],
                    searchQuery,
                ),
            ),
        [loginActivity, searchQuery],
    );

    const filteredSessions = useMemo(
        () =>
            activeSessions.filter((session) =>
                matchesSearch(
                    [
                        session.user,
                        session.role,
                        session.device,
                        session.ipAddress,
                        session.lastActivity,
                        session.status,
                    ],
                    searchQuery,
                ),
            ),
        [activeSessions, searchQuery],
    );

    const filteredEvents = useMemo(
        () =>
            securityEvents.filter((event) =>
                matchesSearch(
                    [
                        event.title,
                        event.description,
                        event.timestamp,
                        event.actor,
                        event.severity,
                        event.type,
                    ],
                    searchQuery,
                ),
            ),
        [securityEvents, searchQuery],
    );

    const displayedSummary = useMemo(() => {
        if (!summary) {
            return null;
        }

        return {
            ...summary,
            failedLoginAttempts: loginActivity.filter(
                (activity) => activity.status === 'failed',
            ).length,
            activeAdminSessions: activeSessions.length,
            securityAlerts: alerts.filter((alert) => alert.status === 'open')
                .length,
        };
    }, [activeSessions.length, alerts, loginActivity, summary]);

    const handleViewAlertDetails = (alert: SecurityAlert) => {
        setSelectedAlert(alert);
        setIsAlertDetailsOpen(true);
    };

    const syncSelectedAlert = (updatedAlert: SecurityAlert) => {
        setSelectedAlert((current) =>
            current?.id === updatedAlert.id ? updatedAlert : current,
        );
    };

    const handleAcknowledgeAlert = async (id: string) => {
        const updatedAlert = await acknowledgeSecurityAlert(id);

        setAlerts((currentAlerts) =>
            currentAlerts.map((alert) =>
                alert.id === id ? { ...alert, ...updatedAlert } : alert,
            ),
        );
        syncSelectedAlert(updatedAlert);
        setFeedback('Security alert acknowledged.');
    };

    const handleResolveAlert = async (id: string) => {
        const updatedAlert = await resolveSecurityAlert(id);

        setAlerts((currentAlerts) =>
            currentAlerts.map((alert) =>
                alert.id === id ? { ...alert, ...updatedAlert } : alert,
            ),
        );
        syncSelectedAlert(updatedAlert);
        setFeedback('Security alert marked resolved.');
    };

    const handleOpenRevokeSession = (session: AdminSession) => {
        setSelectedSession(session);
        setIsRevokeModalOpen(true);
    };

    const handleConfirmRevokeSession = async () => {
        if (!selectedSession) {
            return;
        }

        setIsRevoking(true);

        try {
            await revokeAdminSession(selectedSession.id);
            setActiveSessions((currentSessions) =>
                currentSessions.filter(
                    (session) => session.id !== selectedSession.id,
                ),
            );
            setFeedback(`${selectedSession.user}'s session was revoked.`);
            setIsRevokeModalOpen(false);
            setSelectedSession(null);
        } finally {
            setIsRevoking(false);
        }
    };

    const handleExport = async (options: SecurityReportExportOptions) => {
        setIsExporting(true);

        try {
            const exportResult = await exportSecurityReport(options);
            setFeedback(`${exportResult.fileName} is ready for download.`);
            setIsExportModalOpen(false);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AdminLayout search={topbarSearch} onSearchChange={setTopbarSearch}>
            <main className="px-4 py-8 lg:px-8">
                <SecurityCenterHeader
                    onExport={() => setIsExportModalOpen(true)}
                />

                {error && (
                    <div className="mt-6 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                        {error}
                    </div>
                )}

                {feedback && (
                    <div className="mt-6 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                        {feedback}
                    </div>
                )}

                <SecuritySummaryCards
                    summary={displayedSummary}
                    isLoading={isLoading}
                />

                <SecurityAlertsPanel
                    alerts={filteredAlerts}
                    isLoading={isLoading}
                    onViewDetails={handleViewAlertDetails}
                    onAcknowledge={handleAcknowledgeAlert}
                    onResolve={handleResolveAlert}
                />

                <LoginActivityTable
                    activity={filteredLoginActivity}
                    isLoading={isLoading}
                />

                <ActiveAdminSessions
                    sessions={filteredSessions}
                    isLoading={isLoading}
                    onRevoke={handleOpenRevokeSession}
                />

                <SecurityEventsTimeline
                    events={filteredEvents}
                    isLoading={isLoading}
                />
            </main>

            <ExportSecurityReportModal
                open={isExportModalOpen}
                isExporting={isExporting}
                onOpenChange={setIsExportModalOpen}
                onExport={handleExport}
            />

            <SecurityAlertDetailsModal
                alert={selectedAlert}
                open={isAlertDetailsOpen}
                onOpenChange={setIsAlertDetailsOpen}
                onAcknowledge={handleAcknowledgeAlert}
                onResolve={handleResolveAlert}
            />

            <RevokeSessionModal
                session={selectedSession}
                open={isRevokeModalOpen}
                isRevoking={isRevoking}
                onOpenChange={setIsRevokeModalOpen}
                onConfirm={handleConfirmRevokeSession}
            />
        </AdminLayout>
    );
}
