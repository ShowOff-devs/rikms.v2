# Pilot Release Worktree Audit

Audit date: 2026-06-13

Branch: `main`
Base commit: `36654f73fd6a2bd3c2a613e0158ca31b6304645c`

## Current Git State

- `git status --short`: dirty working tree, no staged files.
- `git diff --stat`: 172 tracked files changed, 8374 insertions, 1380 deletions.
- Modified tracked files: 170.
- Deleted tracked files: 2.
- Renamed files: 0.
- Untracked files: 23 before this audit documentation was created.
- Staged files: 0.
- `git diff --check`: passed.

Deleted tracked files:

- `resources/js/lib/upload/services/mock-report-upload-service.ts`
- `resources/js/lib/upload/services/mock-upload-draft-service.ts`

Untracked release candidates:

- `app/Http/Middleware/EnforceUserSessionTimeout.php`
- `app/Http/Middleware/EnsureSuperAdminHasTwoFactor.php`
- `app/Http/Responses/TwoFactorLoginResponse.php`
- `app/Models/ResearchAnalyticsEvent.php`
- `app/Services/AI/OpenAiSdgClassifier.php`
- `app/Support/PublicMetadata.php`
- `app/Support/ResearchAnalyticsTracker.php`
- `app/Support/ResearchSlugger.php`
- `app/Support/UserNotificationPreferences.php`
- `database/migrations/2026_06_04_000001_add_ai_result_mongo_indexes.php`
- `database/migrations/2026_06_09_000001_add_research_revision_fields.php`
- `database/migrations/2026_06_09_000002_add_public_metadata_to_research_table.php`
- `database/migrations/2026_06_09_000003_add_public_metadata_fields_to_research_table.php`
- `database/migrations/2026_06_10_000001_add_acknowledgement_to_security_events_table.php`
- `database/migrations/2026_06_11_000001_create_research_analytics_events_table.php`
- `docs/BACKUP_FEATURE_STATUS.md`
- `docs/PUBLIC_METADATA_VISIBILITY_FIX.md`
- `docs/PUBLIC_RESEARCH_IDENTIFIER_FIX.md`
- `docs/USER_ACCOUNT_DELETION_POLICY.md`
- `public/.user.ini`
- `public/assets/rikms-logo.png`
- `resources/js/components/admin/rbac/UserRoleAssignmentDetailsModal.tsx`
- `resources/js/lib/upload/services/report-upload-service.ts`

## Bundle Classification

Database foundation:

- Modified: `app/Models/Agency.php`, `app/Models/Research.php`, `app/Models/SecurityEvent.php`, `app/Models/User.php`, `app/Support/Statuses.php`, `composer.json`.
- Untracked: all six `database/migrations/2026_06_*` files, `app/Models/ResearchAnalyticsEvent.php`.

Authentication and security:

- Modified: `app/Http/Responses/LoginResponse.php`, `app/Providers/FortifyServiceProvider.php`, `bootstrap/app.php`, `app/Http/Middleware/EnsureUserHasPermission.php`, `app/Http/Middleware/EnsureUserHasRole.php`, `app/Http/Controllers/Settings/ProfileController.php`, `app/Http/Controllers/Api/AdminSecurityController.php`, security/settings React components and tests.
- Untracked: `app/Http/Middleware/EnforceUserSessionTimeout.php`, `app/Http/Middleware/EnsureSuperAdminHasTwoFactor.php`, `app/Http/Responses/TwoFactorLoginResponse.php`, `app/Support/UserNotificationPreferences.php`, `docs/USER_ACCOUNT_DELETION_POLICY.md`.

Public portal:

- Modified: `app/Http/Controllers/Api/PublicAccessRequestController.php`, `app/Http/Controllers/Api/PublicAgencyController.php`, `app/Http/Controllers/Api/PublicResearchController.php`, `app/Http/Resources/PublicResearchResource.php`, `resources/js/pages/welcome.tsx`, `resources/js/pages/research/show.tsx`, `resources/js/components/research/ResearchCard.tsx`, `resources/js/lib/research/research-service.ts`, `resources/js/types/research.ts`, public portal tests.
- Untracked: `app/Support/PublicMetadata.php`, `app/Support/ResearchSlugger.php`, `app/Support/ResearchAnalyticsTracker.php`, public identifier/metadata docs.

Agency portal:

- Modified: agency read/write/archive/settings controllers, request validators, agency dashboard/repository/upload/settings components, agency services, notification service, repository service, upload workflow config and types.
- Untracked: `resources/js/lib/upload/services/report-upload-service.ts`.

AI/PDF/SDG pipeline:

- Modified: `app/Jobs/ClassifyResearchSdgJob.php`, `app/Jobs/ParsePdfDocumentJob.php`, Mongo models, `app/Services/AI/OpenAiResearchMetadataExtractor.php`, `app/Services/AiPipelineResultWriter.php`, `app/Http/Controllers/Api/AiResultController.php`, AI result frontend service and tests.
- Untracked: `app/Services/AI/OpenAiSdgClassifier.php`, Mongo index migration.

Super Admin:

- Modified: admin agency, analytics, archive, platform setting, RBAC, read, moderation, security controllers; admin archive, RBAC, moderation, security center, platform settings, system research components; admin services and types.
- Untracked: `resources/js/components/admin/rbac/UserRoleAssignmentDetailsModal.tsx`.

Frontend integration:

- Modified: `resources/js/app.tsx`, `resources/views/app.blade.php`, frontend API client/services/types/layouts/components, `routes/web.php`, `routes/api.php`.
- Deleted: two mock upload services.
- Untracked: `resources/js/lib/upload/services/report-upload-service.ts`, `public/assets/rikms-logo.png`.

Tests:

- Modified: all listed feature tests under `tests/Feature/*` for admin, agency, AI, auth, public portal, profile, RBAC, and dashboard flows.

Documentation/configuration:

- Modified: `.env.example`, `docs/PHASE_3_WRITE_WORKFLOWS.md`, `docs/PHASE_4_FRONTEND_API_INTEGRATION.md`, `docs/SECURITY_REMEDIATION_PHASE_8_5.md`.
- Untracked: backup/status, public metadata, public identifier, account deletion docs, this pilot audit documentation.

## Tracked To Untracked Dependency Checklist

Required for release:

- `bootstrap/app.php` references `EnforceUserSessionTimeout` and `EnsureSuperAdminHasTwoFactor`.
- `app/Providers/FortifyServiceProvider.php` references `TwoFactorLoginResponse`.
- `AdminAnalyticsController`, `Research`, and Phase 8 tests reference `ResearchAnalyticsEvent`.
- `ClassifyResearchSdgJob` references `OpenAiSdgClassifier`.
- Agency/public controllers, request validators, resources, services, upload workflow, public pages, and tests reference `PublicMetadata`.
- Public and agency research controllers reference `ResearchSlugger`.
- Public research controller references `ResearchAnalyticsTracker`.
- Access request and research notification paths reference `UserNotificationPreferences`.
- `RBACManagementPage.tsx` references `UserRoleAssignmentDetailsModal.tsx`.
- Upload wizard/report steps reference `report-upload-service.ts`.
- App logo components reference `public/assets/rikms-logo.png`.
- The deleted mock upload services must be staged as deletions together with the replacement real upload service.

Optional or local-only:

- `public/.user.ini` sets PHP upload/memory limits. Treat as server-specific and stage only after confirming this belongs in source control for Herd/pilot hosting.

Suspicious/unrelated:

- None conclusively unrelated. The main review candidate is `public/.user.ini`.

## Secrets And Local Files

- `.env` exists and remains ignored by `.gitignore`.
- `.env.example` contains placeholders for MongoDB, OpenAI, AWS, mail, and database passwords.
- `.env.example` includes `RIKMS_DEV_SUPER_ADMIN_AUTH_CODE=123456` with `RIKMS_ALLOW_DEV_SEED_ACCOUNTS=false`; this is documented as local/pilot-only seed support and must remain disabled in production.
- Secret keyword scan found expected references in config, tests, seeders, docs, and code. No real tracked credential was identified during this audit.
- `storage/app/private/research/*` contains private PDF uploads and remains ignored/local-only.
- `public/build` contains generated Vite assets and remains ignored.
- `database/database.sqlite` was not listed as untracked and was not staged.

## Migration Safety Notes

- The untracked migrations are already recorded as `Ran` in the current local database. This is a release-control risk until they are committed.
- `2026_06_09_000003_add_public_metadata_fields_to_research_table.php` is redundant after `2026_06_09_000002_add_public_metadata_to_research_table.php`; its rollback was changed to a no-op so it no longer drops a column owned by the previous migration.
- `2026_06_09_000001_add_research_revision_fields.php` has self-referencing nullable FKs and defaults that are compatible with existing data, but lacks guards for partially applied databases.
- `2026_06_10_000001_add_acknowledgement_to_security_events_table.php` guards column creation and uses nullable FK fields.
- `2026_06_11_000001_create_research_analytics_events_table.php` depends on existing `research`, `agencies`, `users`, and `research_files` tables.
- Mongo index migration skips when MongoDB is not configured, but `MONGODB_DATABASE` defaults may make configuration appear present; verify pilot MongoDB settings.

## Verification Results

- `php artisan optimize:clear`: passed.
- `php artisan route:list`: passed, 239 routes.
- `php artisan migrate:status`: passed; all current migrations including the untracked migration files show `Ran`.
- `php artisan test`: passed, 179 passed, 2 skipped, 1136 assertions.
- `composer test`: initially failed Pint on two controllers; `composer lint` fixed formatting; rerun passed, 179 passed, 2 skipped, 1136 assertions. Composer reported a local cache directory warning only.
- `npm run types:check`: passed.
- `npm run lint:check`: passed.
- `npm run lint`: passed.
- `npm run build`: first sandbox run failed with `spawn EPERM`; rerun with escalation passed.
- Disposable SQLite `migrate:fresh --seed`: passed with `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`.
- Disposable SQLite `php artisan test`: passed, 179 passed, 2 skipped, 1136 assertions.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `composer audit`: failed under sandbox networking, passed network access, then reported 2 medium advisories in `guzzlehttp/psr7` fixed by `>=2.10.2`.

## Remaining Blockers

- Working tree remains dirty and cannot be deployed as-is.
- Required untracked implementation files must be staged with their tracked references.
- Composer audit has 2 medium advisories in `guzzlehttp/psr7`.
- Incremental migration was not run against a current pilot database copy. Do not run it against the live pilot database without confirmation and backup.
- Staging smoke test has not been manually executed.
