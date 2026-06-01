# Phase 7 Browser QA and Public Access Requests

## 1. Objective

Phase 7 performed Laravel Herd QA, added real public access request submission, connected the public research detail UI to the database-backed API, added the `/browse` alias, and removed only the browser-verified fake public request submission behavior. Broader admin/RBAC/settings/security/analytics mocks remain deferred.

## 2. Environment

- Laravel Herd URL: `http://rikmsv2.test`
- Laravel Herd was used; `php artisan serve` was not used.
- Frontend dev command: `npm run dev -- --host 127.0.0.1`
- Vite used `http://127.0.0.1:5174` because port `5173` was already occupied.
- Database: SQLite via `DB_CONNECTION=sqlite`; MySQL staging verification remains pending.
- MongoDB remains secondary flexible storage for AI/PDF/SDG metadata only.

## 3. Commands Run

- `php artisan route:list`: passed; `/browse` and public access request POST route present after changes.
- `php artisan migrate:status`: passed; existing migrations had run.
- `php artisan migrate`: passed; Phase 7 migration applied.
- `php artisan db:seed`: passed; development agency and admin accounts seeded.
- `php artisan test`: passed, `114` tests and `605` assertions.
- `composer test`: passed, including Pint and tests; Git still prints a local dubious-ownership warning after the successful run.
- `npm run dev -- --host 127.0.0.1`: sandbox attempt hit Windows `spawn EPERM`; escalated run passed and served Vite at port `5174`.
- `npm run types:check`: passed.
- `npm run typecheck`: not defined; npm suggested `types:check`.
- `npm run lint:check`: passed.
- `npm run lint`: passed.
- `npm run build`: sandbox attempt hit Windows `spawn EPERM`; escalated run passed.

## 4. Public Portal Browser QA

- `/`: HTTP 200 over Herd.
- `/browse`: follows to `/browse-research`.
- `/browse-research`: HTTP 200 and headless Chrome rendered database-backed research cards.
- `/browse-research/phase6-access-research#request-access`: headless Chrome rendered the research detail page and request access modal fields.
- `/agencies`, `/about`, `/contact`, `/agency/login`, `/admin/login`: HTTP/browser smoke checks passed.
- Public research API returned published DOST XI records with normalized `restricted` labels for `request_required` records.
- Public access request submission was verified through the Herd API with a real database row, audit log, and notification.

## 5. Agency Admin Browser QA

- Guest `/agency/dashboard` protection remains covered by route tests and previous QA.
- Seeded agency login returns the expected JSON redirect to `/agency/dashboard`.
- PowerShell's web session did not retain the authenticated Laravel session for follow-up Sanctum API calls, so full interactive authenticated browser automation remains pending.
- Agency follow-up for public requests is covered by Phase 7 feature tests: own-agency listing works, approve works, and cross-agency decision is forbidden.

## 6. Super Admin Browser QA

- `/admin/login` renders over Herd.
- Guest protection and role boundaries are covered by existing route/auth tests.
- Super admin dashboard and protected read/write moderation workflows remain covered by existing Phase 3, Phase 5, Phase 6, and dashboard tests.
- Full interactive authenticated browser automation remains pending for a real browser/Playwright pass.

## 7. Public Access Request API

- Endpoint: `POST /api/public/research/{research}/access-requests`
- `{research}` accepts a slug and numeric ID fallback.
- Validation:
  - `requester_name` required string max 255
  - `requester_email` required email max 255
  - `requester_affiliation` nullable string max 255
  - `requester_purpose` required string max 1000
  - `message` nullable string max 2000
  - `intended_use` nullable string max 1000
- Creates relational `access_requests` row with `research_id`, `agency_id`, requester details, `status = pending`, and `requested_at`.
- Rejects open/public research, archived research, deleted research, and duplicate pending requests for the same email and research.
- Audit log event: `access_request.submitted`, scoped to the research agency.
- Notification: agency admins receive `access_request.submitted`.

## 8. Public Access Request UI

- Updated `resources/js/pages/research/show.tsx`.
- Updated `resources/js/lib/research/research-service.ts`.
- Fields: name, email, affiliation, purpose, message.
- UI now uses the real POST endpoint.
- Loading, validation errors, failure message, and success confirmation are displayed.
- The previous timeout-based fake submission was removed.

## 9. Agency Access Request Verification

- Phase 7 tests confirm the public request appears in the correct agency API list.
- Agency admin can approve the created request.
- Agency admin cannot decide another agency's request.
- Approval audit and notification behavior remains covered.

## 10. Admin Access Monitoring Verification

- Real admin read API `GET /api/admin/access-requests` exists.
- The admin access monitoring frontend service is still mock-backed and marked for Phase 8/9.

## 11. /browse Alias

- `/browse` was missing.
- Added `Route::redirect('/browse', '/browse-research')->name('browse')`.
- Added a Phase 7 route test.

## 12. Mock Fallbacks Removed

- Removed the public research detail fake request submission timer.
- Proof: headless Chrome rendered the real modal, and Herd POST created a real relational access request with audit and notification records.

## 13. Mock Fallbacks Retained

- Agency access request listing fallback: retained until authenticated browser QA proves complete real frontend behavior.
- Admin access monitoring: retained; frontend service is mock-backed.
- RBAC writes: retained; real protected write API and last-super-admin browser QA are pending.
- Platform settings writes: retained; protected writes, validation, masking, and audit are pending.
- Security center actions: retained; resolve/revoke/export workflows remain mock-backed.
- Agency profile/settings and analytics: retained; APIs are incomplete or not browser-verified.
- Admin analytics/reporting and exports: retained; still mock-backed.

## 14. Issues Found and Fixed

- Missing public access request creation endpoint: fixed.
- Public detail request access UI used fake submission: fixed.
- `/browse` alias missing: fixed.
- Public API exposed raw `request_required` access level to public UI: normalized to `restricted`.
- Tests were reading live Mongo results during in-memory SQLite testing: fixed by skipping Mongo lookups while running unit/feature tests.

## 15. Tests Added or Updated

- Added `tests/Feature/Phase7PublicAccessRequestTest.php`.
- Added coverage for `/browse`, guest submission, row creation, pending status, research/agency linkage, validation, duplicate pending request blocking, archived/deleted rejection, audit log creation, notification creation, agency visibility, agency approval, and cross-agency protection.

## 16. Issues Deferred to Phase 8

- Full authenticated browser automation with a persistent real browser session.
- Admin access monitoring frontend replacement with real API data.
- RBAC writes with last-super-admin protection.
- Platform settings writes with validation/masking/audit.
- Security center actions.
- Agency profile/settings and analytics.
- Admin analytics/reporting/export workflows.
- MySQL staging migration/seed/test verification.

## 17. Recommended Phase 8 Task

Run Phase 8 focused on authenticated browser automation and replacing high-risk admin mocks: wire admin access monitoring to the real API, implement RBAC and platform settings writes with audit logs and last-super-admin protection, then browser-verify agency/admin analytics and security center actions before removing their mock fallbacks.
