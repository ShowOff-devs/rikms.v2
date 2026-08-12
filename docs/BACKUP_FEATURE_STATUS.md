# Backup Feature Status

## Current Status

Backup execution is not configured in the RIKMS v2 pilot environment. External-drive preparation and readiness checks are implemented.

The Super Admin Platform Settings page can save a destination label, prepared frequency, and retention period. It can check a server-managed destination for connectivity, write access, free space, volume separation, and encryption-key readiness. It does not execute database, file, or MongoDB backups.

## Reason

No backend backup job or protected backup API currently exists. RIKMS v2 does not yet include:

- A backup execution endpoint.
- A queued backup job.
- A backup run history table.
- Configured backup archive format and execution storage disk.
- Automated database or file backup orchestration.

## Pilot Behavior

The Backup and Data Recovery panel is intentionally preparation-only during the pilot.

- The backup execution button remains disabled.
- The readiness button performs read-only destination checks.
- The actual mount path and encryption key remain in deployment secrets and are never stored in platform settings or returned by the API.
- Same-volume destinations are rejected by default; an external drive should appear as a separate filesystem or volume.
- The UI states that backup execution is not configured.
- The frontend does not create fake backup records.
- The frontend does not update `backup.last_backup_at`.
- The frontend does not show backup execution as completed.

Database and file backups must be performed by the system administrator or configured during production deployment.

## External-drive preparation

After connecting and unlocking the drive through Windows or Ubuntu, configure:

```dotenv
BACKUP_EXECUTION_ENABLED=false
BACKUP_DESTINATION_PATH="E:/RIKMS-Backups"
BACKUP_ENCRYPTION_KEY="base64:replace-with-a-dedicated-random-32-byte-key"
BACKUP_MINIMUM_FREE_SPACE_MB=10240
BACKUP_REQUIRE_SEPARATE_FILESYSTEM=true
```

Use the operating system's normal drive-unlock process. A BitLocker or LUKS recovery key must never be reused as `BACKUP_ENCRYPTION_KEY`. Clear cached Laravel configuration, open Super Admin → Settings → Backup and Data Recovery, and select **Check Backup Readiness**. A ready result authorizes only a future controlled test-backup implementation; it does not enable execution.

## Production Recommendation

For production, implement real backup execution with:

- `spatie/laravel-backup` for relational database and file backups.
- `mongodump` and `mongorestore` workflows for MongoDB AI/PDF/SDG collections.
- A `backup_runs` table to track status, started time, finished time, disk, file path, size, initiator, errors, and retention metadata.
- A `super_admin`-only protected API for manual backup execution and backup run status.
- Queued backup jobs instead of synchronous request-time execution.
- Audit logs for backup start, success, failure, restore request, and restore completion events.
- Notifications for backup success/failure and storage health issues.
- S3, R2, or another off-server backup disk rather than local-only storage.
- A documented restore runbook that separately covers relational data, uploaded files, and MongoDB collections.
