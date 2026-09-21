# Queue, scheduler, coverage, and recovery operations

Production infrastructure is externally operated. Before releasing against a new or changed database, MongoDB cluster, Redis service, or object-storage namespace, follow [the external infrastructure operator contract](EXTERNAL_INFRASTRUCTURE.md) and require a successful `php artisan rikms:infrastructure-check --write` result.

## Coverage baseline

The test workflow generates an Xdebug Clover report in the `coverage-baseline` job and retains `coverage.xml` as the `php-coverage-baseline` artifact for 14 days. PHPUnit limits coverage to `app/`; vendor packages, generated frontend/route assets, configuration, views, routes, database artifacts, and framework bootstrap files are outside that source set. The empty starter `app/Http/Controllers/Controller.php` is explicitly excluded.

No global percentage gate is enabled yet. Record several successful main-branch baselines, identify stable trends, and prioritize security-sensitive classes before proposing a global threshold. Per-component thresholds should be introduced only when the coverage tooling can enforce them without treating unrelated application code as part of the same target. Initial candidates are authorization policies, `UploadSecurityScanner`, `QuarantinedUploadStorage`, `PublicAccessRequestCaptchaVerifier`, approved-download authorization, and production environment validation. Tests must validate behavior and failure paths rather than execute lines solely to raise a percentage.

## Queue contract

The worker has a 120-second execution timeout. `DB_QUEUE_RETRY_AFTER` or `REDIS_QUEUE_RETRY_AFTER`, according to the selected driver, must remain longer than the worker timeout to prevent a second worker from acquiring a still-running job. Metadata and SDG jobs use three attempts with 10, 30, and 60-second backoff. PDF parsing uses one 120-second attempt because parser failures are recorded as terminal results. Access-decision mail notifications use three attempts, a 60-second timeout, and the same bounded backoff.

Handled provider/application failures are written as explicit failed pipeline results and are not retried blindly. Unhandled queue failures are stored through `QUEUE_FAILED_DRIVER=database-uuids` in `failed_jobs`.

Install the examples from `deploy/systemd` after adjusting the deployment path and service account:

```bash
sudo cp deploy/systemd/rikms-queue.service /etc/systemd/system/
sudo cp deploy/systemd/rikms-scheduler.service /etc/systemd/system/
sudo cp deploy/systemd/rikms-scheduler.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rikms-queue.service rikms-scheduler.timer
```

Deployments should gracefully reload workers after code and configuration caches are ready:

```bash
php artisan queue:restart
sudo systemctl reload-or-restart rikms-queue.service
```

The worker prioritizes the lightweight `health` queue and then processes the application `default` queue. It receives `SIGTERM`, has 130 seconds to finish its current 120-second job, and is recycled after one hour to pick up code and release memory. The scheduler timer invokes `schedule:run` every minute. Laravel monitors both database queues every minute, schedules the opted-in agency weekly digest on Monday, and schedules the opted-in monthly analytics report on the first day of each month. All scheduled jobs use overlap prevention; agency emails also use a single-server lock.

Every scheduler invocation records a scheduler heartbeat and queues a lightweight worker-heartbeat job. A fresh scheduler heartbeat proves that `schedule:run` is executing; a fresh worker heartbeat proves that the database worker consumed a recently queued job. Both default to stale after 300 seconds. Verify them without exposing application data:

```bash
php artisan rikms:runtime-check
```

The command exits non-zero if the pilot is not using the database queue driver, the database or queue tables are unavailable, or either heartbeat is missing/stale. The protected admin queue-health endpoint exposes the same sanitized heartbeat state. Configure `RUNTIME_HEARTBEAT_STALE_AFTER_SECONDS` only if the scheduler interval changes, and keep it comfortably above one minute.

The agency email schedules default to 08:00 `Asia/Manila`. Override them with `SCHEDULED_AGENCY_EMAILS_TIMEZONE`, `WEEKLY_DIGEST_DAY`, `WEEKLY_DIGEST_TIME`, `MONTHLY_ANALYTICS_DAY`, and `MONTHLY_ANALYTICS_TIME`. `SCHEDULED_AGENCY_EMAILS_ENABLED=false` disables both schedules. Keep the configured cache store, queue worker, and mail transport healthy before enabling delivery.

## Monitoring and failed jobs

The independent monitoring entry point is:

```bash
php artisan rikms:monitor-check
php artisan rikms:monitor-check --alert
```

Install `deploy/systemd/rikms-monitor.service` and `.timer` so alert evaluation does not depend on the Laravel scheduler or queue. Configure synchronous email and/or HTTPS webhook delivery through `MONITORING_*`; identical incidents are cooldown-limited and recovery notices are supported. See `docs/MONITORING_DEPLOYMENT.md` for Grafana Cloud log shipping and the staging alert drill.

Monitor:

- `systemctl is-active` and restart counts for the worker and scheduler timer;
- queue depth and oldest-job age in `jobs`;
- `failed_jobs` count and new failure timestamps;
- `QueueBusy` events or non-zero `queue:monitor` exits;
- job runtime approaching 120 seconds, timeout kills, retry counts, and repeated exception classes;
- application logs for AI pipeline failures and access-request mail failure audit events;
- scheduler timer last/next trigger and missed runs.

Operational commands:

```bash
php artisan queue:failed
php artisan queue:retry <failed-job-uuid>
php artisan queue:forget <failed-job-uuid>
php artisan schedule:list
php artisan rikms:runtime-check
sudo systemctl status rikms-queue.service rikms-scheduler.timer
sudo journalctl -u rikms-queue.service -u rikms-scheduler.service --since today
```

Inspect the exception and correct the underlying dependency or configuration before retrying. Never use `queue:retry all`, `queue:flush`, or bulk deletion as an automatic recovery step.

## Recovery after a host or service restart

1. Confirm the database, storage, ClamAV, mail, MongoDB, and external API dependencies are reachable.
2. Confirm `.env`, cached configuration, release path, permissions, and migrations match the deployed release.
3. Start the scheduler timer and queue worker, then verify their systemd status and journal output.
4. Run `php artisan schedule:list`, inspect `jobs`/`failed_jobs`, and verify queue depth begins decreasing.
5. Retry only individually reviewed failed jobs. Confirm idempotency and current record state before retrying mail or AI processing.
6. Perform a non-production smoke transaction and verify its audit trail and expected queue completion.

These units and restart steps were validated structurally and through local automated tests only. Actual systemd enablement, graceful in-flight shutdown, reboot persistence, scheduler invocation, alert delivery, and recovery must be exercised on Ubuntu staging before production sign-off.

## Backup safety

RIKMS currently has no backup execution endpoint, queued backup job, restore endpoint, or backup helper. The UI remains informational and disabled. Production operations must use an administrator-approved external backup procedure until a dedicated, authenticated, audited, off-host backup implementation is delivered. Do not represent settings such as `backup.last_backup_at` as proof that a backup exists, and never test restore procedures against production data.

## Storage reconciliation

Run a read-only reconciliation after deployments and on a reviewed operations schedule:

```bash
php artisan rikms:storage-reconcile
```

It reports missing research objects, unreferenced private objects, abandoned quarantine objects, orphaned MongoDB AI results, and AI status mismatches. Repair is deliberately fail-closed. Review the dry-run output first, set `STORAGE_RECONCILIATION_REPAIR_ENABLED=true` for the maintenance window, then run `php artisan rikms:storage-reconcile --repair`. Disable repair again afterward. A repaired missing object is marked `missing`; it is never silently recreated or presented as downloadable.

If an upload succeeded but queue dispatch failed, inspect queue/database health and the file's storage object, then requeue that single idempotent pipeline with `php artisan rikms:ai-requeue <research-file-id>`. Do not bulk requeue files without reviewing provider capacity and failure history.
