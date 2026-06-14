# Pilot Release Commit Plan

Do not use `git add .`. Use explicit paths, then run:

```bash
git diff --cached --stat
git diff --cached --check
git status
```

## 1. Database Migrations, Models, Factories, And Seeders

Purpose: make all schema/model changes deployable before controllers and frontend depend on them.

Files:

- `app/Models/Agency.php`
- `app/Models/Research.php`
- `app/Models/ResearchAnalyticsEvent.php`
- `app/Models/SecurityEvent.php`
- `app/Models/User.php`
- `app/Support/Statuses.php`
- `database/migrations/2026_06_04_000001_add_ai_result_mongo_indexes.php`
- `database/migrations/2026_06_09_000001_add_research_revision_fields.php`
- `database/migrations/2026_06_09_000002_add_public_metadata_to_research_table.php`
- `database/migrations/2026_06_09_000003_add_public_metadata_fields_to_research_table.php`
- `database/migrations/2026_06_10_000001_add_acknowledgement_to_security_events_table.php`
- `database/migrations/2026_06_11_000001_create_research_analytics_events_table.php`

Staging:

```bash
git add app/Models/Agency.php app/Models/Research.php app/Models/ResearchAnalyticsEvent.php app/Models/SecurityEvent.php app/Models/User.php app/Support/Statuses.php database/migrations/2026_06_04_000001_add_ai_result_mongo_indexes.php database/migrations/2026_06_09_000001_add_research_revision_fields.php database/migrations/2026_06_09_000002_add_public_metadata_to_research_table.php database/migrations/2026_06_09_000003_add_public_metadata_fields_to_research_table.php database/migrations/2026_06_10_000001_add_acknowledgement_to_security_events_table.php database/migrations/2026_06_11_000001_create_research_analytics_events_table.php
```

Validation: `php artisan migrate:status`, disposable `php artisan migrate:fresh --seed`, `php artisan test`.

Risk: medium. The duplicate public metadata guard migration now leaves rollback ownership to the preceding migration.

## 2. Authentication, 2FA, Session Security, And Account Archive

Files:

- `app/Http/Middleware/EnforceUserSessionTimeout.php`
- `app/Http/Middleware/EnsureSuperAdminHasTwoFactor.php`
- `app/Http/Middleware/EnsureUserHasPermission.php`
- `app/Http/Middleware/EnsureUserHasRole.php`
- `app/Http/Responses/LoginResponse.php`
- `app/Http/Responses/TwoFactorLoginResponse.php`
- `app/Http/Controllers/Settings/ProfileController.php`
- `app/Providers/FortifyServiceProvider.php`
- `bootstrap/app.php`
- `app/Support/UserNotificationPreferences.php`
- `docs/USER_ACCOUNT_DELETION_POLICY.md`
- related auth/profile/security tests

Staging:

```bash
git add app/Http/Middleware/EnforceUserSessionTimeout.php app/Http/Middleware/EnsureSuperAdminHasTwoFactor.php app/Http/Middleware/EnsureUserHasPermission.php app/Http/Middleware/EnsureUserHasRole.php app/Http/Responses/LoginResponse.php app/Http/Responses/TwoFactorLoginResponse.php app/Http/Controllers/Settings/ProfileController.php app/Providers/FortifyServiceProvider.php bootstrap/app.php app/Support/UserNotificationPreferences.php docs/USER_ACCOUNT_DELETION_POLICY.md tests/Feature/Auth/AuthenticationTest.php tests/Feature/Settings/ProfileUpdateTest.php tests/Feature/AdminAgencyRouteAuthTest.php tests/Feature/Agency/AgencyPortalPagesTest.php tests/Feature/AgencyPortalApiIntegrationTest.php
```

Validation: `composer test`, manual Super Admin 2FA login/enrollment smoke test.

Risk: medium.

## 3. Public Research APIs, Metadata Visibility, And Identifiers

Files:

- `app/Http/Controllers/Api/PublicAccessRequestController.php`
- `app/Http/Controllers/Api/PublicAgencyController.php`
- `app/Http/Controllers/Api/PublicResearchController.php`
- `app/Http/Resources/PublicResearchResource.php`
- `app/Support/PublicMetadata.php`
- `app/Support/ResearchSlugger.php`
- `app/Support/ResearchAnalyticsTracker.php`
- `docs/PUBLIC_METADATA_VISIBILITY_FIX.md`
- `docs/PUBLIC_RESEARCH_IDENTIFIER_FIX.md`
- public portal frontend and tests

Staging:

```bash
git add app/Http/Controllers/Api/PublicAccessRequestController.php app/Http/Controllers/Api/PublicAgencyController.php app/Http/Controllers/Api/PublicResearchController.php app/Http/Resources/PublicResearchResource.php app/Support/PublicMetadata.php app/Support/ResearchSlugger.php app/Support/ResearchAnalyticsTracker.php docs/PUBLIC_METADATA_VISIBILITY_FIX.md docs/PUBLIC_RESEARCH_IDENTIFIER_FIX.md resources/js/pages/welcome.tsx resources/js/pages/research/show.tsx resources/js/components/research/ResearchCard.tsx resources/js/lib/research/research-service.ts resources/js/types/research.ts tests/Feature/PublicPortalApiTest.php tests/Feature/Phase7PublicAccessRequestTest.php
```

Validation: `php artisan test --filter=PublicPortalApiTest`, public portal smoke test.

Risk: medium.

## 4. Agency Research Workflows, Uploads, Archive, Access Requests, And Notifications

Files:

- agency API controllers, agency request classes, research resources/policy
- agency settings/repository/upload components and services
- `resources/js/lib/upload/services/report-upload-service.ts`
- deleted mock upload services

Staging:

```bash
git add app/Http/Controllers/Api/AgencyAccessRequestDecisionController.php app/Http/Controllers/Api/AgencyArchiveController.php app/Http/Controllers/Api/AgencyProfileSettingsController.php app/Http/Controllers/Api/AgencyReadController.php app/Http/Controllers/Api/AgencyResearchWriteController.php app/Http/Controllers/Api/NotificationController.php app/Http/Requests/Agency/StoreAgencyResearchRequest.php app/Http/Requests/Agency/StoreResearchFileRequest.php app/Http/Requests/Agency/UpdateAgencyResearchRequest.php app/Http/Resources/ResearchResource.php app/Policies/ResearchPolicy.php resources/js/components/agency/AgencyAdminLayout.tsx resources/js/components/agency/AgencyDashboardWidgets.tsx resources/js/components/agency/UploadResearchWizard.tsx resources/js/components/access-requests/AccessRequestDetailsModal.tsx resources/js/components/access-requests/AccessRequestsPage.tsx resources/js/components/repository/ResearchViewModal.tsx resources/js/components/repository/edit/EditDocumentActions.tsx resources/js/components/repository/edit/EditDocumentPage.tsx resources/js/components/repository/edit/FileInformationSection.tsx resources/js/components/repository/edit/PublicationInformationSection.tsx resources/js/components/repository/edit/ResearchStatusPanel.tsx resources/js/components/settings/AccountInformationCard.tsx resources/js/components/settings/ActiveSessionsCard.tsx resources/js/components/settings/AgencySettingsPage.tsx resources/js/components/settings/ChangePasswordCard.tsx resources/js/components/settings/NotificationSettingsPanel.tsx resources/js/components/settings/SecuritySettingsPanel.tsx resources/js/components/upload/reports/ReportDetailsStep.tsx resources/js/components/upload/reports/ReportMetadataStep.tsx resources/js/components/upload/reports/ReportReviewStep.tsx resources/js/components/upload/wizard/UploadWizard.tsx resources/js/config/upload/projectAccomplishmentUploadConfig.ts resources/js/config/upload/terminalReportUploadConfig.ts resources/js/lib/agency/agency-research-service.ts resources/js/lib/agency/upload-research-service.ts resources/js/lib/archive/archive-service.ts resources/js/lib/notifications/notification-service.ts resources/js/lib/repository/repository-service.ts resources/js/lib/settings/settings-service.ts resources/js/lib/upload/report-workflow.ts resources/js/lib/upload/services/report-upload-service.ts resources/js/lib/upload/services/mock-report-upload-service.ts resources/js/lib/upload/services/mock-upload-draft-service.ts resources/js/lib/upload/validation.ts resources/js/pages/agency/dashboard.tsx resources/js/pages/agency/research-repository.tsx resources/js/types/agency-upload.ts resources/js/types/repository.ts resources/js/types/settings.ts resources/js/types/upload/reportWorkflow.ts resources/js/types/uploadWizard.ts tests/Feature/Phase3WriteWorkflowsTest.php tests/Feature/Phase5AdvancedIntegrationTest.php
```

Validation: `php artisan test --filter=Phase3WriteWorkflowsTest`, upload smoke test, `npm run build`.

Risk: medium.

## 5. AI/PDF/SDG Pipeline

Files:

- `app/Http/Controllers/Api/AiResultController.php`
- `app/Jobs/ClassifyResearchSdgJob.php`
- `app/Jobs/ParsePdfDocumentJob.php`
- Mongo result models
- `app/Services/AI/OpenAiResearchMetadataExtractor.php`
- `app/Services/AI/OpenAiSdgClassifier.php`
- `app/Services/AiPipelineResultWriter.php`
- `resources/js/lib/agency/agency-ai-results-service.ts`
- AI pipeline tests

Staging:

```bash
git add app/Http/Controllers/Api/AiResultController.php app/Jobs/ClassifyResearchSdgJob.php app/Jobs/ParsePdfDocumentJob.php app/Models/Mongo/AiMetadata.php app/Models/Mongo/PdfParsingResult.php app/Models/Mongo/SdgClassification.php app/Services/AI/OpenAiResearchMetadataExtractor.php app/Services/AI/OpenAiSdgClassifier.php app/Services/AiPipelineResultWriter.php resources/js/lib/agency/agency-ai-results-service.ts tests/Feature/AiMetadataPipelineTest.php tests/Feature/Phase6BrowserQaIntegrationTest.php
```

Validation: `php artisan test --filter=AiMetadataPipelineTest`, queue/Mongo smoke test.

Risk: medium.

## 6. Super Admin RBAC, Settings, Archive, Security, Analytics, And Moderation

Staging:

```bash
git add app/Http/Controllers/Api/AdminAgencyAdminUserController.php app/Http/Controllers/Api/AdminAgencyManagementController.php app/Http/Controllers/Api/AdminAnalyticsController.php app/Http/Controllers/Api/AdminArchiveController.php app/Http/Controllers/Api/AdminPlatformSettingController.php app/Http/Controllers/Api/AdminRbacController.php app/Http/Controllers/Api/AdminReadController.php app/Http/Controllers/Api/AdminResearchModerationController.php app/Http/Controllers/Api/AdminSecurityController.php app/Http/Resources/SecurityEventResource.php app/Http/Resources/UserResource.php resources/js/components/admin/agencies/AgencyActions.tsx resources/js/components/admin/agencies/AgencyManagementPage.tsx resources/js/components/admin/agencies/ArchiveAgencyModal.tsx resources/js/components/admin/agencies/CreateAgencyModal.tsx resources/js/components/admin/agencies/EditAgencyModal.tsx resources/js/components/admin/agency-admin-users/AgencyAdminUserDetailsModal.tsx resources/js/components/admin/agency-admin-users/AgencyAdminUsersPage.tsx resources/js/components/admin/agency-admin-users/AgencyAdminUsersTable.tsx resources/js/components/admin/agency-admin-users/CreateAgencyAdminModal.tsx resources/js/components/admin/archive/AdminArchivePage.tsx resources/js/components/admin/archive/ArchiveActionsMenu.tsx resources/js/components/admin/archive/ArchiveActivityTimeline.tsx resources/js/components/admin/archive/ArchiveSummaryCards.tsx resources/js/components/admin/archive/ArchiveTable.tsx resources/js/components/admin/archive/ArchiveTabs.tsx resources/js/components/admin/archive/ExportArchiveReportModal.tsx resources/js/components/admin/archive/archive-record-display.ts resources/js/components/admin/layout/AdminTopbar.tsx resources/js/components/admin/platform-settings/BackupRecoverySettings.tsx resources/js/components/admin/platform-settings/PlatformSettingsPage.tsx resources/js/components/admin/platform-settings/platform-settings-controls.tsx resources/js/components/admin/rbac/RBACManagementPage.tsx resources/js/components/admin/rbac/UserRoleAssignmentDetailsModal.tsx resources/js/components/admin/rbac/UserRoleAssignmentsTab.tsx resources/js/components/admin/research-moderation/FlaggedResearchTable.tsx resources/js/components/admin/research-moderation/ModerationActionsMenu.tsx resources/js/components/admin/research-moderation/ModerationConfirmationModal.tsx resources/js/components/admin/research-moderation/ResearchModerationPage.tsx resources/js/components/admin/research-moderation/ReviewResearchRecordModal.tsx resources/js/components/admin/security-center/ExportSecurityReportModal.tsx resources/js/components/admin/security-center/SecurityAlertDetailsModal.tsx resources/js/components/admin/security-center/SecurityAlertsPanel.tsx resources/js/components/admin/security-center/SecurityCenterPage.tsx resources/js/components/admin/system-research/SystemResearchPage.tsx resources/js/data/admin-archive-options.ts resources/js/lib/admin/admin-moderation-service.ts resources/js/lib/admin/agency-admin-users-service.ts resources/js/lib/admin/archive-service.ts resources/js/lib/admin/platform-settings-service.ts resources/js/lib/admin/rbac-service.ts resources/js/lib/admin/research-moderation-service.ts resources/js/lib/admin/security-center-service.ts resources/js/lib/admin/system-research-service.ts resources/js/pages/admin/login.tsx resources/js/types/admin-archive.ts resources/js/types/admin-users.ts resources/js/types/research-moderation.ts tests/Feature/Phase8AdminAdvancedIntegrationTest.php tests/Feature/Phase8AuthenticatedBrowserAutomationTest.php tests/Feature/ProtectedApiRbacTest.php tests/Feature/SuperAdminDashboardApiTest.php
```

Validation: `php artisan test --filter=Phase8AdminAdvancedIntegrationTest`, Super Admin smoke test.

Risk: medium.

## 7. Shared Frontend, Routing, Branding, And Config

Staging:

```bash
git add .env.example composer.json resources/js/app.tsx resources/js/components/app-logo-icon.tsx resources/js/components/app-logo.tsx resources/js/components/auth/agency-portal-shell.tsx resources/js/components/delete-user.tsx resources/js/components/layout/portal-footer.tsx resources/js/components/layout/portal-navbar.tsx resources/js/data resources/js/layouts/AdminAuthLayout.tsx resources/js/lib/api-client.ts resources/views/app.blade.php routes/api.php routes/web.php public/assets/rikms-logo.png
```

Do not stage `public/.user.ini` unless confirmed.
`resources/js/data` is intentionally staged as a directory because all `resources/js/data/mock-*.ts` files have been removed and the remaining display constants now live in option/display helpers.

Validation: `npm run types:check`, `npm run lint:check`, `npm run build`, `php artisan route:list`.

Risk: low to medium.

## 8. Tests

Purpose: stage remaining test coverage not already staged in earlier commits.

Staging:

```bash
git add tests/Feature/AdminAgencyRouteAuthTest.php tests/Feature/Agency/AgencyPortalPagesTest.php tests/Feature/AgencyPortalApiIntegrationTest.php tests/Feature/AiMetadataPipelineTest.php tests/Feature/Auth/AuthenticationTest.php tests/Feature/DevelopmentAccountSeederTest.php tests/Feature/Phase3WriteWorkflowsTest.php tests/Feature/Phase5AdvancedIntegrationTest.php tests/Feature/Phase6BrowserQaIntegrationTest.php tests/Feature/Phase7PublicAccessRequestTest.php tests/Feature/Phase8AdminAdvancedIntegrationTest.php tests/Feature/Phase8AuthenticatedBrowserAutomationTest.php tests/Feature/ProtectedApiRbacTest.php tests/Feature/PublicPortalApiTest.php tests/Feature/Settings/ProfileUpdateTest.php tests/Feature/SuperAdminDashboardApiTest.php
```

Validation: `php artisan test`.

Risk: low.

## 9. Documentation And Environment Templates

Staging:

```bash
git add docs/PHASE_3_WRITE_WORKFLOWS.md docs/PHASE_4_FRONTEND_API_INTEGRATION.md docs/SECURITY_REMEDIATION_PHASE_8_5.md docs/BACKUP_FEATURE_STATUS.md docs/PILOT_RELEASE_WORKTREE_AUDIT.md docs/PILOT_RELEASE_COMMIT_PLAN.md docs/PILOT_ENVIRONMENT_CHECKLIST.md docs/PILOT_STAGING_SMOKE_TEST.md docs/PILOT_RELEASE_READINESS.md
```

Validation: doc review plus `git diff --cached --check`.

Risk: low.

## Do Not Stage Without Confirmation

- `public/.user.ini`: server-specific PHP tuning.
- `.env`: ignored and must never be staged.
- `public/build`: generated build output.
- `storage/app/private/research/*`: private uploads.
- `database/database.sqlite`: local runtime database unless project policy explicitly changes.

## Required Before Committing

1. Decide whether to update `guzzlehttp/psr7` to `>=2.10.2` and commit the resulting `composer.lock`.
2. Review `public/.user.ini` and either explicitly include it or keep it unstaged.
3. Use the exact staged diff checks after each commit bundle.
