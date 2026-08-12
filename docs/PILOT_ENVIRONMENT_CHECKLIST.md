# Pilot Environment Checklist

## Application

- `APP_ENV=staging` or pilot-specific value.
- `APP_DEBUG=false`.
- `APP_URL` uses the HTTPS deployment URL. `http://rikmsv2.test` is local development only.
- `APP_KEY` is set and never committed.
- Trusted proxy/host settings are configured if behind a proxy.
- `TRUSTED_HOSTS` lists the exact pilot hostnames and `TRUSTED_PROXIES` lists only known proxy IPs/CIDRs.
- `LOG_LEVEL=warning`, `error`, or `critical`.
- Do not run `php artisan serve` for this Herd project.

## Database

- MySQL 8.4 pilot credentials are set through environment only. SQLite remains suitable for local development, not release acceptance.
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
- `MONITORING_ALERTS_ENABLED=true` with a monitored institutional email address and/or HTTPS webhook.
- Independent `rikms-monitor.timer` enabled and `php artisan rikms:monitor-check --alert` verified.
- Grafana Alloy shipping reviewed RIKMS/system logs to an organization-owned central log stack.
- Retry/backoff policy reviewed for AI/PDF jobs.

Local development worker:

```powershell
php artisan queue:work --tries=3
```

Ubuntu pilot systemd service (`/etc/systemd/system/rikms-queue.service`):

```ini
[Unit]
Description=RIKMS Laravel Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
RestartSec=5
WorkingDirectory=/var/www/rikms
ExecStart=/usr/bin/php artisan queue:work database --queue=default --tries=3 --timeout=120

[Install]
WantedBy=multi-user.target
```

After adjusting the path and service user for the pilot host:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rikms-queue
sudo systemctl status rikms-queue
sudo systemctl restart rikms-queue
```

## Storage

- Private upload disk configured and writable.
- `storage/app/private/research` protected from public web access.
- File permissions checked on pilot host.
- `storage:link` only where appropriate for public assets.
- Private uploads and generated reports remain ignored.
- `UPLOAD_QUARANTINE_DISK` and `UPLOAD_STORAGE_DISK` point to private disks.
- `MALWARE_SCANNER=none` means real malware scanning is inactive; only the built-in PDF guard runs.
- Before wider rollout, configure and test `MALWARE_SCANNER=clamav` with the correct private `CLAMAV_HOST` and `CLAMAV_PORT`.
- Set `CLAMAV_STREAM_MAX_LENGTH_MB` to the same value as clamd `StreamMaxLength`; it must cover the effective application upload limit.
- Run `php artisan rikms:clamav-check` after every deployment and signature-engine maintenance. It must report all checks as `PASS` and show an engine version.
- Keep clamd TCP port `3310` on loopback or a private application network only; never expose it to the public internet.
- Password-protected/encrypted PDFs are rejected during the pilot.
- PDF parser jobs have a 120-second timeout, one attempt, and bounded stored extraction text.

## Public cache

- Public browse cache defaults to 60 seconds.
- Public summary, agency list, and agency detail cache defaults to 5 minutes.
- Research and agency model changes advance scoped cache versions; authenticated and token responses are never cached.
- SDG aggregation uses database JSON queries. Validate indexing/generated-column strategy on MySQL before national-scale rollout.

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

- Rotate all existing pilot seeded account passwords before deployment.
- Do not deploy public default credentials.
- Set `RIKMS_ALLOW_DEV_SEED_ACCOUNTS=false` in pilot, staging, and production.
- Require Super Admin MFA with `RIKMS_FORCE_SUPER_ADMIN_MFA=true`.

- Agency Admin login verified.
- Super Admin login verified.
- Super Admin 2FA enrollment verified.
- Session timeout verified.
- Role redirects verified for agency/admin/default login.
- Public registration remains disabled unless a release decision changes it.

## Security

- No `.env`, credentials, database files, private uploads, logs, generated backups, or archives staged.
- Locked PHP dependencies include the Guzzle 7.15.2 and CommonMark 2.9.1 security remediations.
- `composer audit --locked` and `npm audit --omit=dev` must both report zero advisories for the release SHA.
- CI runs `composer audit --locked` and `npm audit --omit=dev` without deployment secrets or production migrations.
- Debug disabled.
- Review whether `public/.user.ini` should be source-controlled or deployed by server configuration.

## Verification Commands

```bash
php artisan optimize:clear
php artisan route:list
php artisan migrate:status
php artisan test
composer lint:check
npm run format:check
npm run lint:check
npm run types:check
npm run test:frontend
npm run build
npm audit --omit=dev
composer audit --locked
git diff --check
```
