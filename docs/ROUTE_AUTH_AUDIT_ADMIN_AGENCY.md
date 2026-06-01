# Super Admin and Agency Admin Route/Auth Audit

## 1. Objective

Audit and fix route/auth/API/frontend connections for the Super Admin and Agency Admin portals without changing the database architecture or moving source-of-truth data.

## 2. Expected Route Structure

Agency web routes:

- `GET /agency/login`
- `POST /agency/login`
- `GET /agency/dashboard`
- `GET /agency/research`
- `GET /agency/research/create`
- `GET /agency/research/{research}`
- `GET /agency/access-requests`
- `GET /agency/notifications`
- `GET /agency/settings`

Compatibility routes retained for existing pages:

- `GET /agency/research-repository`
- `GET /agency/research-repository/{repository}/edit`
- `GET /agency/upload`
- `GET /agency/upload/research`
- `GET /agency/archive`
- `GET /agency/analytics`
- `GET /agency/profile`

Admin web routes:

- `GET /admin/login`
- `POST /admin/login`
- `GET /admin/dashboard`
- `GET /admin/agencies`
- `GET /admin/users`
- `GET /admin/research`
- `GET /admin/research/{research}`
- `GET /admin/moderation`
- `GET /admin/access-requests`
- `GET /admin/analytics`
- `GET /admin/audit-logs`
- `GET /admin/security`
- `GET /admin/archive`
- `GET /admin/settings`

Compatibility routes retained for existing pages:

- `GET /admin/agency-admin-users`
- `GET /admin/system-research`
- `GET /admin/system-research/{research}`
- `GET /admin/research-moderation`
- `GET /admin/access-request-monitor`
- `GET /admin/system-activity`
- `GET /admin/security-center`
- `GET /admin/platform-settings`
- `GET /admin/rbac`

## 3. Expected API Structure

Agency API routes:

- `GET /api/agency/dashboard`
- `GET /api/agency/research`
- `POST /api/agency/research`
- `GET /api/agency/research/{research}`
- `PUT|PATCH /api/agency/research/{research}`
- `POST /api/agency/research/{research}/submit`
- `GET /api/agency/research/{research}/files`
- `POST /api/agency/research/{research}/files`
- `DELETE /api/agency/research/{research}/files/{file}`
- `GET /api/agency/access-requests`
- `POST /api/agency/access-requests/{accessRequest}/approve`
- `POST /api/agency/access-requests/{accessRequest}/deny`
- `GET /api/agency/notifications`

Admin API routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/agencies`
- `GET /api/admin/users`
- `GET /api/admin/research`
- `POST /api/admin/research/{research}/approve`
- `POST /api/admin/research/{research}/reject`
- `POST /api/admin/research/{research}/publish`
- `POST /api/admin/research/{research}/archive`
- `POST /api/admin/research/{research}/restore`
- `GET /api/admin/access-requests`
- `GET /api/admin/audit-logs`
- `GET /api/admin/security-events`
- `GET /api/admin/platform-settings`

## 4. Login and Redirect Rules

- Public `GET /login` redirects to `GET /agency/login`.
- Default `POST /login` remains available for Fortify and redirects by role.
- Agency login `POST /agency/login` only accepts `agency_admin` users.
- Admin login `POST /admin/login` only accepts `super_admin` users.
- `super_admin` successful login redirects to `/admin/dashboard`.
- `agency_admin` successful login redirects to `/agency/dashboard`.
- Wrong portal credentials are rejected with validation errors and the session is cleared.
- Guest `/agency/*` web requests redirect to `/agency/login`.
- Guest `/admin/*` web requests redirect to `/admin/login`.
- Guest `/api/*` requests return JSON `401`.

## 5. Middleware and RBAC

- Laravel 12 middleware aliases are registered in `bootstrap/app.php`.
- Agency web routes use `auth` and `role:agency_admin`.
- Admin web routes use `auth` and `role:super_admin`.
- Agency API routes use `auth:sanctum`, `role:agency_admin`, and `agency.scope`.
- Admin API routes use `auth:sanctum` and `role:super_admin`.
- Agency API records are scoped in read controllers and policies/form requests for write/decision actions.

## 6. Frontend Links Fixed

- Agency login form now posts to `/agency/login`.
- Admin login form now posts to `/admin/login`.
- Agency sidebar now links to `/agency/research`.
- Agency repository/dashboard links now use `/agency/research` and `/agency/research/{id}`.
- Admin sidebar now links to `/admin/users`, `/admin/research`, `/admin/moderation`, `/admin/access-requests`, `/admin/audit-logs`, `/admin/security`, and `/admin/settings`.
- Admin topbar links now use `/admin/audit-logs`, `/admin/security`, and `/admin/settings`.
- Admin sign out now posts to `/logout` instead of linking to `/admin/login`.
- Admin dashboard quick actions now use the intended admin URLs.

## 7. API Services Fixed

- Agency services already used `/api/agency/...`.
- Admin services already used `/api/admin/...`.
- API client already redirects unauthorized admin API calls to `/admin/login` and agency API calls to `/agency/login`.
- No public API endpoints were exposed for admin or agency portal data.

## 8. Errors Found

- Fortify's successful login target was effectively the default `/dashboard` path instead of a portal-specific dashboard.
- Guest `/admin/*` requests used the default login route, which redirected to the agency login page.
- Agency API routes allowed `super_admin`, which blurred the API role boundary.
- Several expected web URLs were missing even though equivalent pages existed under older names.
- Admin and agency login forms both posted to the shared `/login` endpoint.
- Primary frontend navigation still pointed at older admin and agency URLs.
- Admin sign out linked to `/admin/login`, which could redirect an authenticated super admin back to `/admin/dashboard`.

## 9. Fixes Applied

- Added `App\Http\Responses\LoginResponse` for role-based Fortify login redirects and portal-specific role rejection.
- Registered the custom Fortify login response in `FortifyServiceProvider`.
- Added `POST /agency/login` and `POST /admin/login`.
- Added explicit unauthenticated exception redirects for `/agency/*` and `/admin/*`.
- Tightened `/api/agency/*` middleware from `role:agency_admin,super_admin` to `role:agency_admin`.
- Added expected web route aliases that render existing Inertia pages.
- Updated frontend login posts, nav links, dashboard quick links, and admin logout behavior.
- Added route/auth coverage in `tests/Feature/AdminAgencyRouteAuthTest.php`.
- Updated older auth tests to assert role-aware dashboard redirects.

## 10. Tests Added

- Guest agency dashboard redirects to `/agency/login`.
- Agency admin can access agency dashboard.
- Super admin cannot access agency dashboard.
- Guest admin dashboard redirects to `/admin/login`.
- Super admin can access admin dashboard.
- Agency admin cannot access admin dashboard.
- Super admin `/admin/dashboard` does not redirect to `/agency/dashboard`.
- Expected route aliases render existing portal pages.
- Guest API requests return `401`.
- Wrong-role API requests return `403`.
- Agency admins cannot access another agency's research through agency APIs.
- Portal-specific login endpoints redirect correct roles and reject wrong roles.
- Default `/login` remains an agency-login entry point with role-aware post-login redirect.

## 11. Commands Run and Results

- `php artisan route:list`: passed; 132 routes listed after fixes.
- `php artisan migrate:status`: passed; all migrations are `Ran`.
- `php artisan test`: passed; 100 tests, 475 assertions.
- `composer test`: passed; config clear, Pint check, and `php artisan test` all passed. Composer also reported the local Git dubious ownership warning after tests.
- `npm run typecheck`: unavailable; package script is named `types:check`.
- `npm run types:check`: passed.
- `npm run lint`: passed and ran ESLint with `--fix`.
- `npm run build`: initially failed in the sandbox with `spawn EPERM` from esbuild; passed after running with escalated permissions.

## 12. Remaining Issues

- Git commands are blocked by local ownership safety settings: Git reports this repo as a dubious ownership path. No git status or diff could be trusted until `safe.directory` is configured for `C:/Users/Administrator/Herd/rikmsv2`.
- Existing legacy route names are intentionally retained as compatibility aliases to avoid breaking current pages and imports.
