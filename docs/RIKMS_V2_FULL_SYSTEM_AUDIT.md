# RIKMS v2 Full System Audit

## 1. Audit Objective
This audit checks the entire RIKMS v2 system for completion status, routing/auth correctness, database readiness, API/frontend integration, mock data, errors, test/build status, and the remaining work needed before demo and production hardening.

## 2. Environment
- Framework/runtime: Laravel 12 with Fortify, Sanctum, Inertia, React, Vite.
- Local server model: Laravel Herd. `php artisan serve` was not run.
- Herd URL used for smoke checks: `http://rikmsv2.test`.
- Frontend dev server: `npm run dev -- --host 127.0.0.1`; Vite reported `http://127.0.0.1:5173/` and `APP_URL: http://rikmsv2.test`.
- Pilot database: SQLite, current migrations all ran.
- Production target: MySQL-ready relational schema, but MySQL staging verification is still pending.
- MongoDB boundary: MongoDB models are present only for AI metadata, PDF parsing results, and SDG classification suggestions. Official records remain relational.
- Commands run: `php artisan route:list`, `php artisan migrate:status`, `php artisan migrate`, `php artisan db:seed`, `php artisan test`, `composer test`, `npm run types:check`, `npm run lint:check`, `npm run lint`, `npm run build`, Herd HTTP smoke checks.

## 3. Documentation Reviewed
Found:
- `docs/PHASE_0_BACKEND_DB_AUDIT.md`
- `docs/PHASE_1_DATABASE_FOUNDATION.md`
- `docs/PHASE_2_PROTECTED_APIS_RBAC.md`
- `docs/PHASE_3_WRITE_WORKFLOWS.md`
- `docs/PHASE_4_FRONTEND_API_INTEGRATION.md`
- `docs/PHASE_5_BROWSER_VERIFICATION_AND_ADVANCED_INTEGRATION.md`
- `docs/PHASE_6_BROWSER_QA_AND_AI_REVIEW.md`
- `docs/ROUTE_AUTH_AUDIT_ADMIN_AGENCY.md`
- `docs/DEVELOPMENT_SEED_ACCOUNTS.md`
- `docs/SUPER_ADMIN_DASHBOARD_DATABASE_CONNECTION.md`

Missing: none from the requested list.

Key documentation conclusions:
- Phase 0 identified incomplete RBAC normalization and broad mock-backed agency/admin UI.
- Phase 1 added RBAC pivots, uploads, notifications, archive records, audit logs, security events, platform settings, and indexes.
- Phase 2 added protected read APIs, role/permission middleware, agency scoping, and initial frontend service integration.
- Phase 3 added protected write workflows for agency drafts/uploads/submission, access decisions, admin moderation, archive/restore, jobs, policies, and audit logs.
- Phase 4 connected selected frontend write flows while retaining unverified mock fallbacks.
- Phase 5 added AI/PDF/SDG read APIs, archive/restore UI services, notification mark-read APIs, and retained deeper mocks.
- Phase 6 verified many protected workflows and added AI review/apply endpoints, but deferred clean browser harness stabilization, broad mock removal, RBAC/settings writes, and MySQL staging verification.
- Super admin dashboard documentation confirms fake dashboard data was removed and replaced with a protected database-backed API.

## 4. Route Audit
Working route groups found:
- Public web: `/`, `/browse-research`, `/browse-research/{research}`, `/research/{research}` redirect, `/agencies`, `/agencies/{slug}`, `/about`, `/contact`, public policy pages.
- Agency web: `/agency/login`, `/agency/dashboard`, `/agency/research`, `/agency/research/create`, `/agency/upload`, upload subroutes, `/agency/access-requests`, `/agency/notifications`, `/agency/archive`, `/agency/settings`, `/agency/profile`, `/agency/analytics`.
- Admin web: `/admin/login`, `/admin/dashboard`, `/admin/agencies`, `/admin/users`, `/admin/research`, `/admin/moderation`, `/admin/access-requests`, `/admin/analytics`, `/admin/audit-logs`, `/admin/security`, `/admin/archive`, `/admin/settings`, `/admin/rbac`.
- Public API: `/api/public/summary`, research, agencies, agency research.
- Agency API: dashboard, research CRUD/submit/files, AI results, archive/restore, access request approve/deny, notifications, research files.
- Admin API: dashboard, agencies, users, research read/moderation/archive/restore, AI results, access requests, audit logs, security events, platform settings read, notifications.

Issues and notes:
- Requested `/browse` route is not present; the implemented public browse route is `/browse-research`.
- Local-only dev route `/api/test-mongodb-ai-records` is exposed in `local` only. Keep it out of staging/production.
- No missing controller methods were detected by `php artisan route:list`.
- No admin-to-agency or agency-to-admin protected-route redirect bug was observed in tests or Herd smoke checks.

## 5. Auth and RBAC Audit
Working:
- `/login` redirects to `/agency/login`.
- `/agency/login` redirects an existing agency admin to `/agency/dashboard` and an existing super admin to `/admin/dashboard`.
- `/admin/login` redirects an existing super admin to `/admin/dashboard`; wrong portal login attempts are rejected by the custom Fortify login response.
- Guest `/agency/*` redirects to `/agency/login`.
- Guest `/admin/*` redirects to `/admin/login`.
- Guest `/api/agency/*` and `/api/admin/*` return 401 JSON.
- Wrong-role protected APIs return 403.
- Middleware aliases are registered for `role`, `permission`, and `agency.scope`.
- Sanctum stateful API middleware is enabled.

RBAC state:
- Roles, permissions, `role_user`, `permission_role`, and `permission_user` exist.
- `User` supports normalized roles and permissions while retaining a legacy `users.role` shortcut.
- Seeded roles include `super_admin` and `agency_admin`.
- Seeded accounts:
  - `agency@admin.com` / `agency admin`, assigned to DOST XI.
  - `super_admin@admin.com` / `superadmin`.
- Seed docs state no super admin auth code is stored; if a two-factor flow is enabled later, it needs separate verification.

Gaps:
- RBAC management UI/API writes remain mock-backed.
- Last-super-admin protection for role removal/assignment remains a required future feature.
- Policies exist for core workflows but not every advanced admin/settings action has complete policy/write coverage.

## 6. Database and Migration Audit
Tables/migration foundations found:
- Core: `users`, `agencies`, `roles`, `permissions`, `role_user`, `permission_role`, `permission_user`, `research`, `research_approvals`, `access_requests`.
- Support: `research_files`, `notifications`, `archive_records`, `audit_logs`, `security_events`, `platform_settings`, `sessions`, `password_reset_tokens`, `jobs`, `job_batches`, `failed_jobs`, cache tables.

Working:
- `php artisan migrate:status`: all migrations ran.
- `php artisan migrate`: nothing to migrate.
- SQLite pilot schema is operational.
- Foreign keys, indexes, JSON casts, soft deletes, and archive metadata are broadly present.

Issues and risks:
- MySQL staging verification has not been performed.
- JSON columns on `research`, file metadata, audit/security metadata, and platform values require MySQL staging proof.
- `users.role` remains as a compatibility field alongside normalized RBAC pivots.
- No `personal_access_tokens` table is present; current usage is session/Sanctum stateful auth, not token auth.

## 7. Model Relationship Audit
Working:
- `User`, `Agency`, `Research`, `AccessRequest`, `ResearchApproval`, `ResearchFile`, `Notification`, `ArchiveRecord`, `AuditLog`, `SecurityEvent`, `PlatformSetting`, `Role`, and `Permission` models exist with relationships.
- SoftDeletes usage matches key tables: agencies, research, access requests, research files, roles.
- Mongo models use the `mongodb` connection and AI/PDF/SDG collections only.

Issues and notes:
- `ResearchApproval` has two relationships using `reviewed_by` (`reviewer` and `admin` style duplication); not currently breaking, but should be clarified.
- Some model status rules are enforced by controllers/support constants rather than enums. This is acceptable for pilot but should be hardened before production.
- No relational source-of-truth model was found using MongoDB.

## 8. API Audit
Working API areas:
- Public research and agency listing/details.
- Agency dashboard, research list/detail, draft create/update/submit, PDF file metadata upload/list/delete, access request approve/deny, notifications read/list, archive/restore, AI result read/apply/review.
- Admin dashboard, read APIs for agencies/users/research/access requests/audit/security/settings, research moderation, archive listing/restore, AI review/read.

Missing or incomplete APIs:
- Public access request submission endpoint is not present.
- Agency profile/settings write APIs are not implemented; frontend uses mock services.
- Admin agency/user create/edit/archive workflows are still partly mock/local in frontend services despite some read APIs existing.
- Platform settings write API is missing; only read API exists.
- RBAC read/write APIs are missing or not wired to real protected endpoints.
- Security center write actions such as resolve alert/revoke session/export are mock-backed.
- Analytics/reporting dedicated endpoints and exports are incomplete.
- Admin notification list endpoint is not defined; only mark-read/read-all are present for admin notifications.

Response format:
- Protected APIs use `ApiResponse` envelopes consistently.
- Public resource endpoints use Laravel resources/pagination; compatible with existing frontend public services.

## 9. Frontend Audit
Working/connected:
- Public pages load via Inertia and public APIs.
- Agency dashboard/repository/access requests/notifications/archive services have real API paths with retained fallbacks in some places.
- Agency upload research path connects to draft/file/submit APIs for research upload.
- Super admin dashboard is database-backed through `/api/admin/dashboard`.
- Admin moderation write service uses real moderation APIs.
- Public browse/detail and agency directory consume public APIs.

Broken/not verified:
- No typecheck, lint, or build errors remain.
- Full interactive browser console QA was not available in this session.

Frontend gaps:
- Many admin pages still import label/static helpers from mock data files.
- Platform settings, RBAC, security center, system activity, analytics/reporting, admin archive subtypes, agency profile/settings, report upload workflows, and some repository edit behaviors remain mock-backed.
- Some UI operations present successful mock behavior for writes that do not persist to the relational database.

## 10. Mock Data Audit
| File/path | Module | Mock type | Classification | Reason |
|---|---|---|---|---|
| `resources/js/data/mock-agency-dashboard.ts` | Agency dashboard | fallback metrics/activity | Keep temporarily | Real dashboard API exists, but fallback retained pending browser proof/removal pass. |
| `resources/js/data/mock-repository.ts` | Agency repository/edit | dataset, labels, local edit behavior | Keep temporarily | Real research APIs exist, but edit/file replacement/archive fallbacks remain. |
| `resources/js/data/mock-access-requests.ts` | Agency access requests | fallback request records | Keep temporarily | Real decision APIs exist; listing fallback remains pending browser removal pass. |
| `resources/js/data/mock-archive.ts` | Agency archive | fallback archive records/activity | Keep temporarily | Real archived research list/restore exists; activity/permanent delete still incomplete. |
| `resources/js/data/mock-analytics.ts` | Agency analytics | charts/report data | Urgent replacement | Official analytics can show fake numbers; needs real queries or cache. |
| `resources/js/data/mock-agency-profile.ts` | Agency profile | profile record | Keep temporarily | Backend profile/settings API not ready. |
| `resources/js/data/mock-settings.ts` | Agency settings | settings state | Keep temporarily | Backend agency settings writes not ready. |
| `resources/js/data/mock-admin-agencies.ts` | Admin agencies | agency/admin users/options | Urgent replacement | Admin agency management appears operational but write APIs are not complete. |
| `resources/js/data/mock-agency-admin-users.ts` | Admin users | users/agencies | Urgent replacement | User management writes must persist and protect RBAC. |
| `resources/js/data/mock-research-moderation.ts` | Admin moderation | queue labels/fallback records | Keep temporarily | Write API exists; fallback should be removed only after browser proof. |
| `resources/js/data/mock-admin-archive.ts` | Admin archive | archived agencies/users/research/activity | Keep temporarily | Research archive API exists; agencies/users/activity/export still missing. |
| `resources/js/data/mock-access-request-monitor.ts` | Admin access monitoring | request records/charts | Urgent replacement | Monitoring/reporting should reflect relational access requests. |
| `resources/js/data/mock-system-analytics.ts` | Admin analytics | charts/report data | Urgent replacement | Official reporting cannot rely on fake chart data. |
| `resources/js/data/mock-system-activity.ts` | Admin audit/activity | notifications/logs/activity | Urgent replacement | Audit/security visibility should be DB-backed. |
| `resources/js/data/mock-security-center.ts` | Security center | alerts/sessions/events | Urgent replacement | Security workflows must reflect real security events/sessions. |
| `resources/js/data/mock-platform-settings.ts` | Platform settings | settings state | Urgent replacement | Settings writes are UI-only and need DB/audit coverage. |
| `resources/js/data/mock-rbac.ts` | RBAC | roles/permissions/assignments | Urgent replacement | Access control management must be real and protected. |
| `resources/js/data/mock-system-research.ts` | System research | fallback records/labels | Keep temporarily | Admin research read API exists; some labels/detail fallback remain. |
| `resources/js/lib/upload/services/mock-research-upload-service.ts` | Research upload | AI extraction/validation legacy helpers | Keep temporarily | AI jobs/results need stable browser fixtures before removal. |
| `resources/js/lib/upload/services/mock-report-upload-service.ts` | Report uploads | upload/draft/submit/AI | Urgent replacement | Terminal/project accomplishment uploads currently do not persist real records. |
| `resources/js/lib/upload/services/mock-ai-metadata-service.ts` | AI metadata | mock suggestions | Keep temporarily | Replace with real Mongo-backed AI results when fixtures are stable. |
| `resources/js/lib/upload/services/mock-sdg-suggestion-service.ts` | SDG suggestions | mock suggestions | Keep temporarily | Replace after SDG classification results are reliable. |
| `resources/js/lib/upload/services/mock-upload-draft-service.ts` | Generic upload wizard | local draft save | Keep temporarily | Wizard steps still include placeholders. |
| `routes/api.php` local Mongo test route | AI/Mongo test | sample Mongo writes | Keep local only | Useful local test route; must remain disabled outside local. |

Mock data removed in this audit: none.

## 11. Public Portal Status
Working:
- Landing, browse research, research details, agencies, agency details, about, and contact routes load over Herd.
- Public APIs for research/agencies are database-backed and tested.

Issues:
- Requested `/browse` alias is missing; current route is `/browse-research`.
- Public access request submission is not implemented.
- Public research details link by `/browse-research/{research}` while `/research/{research}` redirects there.

## 12. Agency Portal Status
Working:
- Auth/redirect boundaries pass tests and Herd smoke checks.
- Dashboard, repository list/detail, research draft/update/submit, PDF file upload metadata, access request decisions, notifications mark-read, archive/restore have protected API foundations and tests.

Incomplete:
- Agency profile/settings are mock-backed.
- Agency analytics is mock-backed.
- Terminal report and project accomplishment upload flows are frontend mock workflows.
- Some repository edit/file replacement and local archive fallbacks remain.

## 13. Super Admin Portal Status
Working:
- Auth/redirect separation passes tests.
- Dashboard is real database-backed.
- Admin research moderation, archive/restore, research/user/agency read APIs, audit/security/settings read APIs exist.

Incomplete:
- Agency management writes, user management writes, RBAC writes, platform settings writes, security center actions, analytics/reporting exports, and access request monitoring are incomplete or mock-backed.

## 14. Upload/AI/PDF/SDG Status
Working:
- Research file upload validates PDF and stores relational `research_files` metadata.
- Upload queues `ParsePdfDocumentJob`, `ExtractResearchMetadataJob`, and `ClassifyResearchSdgJob`.
- Mongo models exist for AI metadata, PDF parsing, and SDG classification.
- AI result read/review/apply endpoints exist and keep official metadata relational.

Incomplete:
- Stable Mongo AI fixtures and full browser UI apply/review verification are pending.
- Report upload types still use mock upload services.
- Queue worker/runtime processing was not verified in this audit.

## 15. Access Request Status
Working:
- Relational `access_requests` table/model exists.
- Agency approve/deny APIs validate scope/status, write audit logs, and create notifications.
- Admin monitoring read API exists.

Incomplete:
- Public access request creation is missing.
- Admin override/export/reporting workflows are mock-backed.
- Some frontend listing fallbacks remain.

## 16. Archive/Restore Status
Working:
- Soft deletes/archive metadata and `archive_records` exist.
- Agency can archive/restore own non-published research.
- Admin can archive/restore eligible research and restore research files.
- Archived agency research is hidden from active detail API.

Incomplete:
- Admin archived agencies/users and archive activity/export/delete workflows remain mock-backed.
- Permanent delete flows are not safely implemented and should remain blocked/deferred.

## 17. Notifications Status
Working:
- Relational notifications exist.
- Agency list/read/read-all APIs exist.
- Admin read/read-all APIs exist.
- Workflow notifications are created by access request decisions and moderation.

Incomplete:
- Admin notification listing endpoint is missing.
- Mark-unread is frontend/local fallback only.
- Notification triggers should be expanded/verified for every archive/restore/settings/security event.

## 18. Analytics/Reporting Status
Working:
- Agency/admin dashboard metrics have real query foundations in selected areas.
- Super admin dashboard charts read database-derived data.

Incomplete:
- Agency analytics and broader admin analytics still use mock datasets.
- Report/export actions are mock-generated.
- Mongo analytics cache is not implemented.

## 19. RBAC/Settings Status
Working:
- RBAC schema, middleware, helper methods, seeders, and tests exist.
- Platform settings table and read API exist.

Incomplete:
- RBAC management UI is mock-backed.
- Platform settings write UI is mock-backed.
- Last-super-admin protection, audit logs for RBAC writes, sensitive setting masking, and write validation are pending.

## 20. Security/Audit Status
Working:
- `audit_logs` and `security_events` tables/models exist.
- Core write workflows record audit logs.
- Admin read APIs exist for audit logs and security events.

Incomplete:
- Security center UI actions are mock-backed.
- Login/session security event generation is not fully wired.
- Export/resolve/revoke workflows are not real.

## 21. Test and Build Results
- `php artisan route:list`: passed, 153 routes.
- `php artisan migrate:status`: passed, all migrations ran.
- `php artisan migrate`: passed, nothing to migrate.
- `php artisan db:seed`: passed, development accounts seeded idempotently.
- `php artisan test`: passed, 109 tests / 570 assertions.
- `composer test`: Laravel/Pint/tests passed; after tests, Git reported dubious ownership for `C:/Users/Administrator/Herd/rikmsv2`. Use `git -c safe.directory=...` or configure safe directory outside this audit.
- `npm run types:check`: passed.
- `npm run lint:check`: passed.
- `npm run lint`: passed.
- `npm run build`: first sandbox attempt failed with `spawn EPERM`; escalated rerun passed.
- `npm run dev -- --host 127.0.0.1`: running; Vite ready at `127.0.0.1:5173`.

## 22. Browser QA Results
Performed Herd HTTP smoke checks:
- Public/login pages: `/`, `/browse-research`, `/agencies`, `/about`, `/contact`, `/agency/login`, `/admin/login` returned 200.
- Guest agency pages: `/agency/dashboard`, `/agency/research`, `/agency/upload`, `/agency/access-requests`, `/agency/notifications`, `/agency/archive` redirected to `/agency/login`.
- Guest admin pages: `/admin/dashboard`, `/admin/agencies`, `/admin/users`, `/admin/research`, `/admin/moderation`, `/admin/access-requests`, `/admin/analytics`, `/admin/security`, `/admin/archive`, `/admin/settings` redirected to `/admin/login`.
- Public APIs: `/api/public/summary`, `/api/public/research`, `/api/public/agencies` returned 200 JSON.
- Protected APIs: `/api/agency/dashboard`, `/api/admin/dashboard` returned 401 for guest requests.

Pending browser QA:
- Interactive login with seeded users.
- Console error inspection.
- Authenticated agency workflows: create/edit/upload/submit, access approve/deny, notification read, archive/restore.
- Authenticated admin workflows: dashboard, moderation, archive restore, access monitoring, settings/RBAC/security navigation.

## 23. Errors Found
Critical:
- None found during automated tests/build/smoke checks.

High:
- Mock-backed official admin analytics/RBAC/settings/security/access monitoring can display or accept fake decisions.
  - Path: `resources/js/data/mock-*.ts`, related `resources/js/lib/admin/*`.
  - Cause: backend write/reporting APIs are deferred.
  - Suggested fix: implement protected relational APIs with audit logs, then remove mocks after browser verification.
  - Status: deferred.
- Public access request creation is missing.
  - Path: `routes/api.php`, public controllers.
  - Cause: no public submission endpoint/workflow.
  - Suggested fix: add validated public request endpoint linked to `research_id`, default `pending`, with notification/audit behavior.
  - Status: deferred.

Medium:
- MySQL staging verification is pending.
  - Path: database migrations/config.
  - Cause: no safe MySQL staging environment available.
  - Suggested fix: run migrations/seed/tests on non-production MySQL and verify JSON/index behavior.
  - Status: deferred.
- Composer test ends with Git dubious ownership warning.
  - Path: local Git environment.
  - Cause: repo owned by `BUILTIN/Administrators`, current user is `Administrator`.
  - Suggested fix: configure Git safe directory if appropriate.
  - Status: deferred environment issue.
- Vite build fails inside sandbox with `spawn EPERM`.
  - Path: Node/esbuild process spawning.
  - Cause: sandbox restriction.
  - Suggested fix: run build with normal local permissions.
  - Status: verified passed when rerun outside sandbox.

Low:
- `/browse` requested in the audit prompt is not implemented; `/browse-research` is the actual route.
  - Path: `routes/web.php`.
  - Suggested fix: add alias only if required by product URLs.
  - Status: deferred.
- `ResearchApproval` has duplicate reviewer/admin-style relationship names using `reviewed_by`.
  - Path: `app/Models/ResearchApproval.php`.
  - Suggested fix: clarify relationship naming.
  - Status: deferred.

## 24. Safe Fixes Applied
No manual application code fixes were required during this audit. The audit document was created.

Note: `npm run lint` is configured as `eslint . --fix`; it completed successfully. Review the existing dirty worktree before committing because this repository already had many staged/unstaged changes before this audit.

## 25. Remaining Work To Accomplish
Critical before demo:
- Replace or clearly label fake official-number views in admin analytics, access monitoring, RBAC, settings, security center, and reporting.
- Add public access request submission flow.
- Run authenticated browser QA with the seeded agency and super admin accounts.
- Confirm no protected admin/agency APIs are reachable without auth.

High priority:
- Implement protected platform settings writes with validation, masking, and audit logs.
- Implement RBAC reads/writes with last-super-admin protection and audit history.
- Replace admin agency/user management mocks with relational APIs.
- Connect admin security center to real security events/session data.
- Replace agency profile/settings mocks.
- Stabilize AI/Mongo fixtures and connect AI review/apply UI fully.

Medium priority:
- Complete analytics/reporting APIs and exports.
- Complete admin archive for archived agencies/users and activity export.
- Add admin notification listing and mark-unread if needed.
- Add route alias `/browse` only if product navigation requires it.
- Normalize status values into enums/constants across all controllers/resources.

Later:
- MySQL staging migration/seed/test verification.
- MongoDB analytics cache if still needed.
- Queue worker operational runbook for PDF/AI/SDG processing.
- Production hardening for rate limits, security event generation, and observability.

## 26. Recommended Next Development Phase
Recommended next task:

Run a Phase 7 stabilization pass focused on removing only browser-verified mocks. Start with a full Herd browser QA harness using the seeded agency and super admin accounts, then implement the missing public access request submission API, real platform settings writes, real RBAC management with last-super-admin protection, and real admin analytics/access-monitoring/security data. Keep all official records in SQLite/MySQL, keep MongoDB limited to AI/PDF/SDG suggestions, and verify the final schema on a non-production MySQL database.
