# Phase 6 Browser QA and AI Review

## 1. Objective

Phase 6 performed real browser QA through Laravel Herd, verified the seeded Agency Admin and Super Admin flows, fixed browser-discovered auth/API issues, implemented AI result review/apply endpoints, and continued only stable analytics/RBAC/settings verification. MongoDB remains secondary flexible storage for AI/PDF/SDG suggestions; official research metadata remains in the relational database.

## 2. Local Environment

- Laravel Herd is used for local serving.
- `php artisan serve` was not used and is not required.
- Herd domain used: `http://rikmsv2.test`.
- Vite command used for browser QA: `npm run dev -- --host 127.0.0.1`.
- Vite was stopped after QA and `public/hot` was removed so the verified production build is used.

## 3. Accounts Used

- Agency Admin: `agency@admin.com`, role `agency_admin`, assigned to the DOST XI agency, active and email verified.
- Super Admin: `super_admin@admin.com`, role `super_admin`, active and email verified.
- The development seeder is idempotent and stores hashed passwords only.

## 4. Agency Admin Browser QA

- Login: Pass. `/agency/login` authenticates the seeded agency admin and redirects to `/agency/dashboard`.
- Session persistence: Pass. The same browser session can call `/api/auth/user` and `/api/agency/dashboard` after refresh/login.
- Guest protection: Pass. Guest access to `/agency/dashboard` redirects to `/agency/login`.
- Route protection: Pass. Agency admin is blocked from admin APIs with 403 and cannot access another agency's research or access request decisions.
- Dashboard: Pass at API/session level. Real dashboard API data loads with Sanctum session auth.
- Research draft/edit/upload/submit: Pass. Browser QA covered create draft, edit draft, validation errors, invalid file rejection, valid PDF upload, relational file metadata listing, submit transition, and invalid resubmit rejection.
- Access request decisions: Pass. Browser QA covered approve and deny for own-agency pending requests and cross-agency denial.
- Archive/restore: Pass. Browser QA covered agency archive/restore for eligible research and blocked published research archive.
- Notifications: Pass. Mark-all and scope protection passed. Single mark-read backend behavior is covered by tests; the browser automation assertion initially checked the wrong response path.
- Logout: Pass. Logout returns the session to guest behavior.
- Pending browser harness issue: clean headless Chrome intermittently left the Inertia `#app` empty when using the Herd/Vite hot URL, although APIs, sessions, build, typecheck, lint, and tests passed. QA continued through the same browser session by importing the Vite entry manually. This is deferred as a Phase 7 QA harness/Vite hot reload issue, not a Laravel route failure.

## 5. Super Admin Browser QA

- Login: Pass. `/admin/login` authenticates the seeded super admin and redirects to `/admin/dashboard`.
- Redirect separation: Pass. Super admin stays in the admin portal and does not redirect to `/agency/dashboard`.
- Session persistence: Pass. `/api/auth/user` and `/api/admin/dashboard` return authenticated admin data from the browser session.
- Guest protection: Pass. Guest access to `/admin/dashboard` redirects to `/admin/login`.
- Route protection: Pass. Super admin can access admin APIs and is blocked from agency APIs where agency role scope is required.
- Dashboard: Pass at API/session level. Real admin dashboard API data loads.
- Moderation: Pass. Browser QA covered approve, publish, invalid transition rejection, reject, return, archive, archive listing, and restore.
- Archive restore: Pass. Admin archive listing and restore worked through protected APIs.
- Notifications: Pass. Mark-all and scope behavior passed. Single mark-read is covered by backend tests.
- RBAC/settings: Read/navigation checked where stable; write actions were not expanded in Phase 6 because they require a safer dedicated test matrix.
- Logout: Pass. Logout returns the session to guest behavior.

## 6. Issues Found and Fixed

- Missing seeded `agency@admin.com` account. Fixed in `DevelopmentAccountSeeder` and covered by seeder tests.
- Browser API calls returned 401 after Fortify login because Sanctum stateful API middleware was not enabled. Fixed with Laravel's `statefulApi()` middleware registration.
- Agency detail endpoint exposed archived research by direct ID after archive. Fixed to return 404 for archived research in the active detail endpoint.
- Headless Vite hot reload using the default host was unstable. Browser QA used `npm run dev -- --host 127.0.0.1`; the remaining headless mount quirk is deferred.

## 7. Mock Fallbacks Removed

None. Phase 6 did not remove mock fallbacks because the browser QA proved the protected API workflows, but the intermittent headless Inertia mount issue meant frontend fallback removal was not yet cleanly provable end to end.

## 8. Mock Fallbacks Retained

- AI apply/review UI mocks or placeholders: retained until stable Mongo AI payloads are available in browser QA.
- Complex analytics and advanced reporting mocks: retained until chart data is fully relational or backed by a reliable analytics cache.
- RBAC write fallbacks: retained until role assignment/removal and last-super-admin protection have browser-level coverage.
- Platform settings write fallbacks: retained until safe setting writes, masking, validation, and audit logs are browser-verified.

TODO Phase 7: Replace retained mock fallbacks after each specific API/flow passes browser QA with real Sanctum authentication.

## 9. AI Result Apply/Review Endpoints

Added protected endpoints:

- `GET /api/agency/research/{research}/ai-results`
- `POST /api/agency/research/{research}/ai-results/{result}/review`
- `POST /api/agency/research/{research}/ai-results/{result}/apply`
- `GET /api/admin/research/{research}/ai-results`
- `POST /api/admin/research/{research}/ai-results/{result}/review`

Authorization:

- Agency admins may review/apply only AI results for research owned by their agency.
- Super admins may inspect/review AI results system-wide.

Validation and source of truth:

- Review validates review status and optional notes, updates MongoDB review metadata, and writes relational audit logs.
- Apply accepts only selected allowed fields: title, abstract, authors, keywords, category, publication year, and SDG tags when official SDG storage is present.
- Apply updates official relational research metadata inside a transaction and does not blindly persist raw AI payloads.
- MongoDB remains the flexible suggestion store. If a secondary Mongo update fails after a relational apply, the endpoint returns success with a warning and logs the Mongo failure.

## 10. AI Result UI Integration

AI read/inspection UI remains connected where already available. Apply/review buttons were not connected in Phase 6 because the backend is now present, but stable local Mongo AI payloads were not available for a full browser proof. Do not fake apply behavior.

## 11. Analytics Integration

Stable dashboard/read analytics were verified through protected browser API calls. New analytics write/cache behavior was not added. Official counts remain relational; Mongo analytics cache is deferred until reliability is proven.

## 12. RBAC Write Integration

RBAC pages/read paths were checked where stable. Role assignment/removal and permission writes were deferred to avoid risky access-control changes without a dedicated browser and test matrix. Last-super-admin protection remains a Phase 7 requirement before removing any RBAC write fallback.

## 13. Platform Settings Write Integration

Settings pages/read paths were checked where stable. Settings writes were deferred until safe setting keys, type validation, masking, and audit verification can be covered in browser QA.

## 14. MySQL Staging Verification

MySQL staging verification is pending because no safe staging environment was available in this local Herd run. SQLite pilot migrations, seeders, auth, workflow tests, and browser API checks passed.

Manual MySQL checklist for Phase 7:

- Run migrations and seeders on a non-production MySQL staging database.
- Verify roles, permissions, seeded accounts, foreign keys, JSON columns, indexes, and soft deletes.
- Verify login, upload metadata, archive/restore, notifications, audit logs, and admin/agency portals.

## 15. Tests Added or Updated

- Updated `tests/Feature/DevelopmentAccountSeederTest.php` for the seeded Agency Admin account and idempotent DOST agency reuse.
- Added `tests/Feature/Phase6BrowserQaIntegrationTest.php` for archived agency detail hiding and protected AI review/apply endpoint behavior.
- Existing Phase 3/Phase 5 workflow tests continue to cover write workflows, moderation, archive/restore, and notification mark-read scope.

## 16. Commands Run and Results

- `php artisan route:list`: passed.
- `php artisan migrate:status`: passed; all migrations ran.
- `php artisan migrate`: passed; nothing pending.
- `php artisan db:seed`: passed after development seed account fix.
- `php artisan test`: passed, 106 tests and 518 assertions.
- `composer test`: passed, including Pint and the test suite; a local Git ownership warning was printed after the test output.
- `npm run typecheck`: script not defined.
- `npm run types:check`: passed.
- `npm run lint`: passed after removing temporary Chrome profile folders from the workspace.
- `npm run build`: passed with escalated execution due a Windows sandbox `spawn EPERM` from Vite/esbuild.
- `npm run dev -- --host 127.0.0.1`: used for browser QA through Herd.

## 17. Issues Deferred to Phase 7

- Stabilize clean headless browser rendering with Herd plus Vite hot reload without manual module import fallback.
- Remove verified frontend mock fallbacks after the headless mount issue is resolved.
- Connect AI review/apply UI after stable Mongo AI result fixtures or seeded local payloads exist.
- Add full successful AI apply tests against a reliable Mongo test connection or repository abstraction.
- Complete browser-level RBAC writes with last-super-admin protection.
- Complete browser-level platform settings writes with masking, validation, and audit coverage.
- Perform MySQL staging verification in a safe staging environment.

## 18. Recommended Next Step

Phase 7 should focus on stabilizing the browser QA harness and removing verified frontend mock fallbacks. Recommended prompt:

Run Phase 7 for RIKMS v2: stabilize Laravel Herd plus Vite browser QA, create reliable AI/Mongo test fixtures, connect AI review/apply UI, remove only browser-verified mock fallbacks, complete safe RBAC/settings write workflows with audit tests, and perform MySQL staging verification on a non-production database.
