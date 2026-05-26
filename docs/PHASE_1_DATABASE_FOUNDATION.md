# Phase 1 Database Foundation

## 1. Objective

Phase 1 implements the relational database foundation for RBAC, uploads, notifications, archive/recovery, audit/security events, platform settings, status standardization, index strategy, and protected API route group preparation. It intentionally avoids full CRUD workflows, frontend rewrites, AI extraction, analytics implementation, and MongoDB source-of-truth storage.

## 2. Hybrid Database Architecture Reminder

- SQLite remains the pilot/local development database.
- MySQL remains the target production relational database.
- The relational database is the source of truth for users, agencies, RBAC, research, approvals, access requests, file metadata, notifications, audit logs, security events, archive references, statuses, and access-control decisions.
- MongoDB remains secondary flexible storage for AI/document metadata, SDG classification results, PDF parsing output, extracted text, confidence scores, analytics cache, flexible document metadata, and non-critical processing logs.
- MongoDB must not own authentication, authorization, official research records, approval state, access request state, or download/access decisions.

## 3. Migrations Added

- `2026_05_26_000001_extend_roles_and_permissions_for_rbac.php`
- `2026_05_26_000002_create_rbac_pivot_tables.php`
- `2026_05_26_000003_create_research_files_table.php`
- `2026_05_26_000004_create_notifications_table.php`
- `2026_05_26_000005_add_archive_fields_to_source_tables.php`
- `2026_05_26_000006_create_archive_records_table.php`
- `2026_05_26_000007_create_audit_logs_table.php`
- `2026_05_26_000008_create_security_events_table.php`
- `2026_05_26_000009_create_platform_settings_table.php`
- `2026_05_26_000010_add_phase_1_indexes_to_existing_tables.php`

## 4. Migrations Modified or Extended

Existing tables extended through new additive migrations:

- `roles`: added `slug`, `is_system`, `is_active`, `deleted_at`.
- `permissions`: added `slug`, `module`.
- `users`: added archive/recovery fields and `deleted_at` column for future compatibility, while the model still hard-deletes to preserve existing account deletion behavior.
- `agencies`: added archive/recovery fields.
- `research`: added archive/recovery fields and `published_at`.
- `access_requests`: added archive/recovery fields.

No old migration history was rewritten.

## 5. Tables Created

- `role_user`
- `permission_role`
- `permission_user`
- `research_files`
- `notifications`
- `archive_records`
- `audit_logs`
- `security_events`
- `platform_settings`

## 6. Models Added or Updated

Added:

- `App\Models\ResearchFile`
- `App\Models\Notification`
- `App\Models\ArchiveRecord`
- `App\Models\AuditLog`
- `App\Models\SecurityEvent`
- `App\Models\PlatformSetting`
- `App\Support\Statuses`

Updated:

- `User`: roles, direct permissions, research files, notifications, audit logs, security events, archive records.
- `Role`: soft deletes, users, permissions.
- `Permission`: roles, users.
- `Agency`: research files, notifications, audit logs, security events.
- `Research`: files, archive actor relationships, `published_at` cast.
- `AccessRequest`: archive actor relationships.
- `ResearchApproval`: `approver()` alias for `reviewed_by`.

## 7. RBAC Foundation

RBAC now has relational source-of-truth support:

- `roles`: `name`, `slug`, `display_name`, `description`, `is_system`, `is_active`, timestamps, soft deletes.
- `permissions`: `name`, `slug`, `module`, `display_name`, `description`, timestamps.
- `role_user`: `user_id`, `role_id`, `assigned_by`, `assigned_at`, timestamps, unique `user_id + role_id`.
- `permission_role`: `permission_id`, `role_id`, timestamps, unique `role_id + permission_id`.
- `permission_user`: direct user grants with `granted_by`, `granted_at`, `expires_at`, timestamps, unique `user_id + permission_id`.

Seeders added:

- `RoleSeeder`
- `PermissionSeeder`

Default roles seeded:

- `super_admin`
- `agency_admin`
- `public_user`

Default permission modules seeded:

- `dashboard`
- `agencies`
- `users`
- `research`
- `uploads`
- `access_requests`
- `approvals`
- `analytics`
- `reports`
- `notifications`
- `archive`
- `audit_logs`
- `security`
- `platform_settings`

## 8. Upload/File Metadata Foundation

The relational upload metadata table is `research_files`, chosen because the current official source-of-truth table is `research`.

It stores file ownership and storage metadata only:

- research, agency, uploader references
- original and stored names
- disk/path/mime/extension/size/checksum
- file type, visibility, access level, processing status
- lightweight JSON metadata
- upload/archive/recovery timestamps

Large extracted text, AI extraction payloads, SDG classification output, and confidence scores remain MongoDB responsibilities.

## 9. Notifications Foundation

The custom `notifications` table supports:

- nullable `user_id`
- nullable `agency_id`
- `type`, `title`, `message`
- optional JSON `data`
- `read_at`, `action_url`
- `priority`
- `status`
- timestamps

Statuses are string-based: `unread`, `read`, `archived`.

## 10. Archive/Recovery Foundation

Archive/recovery is prepared in two ways:

- Source tables now have nullable `archived_at`, `archived_by`, `archive_reason`, `restored_at`, and `restored_by` fields where appropriate.
- `archive_records` provides centralized polymorphic tracking through `archivable_type` and `archivable_id`.

Existing `Agency`, `Research`, and `AccessRequest` soft-delete behavior is preserved. `User` hard-delete behavior is preserved to avoid breaking current account deletion tests; user archival should use status/archive fields until a dedicated account lifecycle workflow is designed.

## 11. Audit and Security Event Foundation

`audit_logs` supports:

- user and agency references
- event name
- nullable polymorphic auditable reference
- IP address and user agent
- old/new values JSON
- metadata JSON
- `created_at`

`security_events` supports:

- user and agency references
- event type and severity
- IP address, user agent, location
- metadata JSON
- resolution timestamp and resolver
- `created_at`

## 12. Platform Settings Foundation

`platform_settings` supports:

- unique `key`
- nullable `value`
- string `type`
- nullable `group`, `label`, `description`
- `is_public`
- `is_encrypted`
- nullable `updated_by`
- timestamps

`PlatformSettingSeeder` adds safe pilot defaults for site name, maintenance mode, upload limit, and AI processing toggle.

## 13. Status Standardization

`App\Support\Statuses` centralizes portable string status values:

- users: `active`, `inactive`, `suspended`, `archived`
- agencies: `active`, `inactive`, `pending`, `archived`
- research: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `published`, `archived`
- research approvals: `pending`, `approved`, `rejected`, `returned`
- access requests: `pending`, `approved`, `denied`, `expired`, `cancelled`
- research files: `pending`, `active`, `archived`, `deleted`, `failed`
- notifications: `unread`, `read`, `archived`
- security severities: `low`, `medium`, `high`, `critical`

No destructive status data migration was performed. Existing values such as `research.access_level = request_required` remain in place for compatibility and should be reconciled during API/workflow implementation.

## 14. Index Strategy

Indexes added or confirmed through new schema:

- `roles.slug` unique
- `permissions.slug` unique
- `permissions.module`
- `role_user.user_id`, `role_user.role_id`, unique `user_id + role_id`
- `permission_role.permission_id`, `permission_role.role_id`, unique `role_id + permission_id`
- `permission_user.user_id`, `permission_user.permission_id`, unique `user_id + permission_id`
- `research_files.research_id`, `agency_id`, `uploaded_by`, `file_type`, `access_level`, `status`, `created_at`
- `notifications.user_id`, `agency_id`, `type`, `status`, `read_at`, `created_at`
- `archive_records.archivable_type + archivable_id`, `archived_by`, `restored_by`, `archived_at`, `restored_at`
- `audit_logs.user_id`, `agency_id`, `event`, `auditable_type + auditable_id`, `created_at`
- `security_events.user_id`, `agency_id`, `event_type`, `severity`, `resolved_at`, `created_at`
- `platform_settings.key` unique, `group`, `is_public`
- existing source tables: `users.status`, `users.created_at`, `agencies.status`, `agencies.created_at`, `research.status`, `research.publication_year`, `research.access_level`, `research.created_at`, `research.published_at`, `access_requests.status`, `access_requests.created_at`, `research_approvals.status`, `research_approvals.created_at`

Already indexed or unique fields such as `users.email`, `agencies.slug`, and `research.slug` were not duplicated.

## 15. Protected Route Groups

`routes/api.php` now has clear groups:

- Public: `/api/public/...`
- Auth: `/api/auth/user`, protected by `auth:sanctum`
- Agency: `/api/agency/dashboard`, protected by `auth:sanctum`
- Admin: `/api/admin/dashboard`, protected by `auth:sanctum`

Agency/admin groups include TODO comments for future RBAC middleware activation. The local MongoDB test route remains registered only in local environments and is not present when `APP_ENV=production`.

## 16. API Response Alignment

`App\Support\ApiResponse` already existed from Phase 0 and is now used by the new Phase 1 protected API stubs.

Deferred response alignment:

- `PublicResearchController`
- `PublicAgencyController`
- future agency/admin CRUD controllers
- local-only MongoDB test route, if it remains

Existing public API payloads were not refactored to avoid breaking current consumers/tests.

## 17. Mock-Backed Frontend Service Replacement Plan

Future backend API mapping:

- `resources/js/lib/agency/agency-dashboard-service.ts` -> `GET /api/agency/dashboard`
- `resources/js/lib/admin/dashboard-service.ts` -> `GET /api/admin/dashboard`
- `resources/js/lib/repository/repository-service.ts` -> `GET /api/agency/research`
- `resources/js/lib/research/research-service.ts` -> `GET /api/public/research`
- `resources/js/lib/access-requests/access-request-service.ts` -> `/api/agency/access-requests`
- `resources/js/lib/notifications/notification-service.ts` -> `/api/agency/notifications`
- `resources/js/lib/archive/archive-service.ts` -> `/api/agency/archive`
- `resources/js/lib/analytics/analytics-service.ts` -> `/api/agency/analytics`
- `resources/js/lib/agency-profile/agency-profile-service.ts` -> `/api/agency/profile`
- `resources/js/lib/settings/settings-service.ts` -> `/api/agency/settings`
- `resources/js/lib/upload/services/mock-research-upload-service.ts` -> `/api/agency/uploads/research`
- `resources/js/lib/upload/services/mock-report-upload-service.ts` -> `/api/agency/uploads/reports`
- `resources/js/lib/upload/services/mock-ai-metadata-service.ts` -> future async AI metadata job endpoints backed by relational file IDs and MongoDB AI payloads
- `resources/js/lib/admin/agencies-service.ts` -> `/api/admin/agencies`
- `resources/js/lib/admin/agency-admin-users-service.ts` -> `/api/admin/agency-admin-users`
- `resources/js/lib/admin/rbac-service.ts` -> `/api/admin/rbac`
- `resources/js/lib/admin/research-moderation-service.ts` -> `/api/admin/research-moderation`
- `resources/js/lib/admin/access-request-monitor-service.ts` -> `/api/admin/access-requests`
- `resources/js/lib/admin/system-research-service.ts` -> `/api/admin/research`
- `resources/js/lib/admin/system-analytics-service.ts` -> `/api/admin/analytics`
- `resources/js/lib/admin/system-activity-service.ts` -> `/api/admin/activity`
- `resources/js/lib/admin/security-center-service.ts` -> `/api/admin/security-events`
- `resources/js/lib/admin/archive-service.ts` -> `/api/admin/archive`
- `resources/js/lib/admin/platform-settings-service.ts` -> `/api/admin/platform-settings`

Only minimal protected dashboard stubs were added in Phase 1.

## 18. SQLite/MySQL Compatibility Notes

Compatibility decisions:

- Used Laravel schema builder only.
- Kept statuses as strings, not database enums.
- Used JSON columns only for metadata/payload fields where Laravel supports SQLite/MySQL handling.
- Avoided raw database-specific SQL.
- Avoided destructive column modifications that require `doctrine/dbal`.
- Used nullable foreign keys where records may be deleted or archived.
- Used additive migrations instead of rewriting existing migrations.
- Avoided duplicating indexes already created by unique constraints or foreign keys.

Risks to verify in MySQL staging:

- JSON column behavior and query patterns.
- Foreign key naming and rollback order.
- Index names against production naming limits.
- Existing migration `2026_05_21_000009_add_public_metadata_to_agencies_table.php` remains a guarded no-op with risky rollback behavior from Phase 0.

## 19. MySQL Staging Verification

MySQL verification is pending. The local `.env` is configured only for SQLite:

- `DB_CONNECTION=sqlite`
- `DB_DATABASE=C:\Users\Administrator\Herd\rikmsv2\database\database.sqlite`

Recommended MySQL staging verification:

1. Configure `DB_CONNECTION=mysql`.
2. Configure `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
3. Run `php artisan migrate:fresh --seed` against a staging database.
4. Run `php artisan test`.
5. Check foreign keys.
6. Check JSON fields.
7. Check indexes.
8. Check rollback.
9. Verify seeded roles and permissions.
10. Verify `php artisan route:list`.

## 20. Commands Run and Results

- `php artisan migrate`: passed. Ten Phase 1 migrations ran on the SQLite pilot database.
- `php artisan db:seed`: passed. RBAC roles/permissions, platform settings, and the local test user role assignment seeded successfully.
- `php artisan migrate:status`: passed. All 22 migrations are marked `Ran`.
- `php artisan route:list`: passed. Shows 90 routes, including protected `/api/auth/user`, `/api/agency/dashboard`, and `/api/admin/dashboard`.
- `$env:DB_CONNECTION='sqlite'; $env:DB_DATABASE=':memory:'; php artisan migrate:fresh --seed`: passed. Fresh SQLite in-memory rebuild and seed completed without resetting the pilot database file.
- `php artisan test`: first run found a user soft-delete regression; after removing `SoftDeletes` from the `User` model, passed with 59 tests and 229 assertions.
- `composer test`: passed. Pint check passed and PHPUnit passed with 59 tests and 229 assertions. The command still prints a Git safe-directory ownership warning after success.
- `$env:APP_ENV='production'; php artisan route:list --path=api/test-mongodb-ai-records`: passed expectation by reporting no matching routes.
- `git status --short`: blocked by Git dubious ownership protection for `C:/Users/Administrator/Herd/rikmsv2`.

`php artisan migrate:fresh --seed` was not run against the local SQLite file because that would reset pilot data. The safe in-memory equivalent was run instead.

## 21. Issues Deferred to Phase 2

- Full agency/admin CRUD APIs.
- RBAC middleware and authorization policies using the new pivot tables.
- Replacement of frontend mock services with protected APIs.
- Full notification delivery/read/archive workflows.
- Upload storage workflow and checksum generation.
- AI extraction jobs and MongoDB payload persistence linked by relational IDs.
- Analytics/reporting APIs.
- Archive restore/delete workflows and retention policy.
- Public API response shape refactor.
- MySQL staging migration verification.
- Cleanup strategy for the Phase 0 no-op agency metadata rollback risk.
- Formal access-control decision table for downloads, if business rules require more than `access_requests`.

## 22. Recommended Next Step

Recommended Phase 2 prompt:

Implement protected agency/admin API controllers and RBAC middleware for RIKMS v2 using the Phase 1 relational foundation. Start with authenticated dashboard, research repository listing, access requests, notifications, and RBAC read endpoints. Replace only the corresponding frontend mock services that can be safely backed by current relational data, preserve public API compatibility, and keep MongoDB limited to AI/document metadata payloads.
