# Phase 5 Browser Verification and Advanced Integration

## 1. Objective

Phase 5 performs browser-level verification planning, protects the existing agency/admin auth boundaries, removes only verified mock dependencies, and incrementally connects AI/PDF/SDG read results, archive/restore, notification mark-read, and related UI service behavior. The relational database remains the source of truth. MongoDB remains secondary storage for flexible AI/document metadata only.

## 2. Deferred Items From Phase 4

Addressed in this increment:

- AI/PDF/SDG result read APIs.
- Agency archive/list/restore APIs for agency-owned research.
- Admin archived research/files listing APIs and research/file restore support.
- Notification mark-read and read-all APIs for agency and admin scopes.
- Agency AI suggestions panel on the repository edit page.
- Agency/admin archive services connected to real APIs where available.
- Agency notification service connected to real mark-read/read-all APIs.
- Tests and documentation.

Still deferred:

- Full live browser verification with seeded accounts.
- Permanent archive deletion.
- Archived agencies/users APIs.
- AI apply/review write endpoints.
- Full analytics/reporting exports.
- RBAC write management.
- Platform settings write management.
- MySQL staging verification.

## 3. Browser-Level Verification

Automated feature coverage confirms:

- Guest agency/admin API requests return 401.
- Wrong-role API and portal requests return 403 or the correct portal redirect.
- Agency admins cannot access admin routes.
- Super admins are not redirected to the agency dashboard.
- Agency admins cannot access another agency research record through agency APIs.
- Seeded super admin can authenticate through the admin portal flow in tests.

Pending manual browser checks:

- Login at `/agency/login` as `agency@admin.com`. The development seeder documentation states this account is not automatically created, so it must exist in pilot data or be created by a super admin first.
- Login at `/admin/login` as `super_admin@admin.com` with password `superadmin`.
- Exercise agency draft/edit/upload/submit, access request decisions, notification read actions, archive restore, and admin moderation/archive flows in a real browser.

No Playwright/Dusk browser runner is configured in this workspace, so true browser-level verification remains pending.

## 4. Mock Fallback Removal

Mocks removed:

- None deleted outright. Phase 5 did not remove broad mock modules without a live browser verification pass.

Mocks bypassed by real APIs where available:

- Agency notification mark-read/read-all now calls real APIs first.
- Agency archive list/restore now calls real APIs first.
- Agency repository archive/restore now calls real APIs first.
- Admin archived research list/restore now calls real APIs first.

Mocks retained:

- Notification mark-unread, because no backend mark-unread endpoint exists.
- Permanent archive deletion, because no protected permanent-delete API is implemented.
- Admin archived agencies/users and archive activity, because APIs are not implemented.
- Analytics/reporting, RBAC writes, settings writes, profile/settings writes, security center, and deeper admin modules.
- Upload AI simulation helpers where apply/review APIs and completed AI pipeline results are not yet present.

Retained fallback comments were added in the touched service paths using the Phase 6 TODO style.

## 5. AI/PDF/SDG Result APIs

Agency endpoints:

- `GET /api/agency/research/{research}/pdf-parsing-result`
- `GET /api/agency/research/{research}/ai-metadata`
- `GET /api/agency/research/{research}/sdg-classification`
- `GET /api/agency/research/{research}/ai-results`

Admin endpoints:

- `GET /api/admin/research/{research}/pdf-parsing-result`
- `GET /api/admin/research/{research}/ai-metadata`
- `GET /api/admin/research/{research}/sdg-classification`
- `GET /api/admin/research/{research}/ai-results`

Authorization:

- Agency admins can view results only for research under their own agency.
- Super admins can view results for any research.

MongoDB collections:

- `pdf_parsing_results`
- `ai_metadata`
- `sdg_classifications`

Response behavior:

- Uses standardized `message`, `data`, and `meta`.
- Results are labelled as suggested/unverified or `not_available`.
- Empty/missing MongoDB results return graceful empty payloads.
- Admin responses can include safe raw payload fields; agency responses do not expose raw AI payloads.

## 6. AI/PDF/SDG UI Integration

Connected:

- `resources/js/lib/agency/agency-ai-results-service.ts`
- `resources/js/components/repository/edit/EditDocumentPage.tsx`

Behavior:

- Agency repository edit page shows a read-only `AI/PDF/SDG Results` panel.
- Suggestions are labelled as suggested/read-only and show pending states when no MongoDB results exist.
- Apply/review actions are deferred because no backend apply/review endpoint exists.

## 7. Agency Archive/Restore APIs

Implemented:

- `GET /api/agency/archive/research`
- `POST /api/agency/research/{research}/archive`
- `POST /api/agency/research/{research}/restore`

Rules:

- Agency admins can manage only their own agency research.
- Published research cannot be agency-archived; published archive remains a super admin moderation action.
- Archive writes `archived_at`, `archived_by`, `archive_reason`, status `archived`, an `archive_records` row, and `agency.research.archived`.
- Restore restores the previous status from `archive_records`, clears archive fields, writes restore fields, and logs `agency.research.restored`.
- No permanent delete was implemented.

## 8. Admin Archive Listing/Restore UI

Implemented APIs:

- `GET /api/admin/archive/research`
- `GET /api/admin/archive/files`
- `POST /api/admin/research/{research}/restore`
- `POST /api/admin/research-files/{file}/restore`

Connected UI service behavior:

- `resources/js/lib/admin/archive-service.ts` loads archived research from the real API first.
- Admin research restore calls the real restore endpoint first.

Deferred:

- Archived agencies/users APIs.
- Permanent delete.
- Archive export.
- Archive activity timeline API.

## 9. Notification Mark-Read API/UI

Implemented:

- `POST /api/agency/notifications/{notification}/read`
- `POST /api/agency/notifications/read-all`
- `POST /api/admin/notifications/{notification}/read`
- `POST /api/admin/notifications/read-all`

Rules:

- Agency users can mark their own user notifications or their agency-scoped notifications.
- Agency users cannot mark another user's private notification.
- Super admins can mark their own user notifications or system notifications.
- Responses include updated notification data or unread counts.

Connected:

- `resources/js/lib/notifications/notification-service.ts` calls real agency mark-read/read-all APIs first.

Deferred:

- Mark-unread API.
- Admin notification listing UI backed by real notifications.

## 10. Analytics/Reporting Integration

No new analytics/reporting APIs were added in Phase 5. Existing Phase 2 dashboard metrics remain stable.

Deferred:

- CSV exports.
- Moderation/audit/security exports.
- Full analytics chart APIs.
- SDG analytics from verified SDG data.

## 11. RBAC Write Integration

Deferred. RBAC read/foundation exists, but safe write UI/API flows were not implemented in this Phase 5 slice.

## 12. Platform Settings Write Integration

Deferred. Platform settings read foundation exists; write flows remain pending validation and audit requirements.

## 13. MySQL Staging Verification

Pending. No MySQL staging credentials/environment are configured.

Manual checklist:

1. Configure `DB_CONNECTION=mysql`.
2. Configure staging `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
3. Run `php artisan migrate:fresh --seed --env=staging` only against staging.
4. Run `php artisan test --env=staging`.
5. Verify JSON columns, foreign keys, indexes, unique constraints, soft deletes, rollback order, seeded roles, seeded permissions, and portal accounts.

SQLite pilot support remains intact.

## 14. API Response Alignment

Aligned in this phase:

- New AI/PDF/SDG endpoints.
- New agency archive/list/restore endpoints.
- New admin archive list/file restore endpoints.
- New notification mark-read/read-all endpoints.

Deferred:

- Existing public portal response shape refactors.
- Untouched mock-backed module APIs that do not yet exist.

## 15. Tests Added or Updated

Added:

- `tests/Feature/Phase5AdvancedIntegrationTest.php`

Coverage:

- Agency/admin AI result scoping and graceful empty response.
- Agency archive/list/restore for own non-published research.
- Agency cannot archive published research or another agency's research.
- Admin archived research listing and restore.
- Notification mark-read scope and unread count behavior.

## 16. Commands Run and Results

- `php artisan route:list --path=api`: passed; 58 API routes shown after Phase 5 additions.
- `vendor/bin/pint ...`: fixed import/order formatting in touched PHP files.
- `php artisan test --filter=Phase5AdvancedIntegrationTest`: passed, 4 tests and 30 assertions.
- `npm run types:check`: passed.
- `php artisan route:list`: passed; 150 routes shown.
- `php artisan migrate:status`: passed; all 22 migrations are `Ran`.
- `php artisan migrate`: passed; nothing to migrate.
- `php artisan test`: passed, 104 tests and 505 assertions.
- `npm run lint`: passed and ran ESLint with `--fix`.
- `npm run build`: failed in sandbox with Vite/esbuild `spawn EPERM`; rerun with approved escalation passed.
- `composer test`: passed Pint and 104 tests/505 assertions. Composer still reports the existing Git safe-directory ownership warning after tests.

Attempted:

- `php artisan tinker --execute ...`: blocked by PsySH trying to write history under `C:/Users/Administrator/AppData/Roaming/PsySH`.

## 17. Issues Deferred to Phase 6

- Real browser verification with agency and admin users.
- Confirm or create `agency@admin.com` before agency browser QA.
- Remove mock fallbacks only after browser verification.
- AI result apply/review endpoints and UI actions.
- Admin archived agency/user APIs.
- Archive activity APIs.
- Protected permanent deletion, if business rules require it.
- Notification mark-unread or archive endpoints.
- Admin notification list UI backed by real notification APIs.
- Full analytics/reporting exports.
- RBAC write APIs/UI.
- Platform settings write APIs/UI.
- MySQL staging verification.
- Git safe-directory configuration for clean local git status/diff workflows.

## 18. Recommended Next Step

Recommended Phase 6 task prompt:

Perform real browser QA for RIKMS v2 with a confirmed agency admin account and the seeded super admin account. Start a local server, verify agency/admin login and redirects, exercise agency research draft/edit/upload/submit, access request decisions, agency archive/restore, notification mark-read, admin moderation, and admin archive restore. Remove only the mock fallbacks proven unnecessary by those browser checks, then implement AI result apply/review endpoints and continue analytics/RBAC/settings write integration where backend foundations are stable.
