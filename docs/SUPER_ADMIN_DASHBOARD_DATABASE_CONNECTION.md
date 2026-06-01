# Super Admin Dashboard Database Connection

## 1. Objective
The Super Admin dashboard no longer reads fake dashboard cards, chart values, activity records, moderation records, or security counts from frontend mock data. The dashboard now reads database-backed data from a protected Laravel API endpoint using the relational database as the source of truth.

## 2. API Endpoint
`GET /api/admin/dashboard`

The route is registered as `api.admin.dashboard` and points to `App\Http\Controllers\Api\Admin\AdminDashboardController`.

Successful response format:

```json
{
  "message": "Admin dashboard loaded successfully.",
  "data": {
    "metrics": {},
    "recent_research": [],
    "recent_agencies": [],
    "recent_audit_logs": [],
    "recent_security_events": []
  },
  "meta": {}
}
```

## 3. Auth and RBAC
The API route is protected by:

- `auth:sanctum`
- `role:super_admin`

The web route `GET /admin/dashboard` remains protected by:

- `auth`
- `role:super_admin`

Expected access behavior is covered by feature tests:

- Guest API request receives `401`.
- Agency admin API request receives `403`.
- Super admin API request receives `200`.
- Guest web request redirects to `/admin/login`.
- Agency admin web request receives `403`.
- Super admin web request loads `/admin/dashboard` and is not redirected to `/agency/dashboard`.

## 4. Metrics Connected
The dashboard API reads these metrics with Eloquent count queries and table/column guards:

- total, active, and inactive agencies
- total and active users
- agency admin and super admin users
- total, draft, submitted, under review, approved, published, and archived research
- pending research approvals
- total, pending, approved, and denied access requests
- pending moderation count
- total uploads / total files from `research_files`
- unread notifications
- total and unresolved security events
- recent failed logins and locked account events
- MFA enabled and eligible user counts

## 5. Recent Data Connected
The API returns recent relational records for:

- recent research
- recent agencies
- recent audit logs
- recent security events
- pending moderation items from submitted / under review research
- research by agency chart data
- research uploads by publication year chart data
- security status summary

Nested user payloads expose only safe fields and do not include `password`, `remember_token`, two-factor secrets, or recovery codes.

## 6. Mock Data Removed
Removed from the Super Admin dashboard scope:

- `resources/js/data/mock-admin-dashboard.ts`
- frontend imports of `mock-admin-dashboard`
- fake dashboard card numbers
- fake research-by-agency chart values
- fake upload-by-year chart values
- fake system activity feed
- fake pending moderation list
- fake security status values
- mock network delay fallbacks in the dashboard service

## 7. Mock Data Retained
No Super Admin dashboard mock data is retained.

The Quick Management Actions list remains a static navigation list, not a dashboard metric/data source.

## 8. Browser Verification
Herd URL used:

- `http://rikmsv2.test/admin/login`
- `http://rikmsv2.test/admin/dashboard`
- `http://rikmsv2.test/api/admin/dashboard`

Verification performed:

- Started Vite with `npm run dev`; sandboxed run failed with `spawn EPERM`, escalated/background run succeeded.
- Vite selected `http://localhost:5174` because `5173` was already in use.
- Guest `GET /admin/dashboard` through Herd returned `302` to the admin login flow.
- Guest `GET /api/admin/dashboard` through Herd returned `401`.
- Super admin login with `super_admin@admin.com` / `superadmin` loaded `/admin/dashboard` with status `200`.
- Authenticated Super Admin API request through Herd returned `200` and `Admin dashboard loaded successfully.`
- Agency admin login with `agency@admin.com` / `agency admin` received `403` on `/admin/dashboard`.

Browser console inspection was not completed because no browser automation or interactive browser tool is available in this session.

## 9. Tests Added
Added `tests/Feature/SuperAdminDashboardApiTest.php`.

Coverage includes:

- guest cannot access `GET /api/admin/dashboard`
- agency admin cannot access `GET /api/admin/dashboard`
- super admin can access `GET /api/admin/dashboard`
- response contains the standard API envelope and metrics object
- metrics reflect database records created by the test
- recent user payloads do not expose sensitive auth fields

Existing web route tests in `tests/Feature/AdminAgencyRouteAuthTest.php` already cover the required `/admin/dashboard` web access rules.

## 10. Commands Run
Backend:

- `php artisan route:list` - passed; `api/admin/dashboard` maps to `Api\Admin\AdminDashboardController`.
- `php artisan route:list --path=api/admin/dashboard` - passed.
- `php artisan migrate:status` - passed; all migrations are marked ran.
- `php artisan migrate` - passed; nothing to migrate.
- `php artisan db:seed` - passed; development Super Admin and Agency Admin accounts seeded.
- `php artisan test tests/Feature/SuperAdminDashboardApiTest.php` - passed, 3 tests / 52 assertions.
- `php artisan test` - passed, 109 tests / 570 assertions.
- `composer test` - passed tests and Pint; reported a git dubious ownership warning after test execution.

Frontend:

- `npm run types:check` - passed.
- `npm run lint:check` - passed.
- `npm run build` - initial sandbox run failed with `spawn EPERM`; escalated rerun passed.
- `npm run dev` - initial sandbox run failed with `spawn EPERM`; escalated/background run passed.

## 11. Remaining Issues
No deferred Super Admin dashboard mock data remains.

The dashboard report generation button still produces a local ready-state message. It is not used as a source for dashboard metrics, charts, activity, moderation, or security data.
