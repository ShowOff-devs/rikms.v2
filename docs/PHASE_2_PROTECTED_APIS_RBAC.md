# Phase 2 Protected APIs and RBAC

## 1. Objective

Phase 2 builds the protected agency/admin read layer for RIKMS v2. It adds RBAC helper methods, role/permission middleware, agency scoping, standardized protected API responses, and the first safe frontend mock replacements.

The scope is intentionally backend-first and read-first. Full CRUD, upload execution, AI extraction, analytics engines, and archive restore workflows remain deferred.

## 2. Phase 1 Deferrals Addressed

- Full CRUD APIs preparation through protected read API foundations.
- RBAC middleware/policies through role, permission, and agency scope middleware.
- Frontend mock replacement through safe read-service API calls with temporary fallbacks.
- Upload workflow preparation through confirmed protected agency route boundaries and existing `research_files` metadata table.
- AI jobs preparation through documented future queue job boundaries.
- Analytics preparation through relational dashboard metrics only.
- Archive restore flow preparation through archived/deleted record filtering behavior.
- API response alignment for new Phase 2 endpoints.

## 3. RBAC Implementation

Helpers added to `App\Models\User`:

- `hasRole(string $role): bool`
- `hasAnyRole(array $roles): bool`
- `hasPermission(string $permission): bool`
- `hasAnyPermission(array $permissions): bool`
- `isSuperAdmin(): bool`
- `isAgencyAdmin(): bool`

Middleware added and registered in `bootstrap/app.php`:

- `role`
- `permission`
- `agency.scope`

Role checks use the existing `users.role` compatibility field and the normalized `roles` relationship. Permission checks use direct `permission_user` grants and role permissions through `permission_role`. Super admin users short-circuit permission checks.

Agency scoping rules:

- `super_admin` can view all records.
- `agency_admin` can only view records for `users.agency_id`.
- agency admins without `agency_id` receive HTTP 403.
- guests receive standardized HTTP 401 JSON responses for API routes.

Permissions seeded in Phase 1 remain the source for `permission:*` middleware checks, including `research.view`, `access_requests.view`, `notifications.view`, `audit_logs.view`, `security.view`, and `platform_settings.view`.

No Laravel policies were added in Phase 2; middleware and query scoping cover the read endpoints.

## 4. Protected Route Groups

Public:

- `/api/public/...`
- no auth middleware
- existing payload shapes preserved

Auth:

- `/api/auth/user`
- middleware: `auth:sanctum`

Agency:

- `/api/agency/...`
- middleware: `auth:sanctum`, `role:agency_admin,super_admin`, `agency.scope`

Admin:

- `/api/admin/...`
- middleware: `auth:sanctum`, `role:super_admin`

Local-only:

- `/api/test-mongodb-ai-records`
- still registered only in local environments

## 5. Agency APIs Added

All agency endpoints require authenticated `agency_admin` or `super_admin` access.

- `GET /api/agency/dashboard`
  - Returns agency dashboard counts, research status counts, basic year/category distributions, recent research, and recent audit activity.
- `GET /api/agency/research`
  - Filters: `status`, `keyword`, `publication_year`, `access_level`, `sort`, `per_page`, `page`.
  - Enforces agency ownership for agency admins.
- `GET /api/agency/research/{research}`
  - Returns one scoped research record.
  - Agency admins receive 403 for another agency's research.
- `GET /api/agency/access-requests`
  - Filters: `status`, `research_id`, `sort`, `per_page`, `page`.
  - Scoped by the requested research record's agency.
- `GET /api/agency/notifications`
  - Filters: `status`, `unread`, `sort`, `per_page`, `page`.
  - Scoped by user or agency.
- `GET /api/agency/research-files`
  - Filters: `research_id`, `file_type`, `status`, `access_level`, `sort`, `per_page`, `page`.
  - Scoped by agency or owning research agency.

Response structure:

```json
{
  "message": "Readable message",
  "data": {},
  "meta": {}
}
```

Paginated lists place pagination under `meta.pagination`.

## 6. Admin APIs Added

All admin endpoints require authenticated `super_admin` access.

- `GET /api/admin/dashboard`
  - Returns agency/user/research/access request/security metrics, recent audit logs, recent security events, and basic research distributions.
- `GET /api/admin/agencies`
  - Filters: `status`, `keyword`, `sort`, `per_page`, `page`.
- `GET /api/admin/agencies/{agency}`
- `GET /api/admin/users`
  - Filters: `role`, `agency_id`, `status`, `keyword`, `sort`, `per_page`, `page`.
- `GET /api/admin/users/{user}`
- `GET /api/admin/research`
  - Filters: `agency_id`, `status`, `publication_year`, `access_level`, `keyword`, `sort`, `per_page`, `page`.
- `GET /api/admin/research/{research}`
- `GET /api/admin/access-requests`
  - Filters: `agency_id`, `status`, `research_id`, `sort`, `per_page`, `page`.
- `GET /api/admin/audit-logs`
  - Filters: `event`, `user_id`, `agency_id`, `date`, `sort`, `per_page`, `page`.
- `GET /api/admin/security-events`
  - Filters: `event_type`, `severity`, `resolved`, `sort`, `per_page`, `page`.
- `GET /api/admin/platform-settings`
  - Filters: `group`, `public`, `per_page`, `page`.

No destructive admin write endpoints were added.

## 7. API Resources Added

- `AgencyResource`
- `UserResource`
- `ResearchResource`
- `AccessRequestResource`
- `NotificationResource`
- `AuditLogResource`
- `SecurityEventResource`
- `PlatformSettingResource`
- `ResearchFileResource`

Sensitive fields excluded:

- password hashes
- remember tokens
- two-factor secrets and recovery codes
- internal encrypted platform setting values

## 8. API Response Alignment

Aligned in Phase 2:

- all new agency read APIs
- all new admin read APIs
- `role`, `permission`, and `agency.scope` middleware errors
- unauthenticated `/api/*` exceptions

Deferred:

- `PublicResearchController`
- `PublicAgencyController`
- local-only MongoDB test route

Public responses were left unchanged to avoid breaking current public portal consumers and tests.

## 9. Frontend Mock Replacements

Services updated to try real protected APIs first:

- `resources/js/lib/agency/agency-dashboard-service.ts`
- `resources/js/lib/repository/repository-service.ts`
- `resources/js/lib/notifications/notification-service.ts`
- `resources/js/lib/admin/dashboard-service.ts`
- `resources/js/lib/admin/agencies-service.ts`
- `resources/js/lib/admin/system-research-service.ts`

Shared helper added:

- `resources/js/lib/api-client.ts`

Temporary fallbacks remain in those services because the current agency/admin portal login UX still has frontend-only mock session behavior in places. When the browser does not have a valid Laravel/Sanctum session, services fall back to the existing mock data.

Still mocked/deferred:

- upload workflow services
- AI metadata extraction services
- approve/reject and access request decision workflows
- archive/restore workflows
- settings update workflows
- deep analytics pages
- RBAC management writes
- agency profile/settings writes

Known UI mapping notes:

- API research records currently map to the existing frontend card/table shapes with conservative defaults for document type, file metadata, and AI-tagging indicators.
- Real upload/file metadata fields will improve repository file display in Phase 3.

## 10. Upload Workflow Preparation

Current status:

- Protected agency API group exists at `/api/agency`.
- Relational file metadata table exists as `research_files`.
- Full upload execution was not implemented in Phase 2.

Future upload flow:

1. Agency admin uploads PDF.
2. Store file securely.
3. Save relational file metadata in `research_files`.
4. Create or update research draft in relational DB.
5. Dispatch `ParsePdfDocumentJob`.
6. Store parsing result in MongoDB.
7. Dispatch `ExtractResearchMetadataJob`.
8. Store AI metadata in MongoDB.
9. Return suggested metadata for agency review.
10. Agency approves/edits metadata.
11. Save official research metadata in relational DB.

MongoDB must not store official research state.

## 11. AI Jobs Preparation

Current status:

- Queue tables already exist.
- MongoDB AI/PDF/SDG models already exist.
- No OpenAI integration or AI job execution was added.

Future jobs:

- `ParsePdfDocumentJob`
- `ExtractResearchMetadataJob`
- `ClassifyResearchSdgJob`
- `CacheAnalyticsSnapshotJob`

AI jobs should reference relational IDs such as `research_id`, `agency_id`, `uploaded_by_user_id`, and `file_id`. OpenAI keys must remain environment-based and must not be hardcoded.

## 12. Analytics Preparation

Implemented dashboard metrics use relational queries only:

- agency/user/research counts
- published research counts
- pending research approvals
- access request counts
- pending access request counts
- notification counts
- recent audit/security activity
- simple research by year/category/agency distributions

Deferred:

- charts API beyond dashboard summaries
- trend analysis
- SDG intelligence
- MongoDB analytics cache
- exports and report generation

## 13. Archive/Restore Preparation

Agency APIs exclude soft-deleted records by default through Eloquent and also filter `archived_at` on agency-scoped research, access request, and research file reads.

Admin APIs also exclude soft-deleted records by default. Dedicated archived filters and restore actions are deferred until the archive workflow is implemented.

Future restore flow:

- `GET /api/admin/archive`
- `POST /api/admin/archive/{record}/restore`
- `POST /api/agency/archive/{record}/restore` where agency-scoped
- permissions: `archive.view`, `archive.restore`

## 14. Tests Added

Feature tests:

- `tests/Feature/ProtectedApiRbacTest.php`
  - guest cannot access agency/admin APIs
  - agency admin can access agency dashboard
  - agency admin cannot access another agency's research
  - super admin can access admin dashboard
  - super admin can view all agencies/research
  - user without required role receives 403
  - standard response structure and pagination metadata
  - agency admin without agency receives 403

Unit tests:

- `tests/Unit/UserRbacTest.php`
  - `hasRole`
  - `hasAnyRole`
  - `hasPermission`
  - `hasAnyPermission`
  - super admin permission shortcut

## 15. Commands Run and Results

- `php artisan route:list --path=api`: passed during implementation; showed new agency/admin API routes.
- `php artisan test --filter=ProtectedApiRbacTest`: passed, 9 tests and 37 assertions.
- `php artisan test --filter=UserRbacTest`: passed, 3 tests and 7 assertions.
- `npm run types:check`: passed.
- `php artisan test`: passed, 71 tests and 273 assertions.
- `npm run lint`: passed and auto-fixed frontend formatting.
- `npm run build`: first failed in sandbox with `spawn EPERM` from esbuild; rerun with approved escalation passed.
- `php artisan route:list`: passed, showing 105 routes.
- `php artisan migrate:status`: passed, all 22 migrations marked `Ran`.
- `php artisan migrate`: passed, nothing to migrate.
- `php artisan db:seed`: passed; RBAC, permissions, platform settings, and test user seeders ran.
- `vendor/bin/pint ...`: fixed formatting in touched PHP files.
- `composer test`: passed Pint and all tests, 71 tests and 273 assertions. Composer still prints a Git safe-directory ownership warning after success.

`git status --short` remains blocked by Git dubious ownership protection for `C:/Users/Administrator/Herd/rikmsv2`.

## 16. Issues Deferred to Phase 3

- Full CRUD create/update/delete APIs.
- Upload storage and checksum workflow.
- Research draft creation from upload.
- PDF parsing job implementation.
- OpenAI metadata extraction integration.
- SDG classification job implementation.
- Access request approve/deny protected write APIs.
- Research approval/moderation write APIs.
- Archive list, restore, and retention workflows.
- Full analytics/reporting APIs.
- Public API response shape refactor.
- MySQL staging verification.
- Removal of temporary frontend mock fallbacks after real auth/session integration.

## 17. Recommended Next Step

Recommended Phase 3 task prompt:

Implement protected write workflows for RIKMS v2 incrementally: start with agency research draft/upload metadata creation, access request decision APIs, and admin research moderation actions. Preserve the relational database as the source of truth, keep MongoDB limited to AI/PDF/SDG metadata payloads, add feature tests for each write path, and remove temporary frontend mock fallbacks only where real Laravel/Sanctum authentication is confirmed.
