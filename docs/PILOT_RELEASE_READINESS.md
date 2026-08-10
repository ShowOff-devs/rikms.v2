# Pilot Release Readiness

Audit date: 2026-06-13

Status: Historical release snapshot, superseded in part as of 2026-08-04. Branch, file counts, test totals, dependency findings, and blockers below apply to that audit run. Use [the current production-readiness evidence](PRODUCTION_READINESS_EVIDENCE.md) for the current gate decision.

## Source State

- Branch: `main`
- Base commit SHA: `36654f73fd6a2bd3c2a613e0158ca31b6304645c`
- Working tree: dirty.
- Staged files: none.
- Tracked diff: 172 files, 8374 insertions, 1380 deletions.
- Untracked files before release docs: 23.
- Release docs created by this audit: `docs/PILOT_RELEASE_WORKTREE_AUDIT.md`, `docs/PILOT_RELEASE_COMMIT_PLAN.md`, `docs/PILOT_ENVIRONMENT_CHECKLIST.md`, `docs/PILOT_STAGING_SMOKE_TEST.md`, `docs/PILOT_RELEASE_READINESS.md`.

## Included Candidate Scope

- Database migrations, models, status support, research analytics.
- Authentication, Super Admin 2FA enforcement, session timeout, account archive behavior.
- Public portal browse/detail/access requests/public metadata/slug fallback.
- Agency research repository, draft/edit/submit/upload/archive/access request/settings/notifications.
- AI/PDF/SDG pipeline and review/apply endpoints.
- Super Admin RBAC, settings, archive, security, analytics, moderation, agency/user management.
- Frontend API integration and mock upload service removal.
- Tests and release documentation.

## Excluded Or Needs Confirmation

- `.env`: ignored, never stage.
- `storage/app/private/research/*`: private uploaded PDFs.
- `public/build`: generated Vite build output.
- `database/database.sqlite`: local database if present.
- `public/.user.ini`: server-specific PHP upload/memory config; confirm before staging.

## Verification Results

- `git diff --check`: passed.
- `php artisan optimize:clear`: passed.
- `php artisan route:list`: passed, 239 routes.
- `php artisan migrate:status`: passed; current DB reports all migrations as ran, including currently untracked migration files.
- `php artisan test`: passed, 179 passed, 2 skipped, 1136 assertions.
- `composer lint`: fixed Pint formatting in `AgencyResearchWriteController.php` and `PublicAccessRequestController.php`.
- `composer test`: passed after formatting fix, 179 passed, 2 skipped, 1136 assertions.
- `npm run types:check`: passed.
- `npm run lint:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed after escalation for Vite/esbuild process spawning.
- Disposable SQLite `migrate:fresh --seed`: passed using `DB_DATABASE=:memory:`.
- Disposable SQLite `php artisan test`: passed, 179 passed, 2 skipped, 1136 assertions.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- Previous `composer audit` advisory: `guzzlehttp/psr7 <2.10.2` had 2 medium advisories, CVE-2026-48998 and CVE-2026-49214.
- Composer security remediation: `composer update guzzlehttp/psr7 --with-dependencies` upgraded only `guzzlehttp/psr7`, from `2.10.1` to `2.11.0`.
- Installed secure version: `guzzlehttp/psr7 2.11.0`, which is greater than or equal to `2.10.2`.
- Post-remediation `composer audit`: passed, no security vulnerability advisories found.
- Post-remediation `composer test`: passed, 179 passed, 2 skipped, 1136 assertions.
- Post-remediation `php artisan test`: passed, 179 passed, 2 skipped, 1136 assertions.
- Post-remediation `npm run build`: passed after rerun with esbuild process-spawn permission.

## Migration Verification

- Fresh SQLite migration and seeding passed.
- Incremental migration on a safe copy of the current pilot database has not been run.
- Existing local DB has already run the new, currently untracked migrations.
- The redundant public metadata guard migration now uses a no-op rollback so the preceding migration owns the column rollback.

## Known Limitations

- Staging smoke test has not been executed.
- Super Admin 2FA and Agency Admin login were covered by feature tests but not manually verified in a browser during this audit.
- MongoDB/OpenAI live integrations were not exercised with real credentials.
- Composer audit is clean after upgrading `guzzlehttp/psr7` to `2.11.0`.

## Release Blockers

1. Dirty working tree with required untracked dependencies.
2. No incremental migration proof on a safe copy of the current pilot database.
3. No clean commit SHA or tag to deploy.
4. Staging smoke test not executed.

## Recommendation

NO-GO for deployment now.

GO FOR PILOT only after:

- Required files are staged and committed in controlled bundles.
- Composer audit blocker is resolved or formally accepted.
- Incremental migration passes on a safe pilot database copy.
- Working tree is clean.
- Exact commit or tag is identified.
- Staging smoke test passes.
