# Phase 0 Backend/Database Audit

## 1. Current Backend Status

RIKMS v2 currently has a Laravel 12 backend with Inertia/React pages, Fortify/Sanctum authentication support, relational Eloquent models for core entities, public API controllers for agencies and research, and MongoDB model classes for AI/PDF metadata.

The current backend is suitable for pilot hardening, but it is not yet a complete Phase 1 database foundation. Public portal APIs are partially database-backed. Most agency/admin portal screens are still Inertia routes backed by frontend mock services rather than protected CRUD APIs.

## 2. Current Database Configuration

- Current `DB_CONNECTION`: `sqlite`
- Current `DB_DATABASE`: `C:\Users\Administrator\Herd\rikmsv2\database\database.sqlite`
- SQLite pilot status: configured and `database/database.sqlite` exists.
- MySQL production-readiness status: MySQL remains available in `config/database.php`; `.env.example` keeps MySQL variables commented for future production use.
- MongoDB status: configured as a separate `mongodb` connection in `config/database.php` using `MONGODB_URI` and `MONGODB_DATABASE`.

## 3. Hybrid Database Architecture Decision

RIKMS v2 will use a hybrid database architecture.

SQLite is the local pilot database for development, demonstration, and pilot testing only. MySQL is the production relational target after the pilot. Migrations should remain MySQL-ready and should avoid SQLite-only assumptions.

The relational database is the source of truth for official records and decisions:

- users
- agencies
- roles
- permissions
- role_user pivot
- permission_role pivot
- permission_user pivot, if needed
- research records
- research approvals
- access requests
- uploaded file/document metadata
- research ownership
- research publication status
- access-control rules
- notifications
- platform settings
- archive references
- security events requiring relational integrity
- audit references that must be queryable and relational

MongoDB is secondary flexible storage for AI/document intelligence:

- AI metadata extraction results
- PDF parsing output
- extracted PDF text
- SDG classification results
- AI confidence scores
- AI prompt and response payloads
- flexible document metadata
- analytics cache
- AI processing logs
- non-critical logs
- flexible event payloads

MongoDB must not own authentication, authorization, official research state, ownership, publication status, approval status, access request decisions, download permission decisions, agency assignment, or RBAC assignments.

Relational-to-MongoDB linking rule: MongoDB documents must reference stable relational IDs such as `research_id`, `agency_id`, `uploaded_by_user_id`, `file_id`, or `access_request_id`. The relational database owns the official record.

## 4. Existing Tables and Migrations Found

Migrations found:

- `0001_01_01_000001_create_cache_table.php`
- `0001_01_01_000002_create_jobs_table.php`
- `2025_08_14_170933_add_two_factor_columns_to_users_table.php`
- `2026_05_21_000001_create_agencies_table.php`
- `2026_05_21_000002_create_users_table.php`
- `2026_05_21_000003_create_research_table.php`
- `2026_05_21_000004_create_access_requests_table.php`
- `2026_05_21_000005_create_research_approvals_table.php`
- `2026_05_21_000006_create_roles_table.php`
- `2026_05_21_000007_create_permissions_table.php`
- `2026_05_21_000008_add_public_metadata_to_research_table.php`
- `2026_05_21_000009_add_public_metadata_to_agencies_table.php`

Tables represented by current migrations:

- `cache`, `cache_locks`
- `jobs`, `job_batches`, `failed_jobs`
- `agencies`
- `users`
- `password_reset_tokens`
- `sessions`
- `research`
- `access_requests`
- `research_approvals`
- `roles`
- `permissions`

Notable migration findings:

- Foreign keys exist for core agency/user/research/access request/approval references.
- `research` uses a singular table name and the `Research` model explicitly sets `protected $table = 'research'`.
- `roles` and `permissions` tables exist, but RBAC pivot tables do not yet exist.
- `users.role` currently stores a string role, so RBAC is not normalized yet.
- `research.status`, `access_requests.status`, `research_approvals.status`, `users.status`, and `agencies.status` are string fields. This is portable, but values need Phase 1 standardization.
- `research.authors`, `research.sdgs`, and `research.keywords` use JSON columns. Laravel supports this on SQLite/MySQL, but MySQL switch testing is still required.
- `2026_05_21_000009_add_public_metadata_to_agencies_table.php` is effectively a guarded/no-op migration because the columns already exist in the create migration. Its rollback can drop columns that were created by the base migration, so it should be cleaned up in Phase 1.

## 5. Existing Models Found

Relational Eloquent models:

- `Agency`: fillable core agency fields, uses `SoftDeletes`, has many users and research.
- `User`: fillable auth/profile/agency/role/status fields, Fortify two-factor support, belongs to agency, has research/access request/approval relationships.
- `Research`: uses `research` table, fillable public/repository fields, casts JSON/date fields, belongs to agency/uploader/approver, has access requests and approvals, uses `SoftDeletes`.
- `AccessRequest`: fillable requester/review fields, casts `reviewed_at`, belongs to research/requester/reviewer/agency, uses `SoftDeletes`.
- `ResearchApproval`: fillable review fields, casts `reviewed_at`, belongs to research and reviewer.
- `Role`: fillable `name`, `display_name`, `description`; no pivot relationships yet.
- `Permission`: fillable `name`, `display_name`, `description`; no pivot relationships yet.

MongoDB models:

- `App\Models\Mongo\AiMetadata`: collection `ai_metadata`, links by `research_id` and `agency_id`.
- `App\Models\Mongo\PdfParsingResult`: collection `pdf_parsing_results`, links by `research_id` and `agency_id`.
- `App\Models\Mongo\SdgClassification`: collection `sdg_classifications`, links by `research_id` and `agency_id`.

MongoDB model usage is currently limited to AI/PDF/SDG metadata and the local-only MongoDB test route.

## 6. Existing API Routes Found

Public API routes:

- `GET /api/public/summary`
- `GET /api/public/research`
- `GET /api/public/research/{research:slug}`
- `GET /api/public/agencies`
- `GET /api/public/agencies/types`
- `GET /api/public/agencies/{agency:slug}`
- `GET /api/public/agencies/{agency:slug}/research`

Agency routes:

- Agency portal pages exist as web/Inertia routes under `/agency/*`.
- No protected agency CRUD API group exists yet.

Admin routes:

- Super admin pages exist as web/Inertia routes under `/admin/*`.
- No protected admin CRUD API group exists yet.

Auth routes:

- Fortify routes are registered for login, registration, email verification, password reset, password confirmation, logout, and two-factor authentication.
- `/login` redirects to `/agency/login`.

Dev/test routes:

- `GET /api/test-mongodb-ai-records` exists only when `app()->isLocal()` after the Phase 0 fix.
- Laravel Boost browser-log route exists: `POST /_boost/browser-logs`.

## 7. Dev/Test Routes

`/api/test-mongodb-ai-records` existed and was publicly registered in `routes/api.php`.

Phase 0 action: wrapped the route in `if (app()->isLocal())`, so it remains usable for local pilot testing but is not registered when `APP_ENV=production`.

Verification:

- Local `php artisan route:list` still shows `/api/test-mongodb-ai-records`, as expected.
- `APP_ENV=production php artisan route:list --path=api/test-mongodb-ai-records` reports no matching route.

## 8. Mock-Backed Frontend Services

Mock data files found under `resources/js/data`:

- `mock-access-request-monitor.ts`
- `mock-access-requests.ts`
- `mock-admin-agencies.ts`
- `mock-admin-archive.ts`
- `mock-admin-dashboard.ts`
- `mock-agency-admin-users.ts`
- `mock-agency-dashboard.ts`
- `mock-agency-profile.ts`
- `mock-analytics.ts`
- `mock-archive.ts`
- `mock-platform-settings.ts`
- `mock-rbac.ts`
- `mock-repository.ts`
- `mock-research-moderation.ts`
- `mock-security-center.ts`
- `mock-settings.ts`
- `mock-system-activity.ts`
- `mock-system-analytics.ts`
- `mock-system-research.ts`

Mock-backed or frontend-only service areas:

- Agency dashboard
- Agency profile
- Agency settings
- Agency notifications
- Agency access requests
- Agency archive
- Agency analytics
- Agency research repository
- Agency upload and smart upload flows
- AI metadata extraction simulation
- SDG suggestion simulation
- Super admin dashboard
- Agency management
- Agency admin user management
- RBAC management
- Research moderation
- Access request monitoring
- System research
- System analytics
- System activity
- Security center
- Platform settings
- Admin archive

Partially database-backed frontend service areas:

- Public research browsing uses `/api/public/research`.
- Public research detail uses `/api/public/research/{slug}`.
- Public agencies use `/api/public/agencies`.
- Public agency detail/research uses `/api/public/agencies/{slug}` and `/api/public/agencies/{slug}/research`.

## 9. Migration Compatibility Notes

SQLite/MySQL-compatible patterns currently used:

- Laravel schema builder is used for migrations.
- Core foreign keys use `foreignId()->constrained()`.
- Status fields use strings rather than database-native enums.
- No raw SQL migration statements were found in current migrations.

Compatibility concerns before MySQL switch:

- JSON fields on `research` should be tested on the target MySQL version.
- `after()` column placement is MySQL-oriented and tolerated by Laravel grammar, but should be checked during cross-driver migration testing.
- Rollback behavior in `2026_05_21_000009_add_public_metadata_to_agencies_table.php` can drop base columns.
- Index coverage is incomplete for frequent filters: status, agency, publication year, access level, slug, requester/reviewer fields, and approval status.
- RBAC pivot tables are missing.
- Uploaded file metadata table is missing.
- Notifications, audit logs, security events, archive records, and platform settings tables are missing.
- Status fields are not standardized through application constants/enums.
- `research` table name is singular. This is supported by the model, but the naming convention should be deliberately confirmed before Phase 1 expansion.

Recommended MySQL migration checklist after pilot:

- Run `php artisan migrate:fresh --seed` against a MySQL staging database.
- Confirm all JSON casts and query patterns work on MySQL.
- Add indexes for search/filter/ownership fields.
- Confirm foreign key names and rollback order.
- Normalize RBAC pivots.
- Add file metadata, notifications, audit/security, archive, and settings tables.
- Add explicit status constants/enums in application code while keeping portable database columns.

## 10. MongoDB Boundary Review

MongoDB is configured and currently represented by three model classes:

- `ai_metadata`
- `pdf_parsing_results`
- `sdg_classifications`

These collections are aligned with the secondary flexible storage boundary. They link to relational records with `research_id` and `agency_id`.

No core source-of-truth models for users, agencies, roles, permissions, research ownership, official approval state, publication state, or access decisions were found in MongoDB.

The only unsafe MongoDB exposure found was the write-capable test route. It has been restricted to local environments.

## 11. API Response Convention

Current status:

- No reusable API response helper existed before this audit.
- Public API controllers currently return a mix of Laravel resource responses and ad hoc JSON payloads.
- Existing public API consumers/tests expect current public payload shapes such as `items`, `total`, and JSON resource `data`.

Target response convention:

Success:

```json
{
  "message": "Readable message",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "message": "Readable error message",
  "errors": {}
}
```

Phase 0 action: added `App\Support\ApiResponse` with minimal `success()` and `error()` helpers. Controllers were not broadly refactored in Phase 0 to avoid breaking current public API consumers.

Controllers needing future response alignment:

- `PublicResearchController`
- `PublicAgencyController`
- Future agency/admin API controllers
- Local-only MongoDB test route, if it remains in use

## 12. Phase 0 Fixes Applied

- Guarded `/api/test-mongodb-ai-records` behind `app()->isLocal()`.
- Added `App\Support\ApiResponse` for the target API response convention.
- Updated `.env.example` to document SQLite pilot usage, MySQL production readiness, and MongoDB secondary metadata storage.
- Created this audit document.
- Ran formatting on touched PHP files only.

## 13. Issues Deferred to Phase 1

- Add normalized RBAC pivot tables: `role_user`, `permission_role`, and optionally `permission_user`.
- Decide whether to keep `users.role` as a transitional compatibility field or migrate fully to role assignments.
- Add missing indexes for common filters and ownership lookups.
- Standardize status values for users, agencies, research, research approvals, access requests, archive records, and upload processing.
- Add uploaded file/document metadata table.
- Add research ownership/contributor tables if multiple owners/authors need official relational records.
- Add notifications table and notification preferences.
- Add platform settings table.
- Add archive/recovery tables and archival actor fields.
- Add audit log and security event tables for relationally queryable events.
- Add access-control rules table for official download/access decisions.
- Add API route groups and middleware for agency/admin portals.
- Replace mock-backed agency/admin services with protected backend APIs incrementally.
- Align API responses to the target `message`, `data`, `meta`, and `errors` convention.
- Clean up the no-op/rollback risk in `2026_05_21_000009_add_public_metadata_to_agencies_table.php`.
- Verify all migrations against MySQL staging before production.

## 14. Risks and Blockers

- Most admin and agency modules are frontend/mock-backed, so they are not yet production backend features.
- RBAC is not normalized; authorization currently cannot rely on complete relational role/permission pivots.
- Official document metadata, audit/security events, notifications, platform settings, and archive support are not yet represented in the relational schema.
- Public API responses are not yet standardized.
- `composer test` is blocked by Pint style failures in pre-existing files and Git safe-directory ownership warnings.
- The worktree already contains many modified/untracked files outside this audit, so future changes should continue to avoid broad refactors.

## 15. Recommended Next Step

Proceed to Phase 1 database foundation work:

1. Finalize the relational schema map and naming conventions.
2. Add RBAC pivot migrations and relationships.
3. Add missing relational tables for uploaded files, notifications, archive/recovery, audit logs, security events, platform settings, and access-control rules.
4. Add indexes and standardized status constants.
5. Add protected API route groups for agency/admin modules.
6. Verify the complete schema on both SQLite and MySQL.

## Command Results

- `php artisan route:list`: passed. Local route list shows 87 routes, including public APIs and local-only `/api/test-mongodb-ai-records`.
- `APP_ENV=production php artisan route:list --path=api/test-mongodb-ai-records`: no matching route, confirming the MongoDB test route is not production-registered.
- `php artisan migrate:status`: passed. All 12 migrations are marked `Ran`.
- `DB_CONNECTION=sqlite DB_DATABASE=:memory: php artisan migrate:fresh --seed`: passed without touching the local SQLite file.
- `php artisan test`: passed, 59 tests and 229 assertions.
- `composer test`: failed during `pint --parallel --test` before PHPUnit. Remaining style failures are in pre-existing files such as tests, Mongo models, `User.php`, and `2026_05_21_000002_create_users_table.php`; Git also reports the repository as dubious ownership unless `safe.directory` is configured.
