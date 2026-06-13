# Pilot Environment Checklist

## Application

- `APP_ENV=staging` or pilot-specific value.
- `APP_DEBUG=false`.
- `APP_URL` points to the Herd/pilot domain, normally `http://rikmsv2.test` locally.
- `APP_KEY` is set and never committed.
- Trusted proxy/host settings are configured if behind a proxy.
- Do not run `php artisan serve` for this Herd project.

## Database

- SQLite pilot path or MySQL staging credentials are set through environment only.
- Back up the pilot database before migration.
- Confirm `php artisan migrate:status` before and after deployment.
- Run incremental `php artisan migrate` only on a safe copy first.
- `database/database.sqlite` must not be committed unless project policy explicitly changes.

## Mail

- `MAIL_MAILER` set for pilot.
- SMTP credentials are environment secrets only.
- Verify password reset and email verification delivery.
- Confirm failed mail does not break agency-admin creation where fallback behavior is intended.

## Queue

- `QUEUE_CONNECTION` set, currently database-compatible.
- Queue worker configured outside the web process.
- Failed jobs monitored.
- Retry/backoff policy reviewed for AI/PDF jobs.

## Storage

- Private upload disk configured and writable.
- `storage/app/private/research` protected from public web access.
- File permissions checked on pilot host.
- `storage:link` only where appropriate for public assets.
- Private uploads and generated reports remain ignored.

## MongoDB

- `MONGODB_URI` provided from environment or secret manager only.
- Credential rotation required if any real URI was ever exposed outside `.env`.
- Collections available for `ai_metadata`, `pdf_parsing_results`, and `sdg_classifications`.
- Relational database remains the source of truth.

## OpenAI

- `OPENAI_API_KEY` provided from environment or secret manager only.
- Model configuration reviewed.
- AI enable/disable behavior verified.
- Upload workflow continues when AI/MongoDB is unavailable.

## Authentication

- Agency Admin login verified.
- Super Admin login verified.
- Super Admin 2FA enrollment verified.
- Session timeout verified.
- Role redirects verified for agency/admin/default login.
- Public registration remains disabled unless a release decision changes it.

## Security

- No `.env`, credentials, database files, private uploads, logs, generated backups, or archives staged.
- Composer audit blocker reviewed: `guzzlehttp/psr7 <2.10.2` has two medium advisories.
- `npm audit --audit-level=moderate` currently reports 0 vulnerabilities.
- Debug disabled.
- Review whether `public/.user.ini` should be source-controlled or deployed by server configuration.

## Verification Commands

```bash
php artisan optimize:clear
php artisan route:list
php artisan migrate:status
php artisan test
composer test
npm run types:check
npm run lint:check
npm run lint
npm run build
npm audit --audit-level=moderate
composer audit
```
