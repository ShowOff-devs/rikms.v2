# Queue, scheduler, coverage, and recovery operations

## Coverage baseline

The test workflow generates an Xdebug Clover report in the `coverage-baseline` job and retains `coverage.xml` as the `php-coverage-baseline` artifact for 14 days. PHPUnit limits coverage to `app/`; vendor packages, generated frontend/route assets, configuration, views, routes, database artifacts, and framework bootstrap files are outside that source set. The empty starter `app/Http/Controllers/Controller.php` is explicitly excluded.

No global percentage gate is enabled yet. Record several successful main-branch baselines, identify stable trends, and prioritize security-sensitive classes before proposing a global threshold. Per-component thresholds should be introduced only when the coverage tooling can enforce them without treating unrelated application code as part of the same target. Initial candidates are authorization policies, `UploadSecurityScanner`, `QuarantinedUploadStorage`, `PublicAccessRequestCaptchaVerifier`, approved-download authorization, and production environment validation. Tests must validate behavior and failure paths rather than execute lines solely to raise a percentage.

## Queue contract

The database worker has a 120-second execution timeout and `DB_QUEUE_RETRY_AFTER=180`. The retry reservation must remain longer than the worker timeout to prevent a second worker from acquiring a still-running job. Metadata and SDG jobs use three attempts with 10, 30, and 60-second backoff. PDF parsing uses one 120-second attempt because parser failures are recorded as terminal results. Access-decision mail notifications use three attempts, a 60-second timeout, and the same bounded backoff.

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

The worker receives `SIGTERM`, has 130 seconds to finish its current 120-second job, and is recycled after one hour to pick up code and release memory. The scheduler timer invokes `schedule:run` every minute. Laravel schedules `queue:monitor database:default --max=100` every minute, the opted-in agency weekly digest on Monday, and the opted-in monthly analytics report on the first day of each month. All scheduled jobs use overlap prevention; agency emails also use a single-server lock.

The agency email schedules default to 08:00 `Asia/Manila`. Override them with `SCHEDULED_AGENCY_EMAILS_TIMEZONE`, `WEEKLY_DIGEST_DAY`, `WEEKLY_DIGEST_TIME`, `MONTHLY_ANALYTICS_DAY`, and `MONTHLY_ANALYTICS_TIME`. `SCHEDULED_AGENCY_EMAILS_ENABLED=false` disables both schedules. Keep the configured cache store, queue worker, and mail transport healthy before enabling delivery.

## Monitoring and failed jobs

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
