<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\AdminAccessMonitoringController;
use App\Http\Controllers\Api\AdminAnalyticsController;
use App\Http\Controllers\Api\AdminArchiveController;
use App\Http\Controllers\Api\AdminPlatformSettingController;
use App\Http\Controllers\Api\AdminRbacController;
use App\Http\Controllers\Api\AdminReadController;
use App\Http\Controllers\Api\AdminResearchModerationController;
use App\Http\Controllers\Api\AdminSecurityController;
use App\Http\Controllers\Api\AgencyAccessRequestDecisionController;
use App\Http\Controllers\Api\AgencyArchiveController;
use App\Http\Controllers\Api\AgencyReadController;
use App\Http\Controllers\Api\AgencyResearchWriteController;
use App\Http\Controllers\Api\AiResultController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PublicAccessRequestController;
use App\Http\Controllers\Api\PublicAgencyController;
use App\Http\Controllers\Api\PublicResearchController;
use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use App\Models\Research;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function () {
    Route::get('/summary', [PublicResearchController::class, 'summary']);
    Route::get('/research', [PublicResearchController::class, 'index']);
    Route::post('/research/{research}/access-requests', [PublicAccessRequestController::class, 'store']);
    Route::get('/research/{research:slug}', [PublicResearchController::class, 'show']);
    Route::get('/agencies', [PublicAgencyController::class, 'index']);
    Route::get('/agencies/types', [PublicAgencyController::class, 'types']);
    Route::get('/agencies/{agency:slug}', [PublicAgencyController::class, 'show']);
    Route::get('/agencies/{agency:slug}/research', [PublicAgencyController::class, 'research']);
});

Route::prefix('auth')->name('auth.')->group(function () {
    Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
        return ApiResponse::success('Authenticated user retrieved.', $request->user());
    })->name('user');
});

Route::prefix('agency')
    ->name('api.agency.')
    ->middleware(['auth:sanctum', 'role:agency_admin', 'agency.scope'])
    ->group(function () {
        Route::get('/dashboard', [AgencyReadController::class, 'dashboard'])->name('dashboard');
        Route::get('/research', [AgencyReadController::class, 'research'])->name('research.index');
        Route::post('/research', [AgencyResearchWriteController::class, 'store'])->name('research.store');
        Route::get('/research/{research}', [AgencyReadController::class, 'researchShow'])->name('research.show');
        Route::get('/research/{research}/pdf-parsing-result', [AiResultController::class, 'agencyPdfParsingResult'])->name('research.pdf-parsing-result');
        Route::get('/research/{research}/ai-metadata', [AiResultController::class, 'agencyAiMetadata'])->name('research.ai-metadata');
        Route::get('/research/{research}/sdg-classification', [AiResultController::class, 'agencySdgClassification'])->name('research.sdg-classification');
        Route::get('/research/{research}/ai-results', [AiResultController::class, 'agencyAiResults'])->name('research.ai-results');
        Route::post('/research/{research}/ai-results/{result}/review', [AiResultController::class, 'agencyReview'])->name('research.ai-results.review');
        Route::post('/research/{research}/ai-results/{result}/apply', [AiResultController::class, 'agencyApply'])->name('research.ai-results.apply');
        Route::match(['put', 'patch'], '/research/{research}', [AgencyResearchWriteController::class, 'update'])->name('research.update');
        Route::post('/research/{research}/submit', [AgencyResearchWriteController::class, 'submit'])->name('research.submit');
        Route::post('/research/{research}/archive', [AgencyArchiveController::class, 'archiveResearch'])->name('research.archive');
        Route::post('/research/{research}/restore', [AgencyArchiveController::class, 'restoreResearch'])->name('research.restore');
        Route::get('/research/{research}/files', [AgencyResearchWriteController::class, 'files'])->name('research.files.index');
        Route::post('/research/{research}/files', [AgencyResearchWriteController::class, 'storeFile'])->name('research.files.store');
        Route::delete('/research/{research}/files/{file}', [AgencyResearchWriteController::class, 'destroyFile'])->name('research.files.destroy');
        Route::get('/archive/research', [AgencyArchiveController::class, 'research'])->name('archive.research');
        Route::get('/access-requests', [AgencyReadController::class, 'accessRequests'])->name('access-requests.index');
        Route::post('/access-requests/{accessRequest}/approve', [AgencyAccessRequestDecisionController::class, 'approve'])->name('access-requests.approve');
        Route::post('/access-requests/{accessRequest}/deny', [AgencyAccessRequestDecisionController::class, 'deny'])->name('access-requests.deny');
        Route::get('/notifications', [AgencyReadController::class, 'notifications'])->name('notifications.index');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'agencyRead'])->name('notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'agencyReadAll'])->name('notifications.read-all');
        Route::get('/research-files', [AgencyReadController::class, 'researchFiles'])->name('research-files.index');
    });

Route::prefix('admin')
    ->name('api.admin.')
    ->middleware(['auth:sanctum', 'role:super_admin'])
    ->group(function () {
        Route::get('/dashboard', AdminDashboardController::class)->name('dashboard');
        Route::get('/agencies', [AdminReadController::class, 'agencies'])->name('agencies.index');
        Route::get('/agencies/{agency}', [AdminReadController::class, 'agencyShow'])->name('agencies.show');
        Route::get('/users', [AdminReadController::class, 'users'])->name('users.index');
        Route::get('/users/{user}', [AdminReadController::class, 'userShow'])->name('users.show');
        Route::get('/research', [AdminReadController::class, 'research'])->name('research.index');
        Route::get('/research/{research}', [AdminReadController::class, 'researchShow'])->name('research.show');
        Route::get('/research/{research}/pdf-parsing-result', [AiResultController::class, 'adminPdfParsingResult'])->name('research.pdf-parsing-result');
        Route::get('/research/{research}/ai-metadata', [AiResultController::class, 'adminAiMetadata'])->name('research.ai-metadata');
        Route::get('/research/{research}/sdg-classification', [AiResultController::class, 'adminSdgClassification'])->name('research.sdg-classification');
        Route::get('/research/{research}/ai-results', [AiResultController::class, 'adminAiResults'])->name('research.ai-results');
        Route::post('/research/{research}/ai-results/{result}/review', [AiResultController::class, 'adminReview'])->name('research.ai-results.review');
        Route::post('/research/{research}/approve', [AdminResearchModerationController::class, 'approve'])->name('research.approve');
        Route::post('/research/{research}/reject', [AdminResearchModerationController::class, 'reject'])->name('research.reject');
        Route::post('/research/{research}/publish', [AdminResearchModerationController::class, 'publish'])->name('research.publish');
        Route::post('/research/{research}/return', [AdminResearchModerationController::class, 'return'])->name('research.return');
        Route::post('/research/{research}/archive', [AdminResearchModerationController::class, 'archive'])->name('research.archive');
        Route::post('/research/{research}/restore', [AdminResearchModerationController::class, 'restore'])->name('research.restore');
        Route::get('/archive/research', [AdminArchiveController::class, 'research'])->name('archive.research');
        Route::get('/archive/files', [AdminArchiveController::class, 'files'])->name('archive.files');
        Route::post('/research-files/{file}/restore', [AdminArchiveController::class, 'restoreFile'])->name('research-files.restore');
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
        Route::get('/reports/{report}/export', [AdminAnalyticsController::class, 'export'])->name('reports.export');
        Route::get('/audit-logs', [AdminReadController::class, 'auditLogs'])->name('audit-logs.index');
        Route::get('/security-events', [AdminReadController::class, 'securityEvents'])->name('security-events.index');
        Route::get('/security/events', [AdminSecurityController::class, 'events'])->name('security.events');
        Route::get('/security/events/{securityEvent}', [AdminSecurityController::class, 'show'])->name('security.events.show');
        Route::post('/security/events/{securityEvent}/resolve', [AdminSecurityController::class, 'resolve'])->name('security.events.resolve');
        Route::post('/security/events/{securityEvent}/reopen', [AdminSecurityController::class, 'reopen'])->name('security.events.reopen');
        Route::get('/platform-settings', [AdminReadController::class, 'platformSettings'])->name('platform-settings.index');
        Route::patch('/platform-settings/{setting}', [AdminPlatformSettingController::class, 'update'])->name('platform-settings.update');
        Route::post('/platform-settings/bulk-update', [AdminPlatformSettingController::class, 'bulkUpdate'])->name('platform-settings.bulk-update');
        Route::get('/rbac/roles', [AdminRbacController::class, 'roles'])->name('rbac.roles.index');
        Route::post('/rbac/roles', [AdminRbacController::class, 'createRole'])->name('rbac.roles.store');
        Route::patch('/rbac/roles/{role}', [AdminRbacController::class, 'updateRole'])->name('rbac.roles.update');
        Route::match(['put', 'patch'], '/rbac/roles/{role}/permissions', [AdminRbacController::class, 'updateRolePermissions'])->name('rbac.roles.permissions.update');
        Route::get('/rbac/permissions', [AdminRbacController::class, 'permissions'])->name('rbac.permissions.index');
        Route::get('/rbac/users', [AdminRbacController::class, 'users'])->name('rbac.users.index');
        Route::get('/rbac/users/{user}/roles', [AdminRbacController::class, 'userRoles'])->name('rbac.users.roles.index');
        Route::post('/rbac/users/{user}/roles', [AdminRbacController::class, 'assignUserRole'])->name('rbac.users.roles.store');
        Route::delete('/rbac/users/{user}/roles/{role}', [AdminRbacController::class, 'removeUserRole'])->name('rbac.users.roles.destroy');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'adminRead'])->name('notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'adminReadAll'])->name('notifications.read-all');
    });

if (app()->isLocal()) {

    Route::get('/test-mongodb-ai-records', function () {
        $research = Research::first();

        if (! $research) {
            return response()->json([
                'message' => 'No research record found in SQLite. Create a research record first.',
            ], 404);
        }

        try {
            $aiMetadata = AiMetadata::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'title' => $research->title,
                'abstract' => $research->abstract,
                'authors' => [
                    'Juan Dela Cruz',
                    'Maria Santos',
                ],
                'keywords' => [
                    'RIKMS',
                    'AI Metadata',
                    'MongoDB',
                ],
                'detected_language' => 'English',
                'confidence_score' => 0.94,
                'extraction_source' => 'test_route',
                'raw_ai_response' => [
                    'source' => 'manual_test',
                    'message' => 'AI metadata test successful.',
                ],
                'review_status' => 'pending_review',
            ]);

            $sdgClassification = SdgClassification::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'primary_sdg' => 'SDG 4',
                'primary_sdg_label' => 'Quality Education',
                'sdg_results' => [
                    [
                        'sdg' => 'SDG 4',
                        'label' => 'Quality Education',
                        'confidence' => 0.92,
                    ],
                    [
                        'sdg' => 'SDG 9',
                        'label' => 'Industry, Innovation and Infrastructure',
                        'confidence' => 0.81,
                    ],
                ],
                'confidence_score' => 0.92,
                'classification_source' => 'test_route',
                'raw_ai_response' => [
                    'source' => 'manual_test',
                    'message' => 'SDG classification test successful.',
                ],
                'review_status' => 'pending_review',
            ]);

            $pdfParsingResult = PdfParsingResult::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'file_name' => 'sample-research.pdf',
                'file_path' => 'uploads/research/sample-research.pdf',
                'file_mime_type' => 'application/pdf',
                'file_size' => 102400,
                'page_count' => 12,
                'extracted_text' => 'This is a sample extracted text from the uploaded PDF.',
                'sections' => [
                    [
                        'title' => 'Abstract',
                        'content' => 'This is a sample abstract section.',
                    ],
                    [
                        'title' => 'Introduction',
                        'content' => 'This is a sample introduction section.',
                    ],
                ],
                'tables' => [],
                'figures' => [],
                'parser_version' => 'v1',
                'processing_status' => 'completed',
                'processing_errors' => [],
                'processed_at' => now(),
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'message' => 'Unable to create MongoDB AI records.',
                'sqlite_research_reference' => [
                    'id' => $research->id,
                    'title' => $research->title,
                    'agency_id' => $research->agency_id,
                ],
                'mongodb_connection' => config('database.connections.mongodb.database'),
                'error' => $exception->getMessage(),
            ], 503);
        }

        return response()->json([
            'message' => 'MongoDB AI records created successfully.',
            'sqlite_research_reference' => [
                'id' => $research->id,
                'title' => $research->title,
                'agency_id' => $research->agency_id,
            ],
            'mongodb' => [
                'ai_metadata' => $aiMetadata,
                'sdg_classification' => $sdgClassification,
                'pdf_parsing_result' => $pdfParsingResult,
            ],
        ]);
    });
}
