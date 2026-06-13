# Backup Feature Status

## Current Status

Backup execution is not configured in the RIKMS v2 pilot environment.

The Platform Settings page may store informational backup settings such as backup frequency and status, but it does not execute database, file, or MongoDB backups.

## Reason

No backend backup job or protected backup API currently exists. RIKMS v2 does not yet include:

- A backup execution endpoint.
- A queued backup job.
- A backup run history table.
- Configured backup storage.
- Automated database or file backup orchestration.

## Pilot Behavior

The Backup and Data Recovery panel is intentionally informational during the pilot.

- The backup execution button remains disabled.
- The UI states that backup execution is not configured.
- The frontend does not create fake backup records.
- The frontend does not update `backup.last_backup_at`.
- The frontend does not show backup execution as completed.

Database and file backups must be performed by the system administrator or configured during production deployment.

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
