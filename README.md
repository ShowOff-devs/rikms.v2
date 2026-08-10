# RIKMS v2

RIKMS v2 is a regional knowledge-management application for submitting, reviewing, publishing, discovering, archiving, and reporting on research records. The implemented roles are `super_admin`, `agency_admin`, and `public_user`; anonymous visitors can browse public metadata and request controlled access where enabled. Backend authorization remains authoritative even when the interface hides an action.

This document describes the current repository state. Production-readiness evidence and unresolved gates are tracked in [docs/PRODUCTION_READINESS_EVIDENCE.md](docs/PRODUCTION_READINESS_EVIDENCE.md).

## Architecture

RIKMS is a Laravel 12 application with a React 19 and TypeScript interface delivered through Inertia 2. It is not a Next.js application and the Inertia pages are not a separately deployed frontend.

- Laravel owns routing, authentication, authorization, validation, workflows, queues, persistence, downloads, and API/Inertia responses.
- Inertia joins Laravel routes/controllers to React pages without duplicating an application API gateway.
- React owns browser rendering and interaction. Vite builds the browser assets; client-side authorization is never a substitute for Laravel policies or middleware.
- MySQL is the intended production source of truth for users, agencies, roles and permissions, research, file metadata, access decisions, audit/security records, notifications, settings, and archive state. SQLite remains the fast default test database.
- MongoDB is secondary storage for flexible AI metadata, PDF parsing results, and SDG classifications. It must not become the authority for official records or access decisions.
- OpenAI-backed extraction/classification is asynchronous and optional to core relational record integrity. Provider configuration stays server-side.

Uploaded research PDFs first enter the configured quarantine disk. A clean malware result is required before promotion to the permanent private storage disk. Downloads are served through authorized Laravel controllers rather than public file URLs. Public agency imagery uses the public disk.

## Requirements

- PHP `^8.4.1` with Composer 2 and the extensions required by Laravel, MySQL, and MongoDB
- Node.js 22 for parity with GitHub Actions and npm (the repository has a committed `package-lock.json`)
- SQLite for the default local/test path, or MySQL 8.4 for integration/staging verification
- MongoDB and OpenAI credentials only when exercising the AI/parsing pipeline
- A reachable ClamAV daemon for production uploads

The CI matrix currently exercises PHP 8.4 and 8.5. Node 22 is the documented deployment/build baseline even though `package.json` does not currently enforce an `engines` field.

## Local setup

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
php artisan serve
```

Review `.env.example` before migration. Never copy production secrets into local or test configuration. Development seed accounts are opt-in through `RIKMS_ALLOW_DEV_SEED_ACCOUNTS` and are rejected by production validation.

For active frontend development, run `npm run dev`. Laravel Herd may be used instead of `php artisan serve`.

## Runtime services

### Queue worker

Production must use a persistent worker. The database queue is configured with a 120-second worker timeout and a default `DB_QUEUE_RETRY_AFTER` of 180 seconds. AI metadata and SDG jobs have three attempts with bounded backoff; PDF parsing has one bounded attempt. Failed jobs use the configured failed-job driver.

```bash
php artisan queue:work database --queue=default --sleep=3 --tries=3 --timeout=120 --max-time=3600
php artisan queue:failed
php artisan queue:restart
```

Ubuntu systemd examples are in `deploy/systemd/`. They require deployment-path and service-account review before installation.

### Scheduler

Invoke Laravel's scheduler every minute. The included systemd timer calls `schedule:run`; the application schedules queue monitoring plus opted-in agency weekly digests and monthly analytics emails with overlap prevention.

```bash
php artisan schedule:list
php artisan schedule:run
```

Agency digests default to Monday at 08:00 and monthly analytics reports to the first day of the month at 08:00, both in `Asia/Manila`. Configure them with `SCHEDULED_AGENCY_EMAILS_*`, `WEEKLY_DIGEST_*`, and `MONTHLY_ANALYTICS_*` environment values. Delivery is queued, so the queue worker and mail transport must both be running.

See [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) for startup, retry, monitoring, and recovery procedures.

## External configuration

### MongoDB and OpenAI

Set `MONGODB_URI` and `MONGODB_DATABASE` for the secondary AI/parsing store. Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and the documented input limits to enable live AI extraction and classification. These values are backend-only; do not expose them through Vite variables. Live connectivity and provider behavior require staging verification.

### Malware scanning

Production requires `MALWARE_SCANNER=clamav` plus a tested private `CLAMAV_HOST`, `CLAMAV_PORT`, and timeout. `none` is permitted only outside production; the fake scanner is explicitly test-only. Scanner timeout, connection failure, malformed response, infection, cleanup failure, and promotion failure are handled as closed upload failures. User messages do not include scanner internals.

### CAPTCHA

Public access requests use a single backend/frontend contract:

- `PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED` and `VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED` must agree.
- `CAPTCHA_PROVIDER=turnstile`, `CAPTCHA_SECRET_KEY`, and `VITE_CAPTCHA_SITE_KEY` are required when enabled in production.
- Only `VITE_CAPTCHA_SITE_KEY` is public. The secret must never use a `VITE_` prefix.
- Disabling CAPTCHA is restricted to permitted local/test environments. Provider failure fails closed in production.

After changing a `VITE_` value, rebuild frontend assets.

### Security headers

CSP is centralized in `config/security_headers.php`: local/testing is configurable, staging/pilot is report-only, and production enforcement requires recorded validation. HSTS is emitted only for secure production requests. See [docs/CSP_DEPLOYMENT.md](docs/CSP_DEPLOYMENT.md) before enabling enforcement.

## Quality and security commands

Use the script names committed in this repository:

```bash
composer validate
composer audit --locked
composer lint:check
npm audit --omit=dev
npm run format:check
npm run lint:check
npm run types:check
npm run build
php artisan test
composer ci:check
```

`composer ci:check` aggregates frontend lint, formatting, TypeScript, PHP formatting, and the Laravel tests. Dependency audits and the production build are separate explicit gates and are also represented in GitHub Actions.

SQLite is the default automated-test database. The `mysql-integration` GitHub Actions job starts MySQL 8.4 with test-only credentials, runs fresh migrations and seeders, checks rollback/remigration, and executes the application suite. A local MySQL or Docker run must use disposable non-production data; a workflow definition alone is not proof that MySQL passed.

## Deployment checklist

1. Deploy an identified, reviewed commit with a clean dependency install (`composer install` with production flags and `npm ci`).
2. Configure production secrets outside the repository; set `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, trusted proxies/hosts, secure encrypted sessions, and a generated `APP_KEY`.
3. Point the relational connection at backed-up MySQL and verify migrations on a safe copy before `php artisan migrate --force`.
4. Configure private permanent and quarantine storage with correct ownership and no direct web access.
5. Verify MongoDB/OpenAI only if AI features are enabled; relational workflows must remain authoritative.
6. Verify ClamAV with clean, EICAR, timeout, and unavailable-service cases.
7. Verify the CAPTCHA public key, backend secret, domain restrictions, and provider failure behavior.
8. complete the CSP report-only review, then explicitly approve enforcement; verify HTTPS-only HSTS.
9. Install/start the queue worker and scheduler, confirm logs, queue drain, failed-job visibility, and graceful restart.
10. Run audits, build, tests, MySQL integration, browser smoke tests, backup/restore rehearsal, and monitoring/alert checks against the exact release.
11. Cache Laravel configuration/routes/views only after environment validation, then retain the previous release and rollback instructions.

## Backup, restore, and rollback

RIKMS does not currently execute or orchestrate backups. Backup settings in the UI are informational. Operations owns scheduled, encrypted, off-host backups for MySQL, private/public files, and MongoDB, including retention, access control, monitoring, and restore drills. No release is production-ready until a staging restore has been evidenced. See [docs/BACKUP_FEATURE_STATUS.md](docs/BACKUP_FEATURE_STATUS.md).

Application rollback should switch to the previously verified release, restore compatible cached configuration, restart workers gracefully, and verify health. Database rollback is release-specific: do not run blind or destructive migration rollbacks. Take a verified backup first and use a reviewed forward fix when data-loss risk exists. Restore data only through the approved recovery procedure.

## Monitoring

Monitor HTTP availability and errors, authentication/MFA anomalies, security events, queue depth and age, failed jobs, scheduler heartbeat, worker restart count, AI/provider failures, malware-scan failures, quarantine cleanup/promotion errors, storage capacity, database health, CSP reports, CAPTCHA failures, mail delivery, and backup/restore alerts. Log access and retention must be restricted appropriately.

## Security reporting

Do not disclose suspected vulnerabilities, secrets, personal data, or malicious samples in a public issue. Report them privately to the designated RIKMS security/operations owner with the affected release, impact, reproduction steps, and sanitized evidence. Rotate exposed credentials immediately and preserve relevant audit logs. The repository does not currently publish a dedicated external security contact; the deployment owner must define and test that channel before production.
