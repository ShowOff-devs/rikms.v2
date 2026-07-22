<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\AdminAccessMonitoringController;
use App\Http\Controllers\Api\AdminAgencyAdminUserController;
use App\Http\Controllers\Api\AdminAgencyManagementController;
use App\Http\Controllers\Api\AdminAnalyticsController;
use App\Http\Controllers\Api\AdminArchiveController;
use App\Http\Controllers\Api\AdminPlatformSettingController;
use App\Http\Controllers\Api\AdminProjectReportAnalyticsController;
use App\Http\Controllers\Api\AdminRbacController;
use App\Http\Controllers\Api\AdminReadController;
use App\Http\Controllers\Api\AdminResearchModerationController;
use App\Http\Controllers\Api\AdminSecurityController;
use App\Http\Controllers\Api\AdminSystemActivityController;
use App\Http\Controllers\Api\AgencyAccessRequestDecisionController;
use App\Http\Controllers\Api\AgencyAnalyticsController;
use App\Http\Controllers\Api\AgencyArchiveController;
use App\Http\Controllers\Api\AgencyProfileSettingsController;
use App\Http\Controllers\Api\AgencyProjectReportAnalyticsController;
use App\Http\Controllers\Api\AgencyReadController;
use App\Http\Controllers\Api\AgencyResearchWriteController;
use App\Http\Controllers\Api\AiResultController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PublicAccessRequestController;
use App\Http\Controllers\Api\PublicAgencyController;
use App\Http\Controllers\Api\PublicResearchController;
use App\Http\Resources\UserResource;
use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function () {
    Route::get('/platform-settings', function (PlatformSettingsService $settings) {
        return ApiResponse::success('Public platform settings retrieved.', [
            'access_requests_enabled' => $settings->accessRequestsEnabled(),
        ]);
    });
    Route::get('/summary', [PublicResearchController::class, 'summary']);
    Route::get('/research', [PublicResearchController::class, 'index']);
    Route::post('/research/{research}/access-requests', [PublicAccessRequestController::class, 'store'])
        ->middleware('throttle:public-access-requests');
    Route::get('/research/{identifier}/download', [PublicResearchController::class, 'download']);
    Route::get('/research/{identifier}', [PublicResearchController::class, 'show']);
    Route::get('/agencies', [PublicAgencyController::class, 'index']);
    Route::get('/agencies/types', [PublicAgencyController::class, 'types']);
    Route::get('/agencies/{agency:slug}', [PublicAgencyController::class, 'show']);
    Route::get('/agencies/{agency:slug}/research', [PublicAgencyController::class, 'research']);
});

Route::prefix('auth')->name('auth.')->group(function () {
    Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
        return ApiResponse::success(
            'Authenticated user retrieved.',
            new UserResource($request->user()->loadMissing(['agency', 'roles'])),
        );
    })->name('user');
});

Route::prefix('agency')
    ->name('api.agency.')
    ->middleware(['auth:sanctum', 'verified', 'role:agency_admin', 'agency.scope'])
    ->group(function () {
        Route::get('/dashboard', [AgencyReadController::class, 'dashboard'])->name('dashboard');
        Route::get('/analytics', [AgencyAnalyticsController::class, 'show'])->name('analytics.show');
        Route::get('/analytics/export', [AgencyAnalyticsController::class, 'export'])->name('analytics.export');
        Route::get('/analytics/project-reports/summary', [AgencyProjectReportAnalyticsController::class, 'summary'])->name('analytics.project-reports.summary');
        Route::get('/analytics/project-reports/status', [AgencyProjectReportAnalyticsController::class, 'status'])->name('analytics.project-reports.status');
        Route::get('/analytics/project-reports/budget', [AgencyProjectReportAnalyticsController::class, 'budget'])->name('analytics.project-reports.budget');
        Route::get('/analytics/project-reports/records', [AgencyProjectReportAnalyticsController::class, 'records'])->name('analytics.project-reports.records');
        Route::get('/analytics/project-reports/{research}', [AgencyProjectReportAnalyticsController::class, 'show'])->name('analytics.project-reports.show');
        Route::get('/profile', [AgencyProfileSettingsController::class, 'profile'])->name('profile.show');
        Route::patch('/profile', [AgencyProfileSettingsController::class, 'updateProfile'])->name('profile.update');
        Route::post('/profile/logo', [AgencyProfileSettingsController::class, 'uploadLogo'])->name('profile.logo.upload');
        Route::delete('/profile/logo', [AgencyProfileSettingsController::class, 'removeLogo'])->name('profile.logo.remove');
        Route::get('/settings', [AgencyProfileSettingsController::class, 'settings'])->name('settings.show');
        Route::patch('/settings/account', [AgencyProfileSettingsController::class, 'updateAccount'])->name('settings.account.update');
        Route::patch('/settings/notifications', [AgencyProfileSettingsController::class, 'updateNotifications'])->name('settings.notifications.update');
        Route::patch('/settings/security', [AgencyProfileSettingsController::class, 'updateSecurity'])->name('settings.security.update');
        Route::post('/settings/profile-photo', [AgencyProfileSettingsController::class, 'uploadProfilePhoto'])->name('settings.profile-photo.upload');
        Route::post('/settings/password', [AgencyProfileSettingsController::class, 'changePassword'])->name('settings.password.update');
        Route::post('/settings/deactivation-request', [AgencyProfileSettingsController::class, 'requestDeactivation'])->name('settings.deactivation-request');
        Route::delete('/settings/sessions/{sessionId}', [AgencyProfileSettingsController::class, 'revokeSession'])->name('settings.sessions.revoke');
        Route::get('/research', [AgencyReadController::class, 'research'])->name('research.index');
        Route::post('/research', [AgencyResearchWriteController::class, 'store'])->name('research.store');
        Route::get('/research/{research}', [AgencyReadController::class, 'researchShow'])->name('research.show');
        Route::get('/research/{research}/pdf-parsing-result', [AiResultController::class, 'agencyPdfParsingResult'])->name('research.pdf-parsing-result');
        Route::get('/research/{research}/ai-metadata', [AiResultController::class, 'agencyAiMetadata'])->name('research.ai-metadata');
        Route::get('/research/{research}/sdg-classification', [AiResultController::class, 'agencySdgClassification'])->name('research.sdg-classification');
        Route::get('/research/{research}/ai-results', [AiResultController::class, 'agencyAiResults'])->name('research.ai-results');
        Route::post('/research/{research}/ai-results/process', [AiResultController::class, 'agencyProcessAiResults'])->name('research.ai-results.process');
        Route::post('/research/{research}/ai-results/{result}/review', [AiResultController::class, 'agencyReview'])->name('research.ai-results.review');
        Route::post('/research/{research}/ai-results/{result}/apply', [AiResultController::class, 'agencyApply'])->name('research.ai-results.apply');
        Route::match(['put', 'patch'], '/research/{research}', [AgencyResearchWriteController::class, 'update'])->name('research.update');
        Route::post('/research/{research}/submit', [AgencyResearchWriteController::class, 'submit'])->name('research.submit');
        Route::post('/research/{research}/revision', [AgencyResearchWriteController::class, 'createRevision'])->name('research.revision');
        Route::post('/research/{research}/archive', [AgencyArchiveController::class, 'archiveResearch'])->name('research.archive');
        Route::post('/research/{research}/restore', [AgencyArchiveController::class, 'restoreResearch'])->name('research.restore');
        Route::delete('/research/{research}/archive', [AgencyArchiveController::class, 'destroyResearch'])->name('research.archive.destroy');
        Route::get('/research/{research}/files', [AgencyResearchWriteController::class, 'files'])->name('research.files.index');
        Route::post('/research/{research}/files', [AgencyResearchWriteController::class, 'storeFile'])->name('research.files.store');
        Route::get('/research/{research}/files/{file}/download', [AgencyResearchWriteController::class, 'downloadFile'])->name('research.files.download');
        Route::delete('/research/{research}/files/{file}', [AgencyResearchWriteController::class, 'destroyFile'])->name('research.files.destroy');
        Route::get('/archive/research', [AgencyArchiveController::class, 'research'])->name('archive.research');
        Route::get('/access-requests', [AgencyReadController::class, 'accessRequests'])->name('access-requests.index');
        Route::post('/access-requests/{accessRequest}/approve', [AgencyAccessRequestDecisionController::class, 'approve'])->name('access-requests.approve');
        Route::post('/access-requests/{accessRequest}/deny', [AgencyAccessRequestDecisionController::class, 'deny'])->name('access-requests.deny');
        Route::get('/notifications', [AgencyReadController::class, 'notifications'])->name('notifications.index');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'agencyRead'])->name('notifications.read');
        Route::post('/notifications/{notification}/unread', [NotificationController::class, 'agencyUnread'])->name('notifications.unread');
        Route::post('/notifications/read-all', [NotificationController::class, 'agencyReadAll'])->name('notifications.read-all');
        Route::get('/research-files', [AgencyReadController::class, 'researchFiles'])->name('research-files.index');
    });

Route::prefix('admin')
    ->name('api.admin.')
    ->middleware(['auth:sanctum', 'verified', 'role:super_admin', 'super_admin.2fa'])
    ->group(function () {
        Route::get('/dashboard', AdminDashboardController::class)->name('dashboard');
        Route::get('/agency-admin-users', [AdminAgencyAdminUserController::class, 'index'])->name('agency-admin-users.index');
        Route::post('/agency-admin-users', [AdminAgencyAdminUserController::class, 'store'])->name('agency-admin-users.store');
        Route::get('/agency-admin-users/{user}', [AdminAgencyAdminUserController::class, 'show'])->name('agency-admin-users.show');
        Route::patch('/agency-admin-users/{user}', [AdminAgencyAdminUserController::class, 'update'])->name('agency-admin-users.update');
        Route::post('/agency-admin-users/{user}/activate', [AdminAgencyAdminUserController::class, 'activate'])->name('agency-admin-users.activate');
        Route::post('/agency-admin-users/{user}/deactivate', [AdminAgencyAdminUserController::class, 'deactivate'])->name('agency-admin-users.deactivate');
        Route::post('/agency-admin-users/{user}/password-reset', [AdminAgencyAdminUserController::class, 'sendPasswordReset'])->name('agency-admin-users.password-reset');
        Route::delete('/agency-admin-users/{user}', [AdminAgencyAdminUserController::class, 'destroy'])->name('agency-admin-users.destroy');
        Route::get('/agencies', [AdminReadController::class, 'agencies'])->name('agencies.index');
        Route::post('/agencies', [AdminAgencyManagementController::class, 'store'])->name('agencies.store');
        Route::get('/agencies/{agency}', [AdminReadController::class, 'agencyShow'])->name('agencies.show');
        Route::patch('/agencies/{agency}', [AdminAgencyManagementController::class, 'update'])->name('agencies.update');
        Route::post('/agencies/{agency}/activate', [AdminAgencyManagementController::class, 'activate'])->name('agencies.activate');
        Route::post('/agencies/{agency}/deactivate', [AdminAgencyManagementController::class, 'deactivate'])->name('agencies.deactivate');
        Route::post('/agencies/{agency}/assign-admin', [AdminAgencyManagementController::class, 'assignAdmin'])->name('agencies.assign-admin');
        Route::post('/agencies/{agency}/archive', [AdminAgencyManagementController::class, 'archive'])->name('agencies.archive');
        Route::get('/users', [AdminReadController::class, 'users'])->name('users.index');
        Route::get('/users/{user}', [AdminReadController::class, 'userShow'])->name('users.show');
        Route::get('/research-moderation/duplicates', [AdminResearchModerationController::class, 'duplicates'])->name('research-moderation.duplicates');
        Route::post('/research-moderation/duplicates/dismiss', [AdminResearchModerationController::class, 'dismissDuplicate'])->name('research-moderation.duplicates.dismiss');
        Route::get('/research-moderation/activity', [AdminResearchModerationController::class, 'activity'])->name('research-moderation.activity');
        Route::get('/research', [AdminReadController::class, 'research'])->name('research.index');
        Route::get('/research/{research}', [AdminReadController::class, 'researchShow'])->name('research.show');
        Route::get('/research/{research}/pdf-parsing-result', [AiResultController::class, 'adminPdfParsingResult'])->name('research.pdf-parsing-result');
        Route::get('/research/{research}/ai-metadata', [AiResultController::class, 'adminAiMetadata'])->name('research.ai-metadata');
        Route::get('/research/{research}/sdg-classification', [AiResultController::class, 'adminSdgClassification'])->name('research.sdg-classification');
        Route::get('/research/{research}/ai-results', [AiResultController::class, 'adminAiResults'])->name('research.ai-results');
        Route::post('/research/{research}/ai-results/{result}/review', [AiResultController::class, 'adminReview'])->name('research.ai-results.review');
        Route::post('/research/{research}/approve', [AdminResearchModerationController::class, 'approve'])->name('research.approve');
        Route::post('/research/{research}/approve-and-publish', [AdminResearchModerationController::class, 'approveAndPublish'])->name('research.approve-and-publish');
        Route::post('/research/{research}/reject', [AdminResearchModerationController::class, 'reject'])->name('research.reject');
        Route::post('/research/{research}/publish', [AdminResearchModerationController::class, 'publish'])->name('research.publish');
        Route::post('/research/{research}/return', [AdminResearchModerationController::class, 'return'])->name('research.return');
        Route::post('/research/{research}/archive', [AdminResearchModerationController::class, 'archive'])->name('research.archive');
        Route::post('/research/{research}/restore', [AdminResearchModerationController::class, 'restore'])->name('research.restore');
        Route::delete('/research/{research}/archive', [AdminArchiveController::class, 'destroyResearch'])->name('research.archive.destroy');
        Route::get('/archive/research', [AdminArchiveController::class, 'research'])->name('archive.research');
        Route::get('/archive/files', [AdminArchiveController::class, 'files'])->name('archive.files');
        Route::get('/archive/agencies', [AdminArchiveController::class, 'agencies'])->name('archive.agencies');
        Route::get('/archive/users', [AdminArchiveController::class, 'users'])->name('archive.users');
        Route::get('/archive/activity', [AdminArchiveController::class, 'activity'])->name('archive.activity');
        Route::get('/archive/export', [AdminArchiveController::class, 'export'])->name('archive.export');
        Route::post('/research-files/{file}/restore', [AdminArchiveController::class, 'restoreFile'])->name('research-files.restore');
        Route::delete('/research-files/{file}/archive', [AdminArchiveController::class, 'destroyFile'])->name('research-files.archive.destroy')->withTrashed();
        Route::post('/agencies/{agency}/restore', [AdminArchiveController::class, 'restoreAgency'])->name('agencies.restore')->withTrashed();
        Route::delete('/agencies/{agency}/archive', [AdminArchiveController::class, 'destroyAgency'])->name('agencies.archive.destroy')->withTrashed();
        Route::post('/users/{user}/restore', [AdminArchiveController::class, 'restoreUser'])->name('users.restore')->withTrashed();
        Route::delete('/users/{user}/archive', [AdminArchiveController::class, 'destroyUser'])->name('users.archive.destroy')->withTrashed();
        Route::get('/access-monitoring', [AdminAccessMonitoringController::class, 'index'])->name('access-monitoring.index');
        Route::get('/access-monitoring/events', [AdminAccessMonitoringController::class, 'events'])->name('access-monitoring.events');
        Route::get('/access-monitoring/export', [AdminAccessMonitoringController::class, 'export'])->name('access-monitoring.export');
        Route::get('/access-requests', [AdminReadController::class, 'accessRequests'])->name('access-requests.index');
        Route::get('/access-requests/{accessRequest}', [AdminAccessMonitoringController::class, 'show'])->name('access-requests.show');
        Route::post('/access-requests/{accessRequest}/audit-reviewed', [AdminAccessMonitoringController::class, 'markReviewed'])->name('access-requests.audit-reviewed');
        Route::post('/access-requests/{accessRequest}/override-deny', [AdminAccessMonitoringController::class, 'overrideDeny'])->name('access-requests.override-deny');
        Route::get('/analytics/overview', [AdminAnalyticsController::class, 'overview'])->name('analytics.overview');
        Route::get('/analytics/research', [AdminAnalyticsController::class, 'research'])->name('analytics.research');
        Route::get('/analytics/access-requests', [AdminAnalyticsController::class, 'accessRequests'])->name('analytics.access-requests');
        Route::get('/analytics/agencies', [AdminAnalyticsController::class, 'agencies'])->name('analytics.agencies');
        Route::get('/analytics/security', [AdminAnalyticsController::class, 'security'])->name('analytics.security');
        Route::get('/analytics/project-reports/summary', [AdminProjectReportAnalyticsController::class, 'summary'])->name('analytics.project-reports.summary');
        Route::get('/analytics/project-reports/status', [AdminProjectReportAnalyticsController::class, 'status'])->name('analytics.project-reports.status');
        Route::get('/analytics/project-reports/budget', [AdminProjectReportAnalyticsController::class, 'budget'])->name('analytics.project-reports.budget');
        Route::get('/analytics/project-reports/agencies', [AdminProjectReportAnalyticsController::class, 'agencies'])->name('analytics.project-reports.agencies');
        Route::get('/analytics/project-reports/records', [AdminProjectReportAnalyticsController::class, 'records'])->name('analytics.project-reports.records');
        Route::get('/analytics/project-reports/{research}', [AdminProjectReportAnalyticsController::class, 'show'])->name('analytics.project-reports.show');
        Route::get('/reports/{report}/export', [AdminAnalyticsController::class, 'export'])->name('reports.export');
        Route::get('/audit-logs', [AdminReadController::class, 'auditLogs'])->name('audit-logs.index');
        Route::get('/security-events', [AdminReadController::class, 'securityEvents'])->name('security-events.index');
        Route::get('/security/events', [AdminSecurityController::class, 'events'])->name('security.events');
        Route::get('/security/events/{securityEvent}', [AdminSecurityController::class, 'show'])->name('security.events.show');
        Route::post('/security/events/{securityEvent}/acknowledge', [AdminSecurityController::class, 'acknowledge'])->name('security.events.acknowledge');
        Route::post('/security/events/{securityEvent}/resolve', [AdminSecurityController::class, 'resolve'])->name('security.events.resolve');
        Route::post('/security/events/{securityEvent}/reopen', [AdminSecurityController::class, 'reopen'])->name('security.events.reopen');
        Route::get('/security/summary', [AdminSecurityController::class, 'summary'])->name('security.summary');
        Route::get('/security/queue-health', [AdminSecurityController::class, 'queueHealth'])->name('security.queue-health');
        Route::get('/security/sessions', [AdminSecurityController::class, 'sessions'])->name('security.sessions');
        Route::delete('/security/sessions/{sessionId}', [AdminSecurityController::class, 'revokeSession'])->name('security.sessions.revoke');
        Route::get('/system-activity/notifications', [AdminSystemActivityController::class, 'notifications'])->name('system-activity.notifications');
        Route::post('/system-activity/notifications/clear', [AdminSystemActivityController::class, 'clearNotifications'])->name('system-activity.notifications.clear');
        Route::get('/system-activity/logs', [AdminSystemActivityController::class, 'activityLogs'])->name('system-activity.logs');
        Route::get('/system-activity/timeline', [AdminSystemActivityController::class, 'timeline'])->name('system-activity.timeline');
        Route::get('/system-activity/export', [AdminSystemActivityController::class, 'export'])->name('system-activity.export');
        Route::get('/platform-settings', [AdminReadController::class, 'platformSettings'])->name('platform-settings.index');
        Route::patch('/platform-settings/{setting}', [AdminPlatformSettingController::class, 'update'])->name('platform-settings.update');
        Route::post('/platform-settings/bulk-update', [AdminPlatformSettingController::class, 'bulkUpdate'])->name('platform-settings.bulk-update');
        Route::post('/platform-settings/logo', [AdminPlatformSettingController::class, 'uploadLogo'])->name('platform-settings.logo.upload');
        Route::get('/rbac/roles', [AdminRbacController::class, 'roles'])->name('rbac.roles.index');
        Route::post('/rbac/roles', [AdminRbacController::class, 'createRole'])->name('rbac.roles.store');
        Route::patch('/rbac/roles/{role}', [AdminRbacController::class, 'updateRole'])->name('rbac.roles.update');
        Route::delete('/rbac/roles/{role}', [AdminRbacController::class, 'deleteRole'])->name('rbac.roles.destroy');
        Route::match(['put', 'patch'], '/rbac/roles/{role}/permissions', [AdminRbacController::class, 'updateRolePermissions'])->name('rbac.roles.permissions.update');
        Route::get('/rbac/permissions', [AdminRbacController::class, 'permissions'])->name('rbac.permissions.index');
        Route::get('/rbac/history', [AdminRbacController::class, 'history'])->name('rbac.history.index');
        Route::get('/rbac/users', [AdminRbacController::class, 'users'])->name('rbac.users.index');
        Route::get('/rbac/users/{user}/roles', [AdminRbacController::class, 'userRoles'])->name('rbac.users.roles.index');
        Route::post('/rbac/users/{user}/roles', [AdminRbacController::class, 'assignUserRole'])->name('rbac.users.roles.store');
        Route::delete('/rbac/users/{user}/roles/{role}', [AdminRbacController::class, 'removeUserRole'])->name('rbac.users.roles.destroy');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'adminRead'])->name('notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'adminReadAll'])->name('notifications.read-all');
    });
