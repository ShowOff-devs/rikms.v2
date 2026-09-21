# External infrastructure operator contract

RIKMS does not provision production infrastructure. The repository defines the configuration, permissions, health probes, and deployment boundaries that an external operator must satisfy.

## Supported production topology

- MySQL or MariaDB is the authoritative relational database.
- MongoDB stores AI, PDF parsing, and SDG result documents.
- Redis may provide the shared queue and cache backends. Failed jobs remain in the relational database.
- Two private S3-compatible namespaces store quarantined and accepted uploads. Use different buckets or different roots; neither namespace may be public.
- ClamAV, SMTP, monitoring delivery, TLS termination, DNS, and backup systems remain externally operated.

The dependency template is `deploy/env/external-services.env.example`. Populate it through the deployment secret manager or a root-owned `/etc/rikms/rikms.env` file with mode `0600`. Never populate or commit the example.

## Required permissions

The application database identity needs normal DML privileges and migration-time DDL privileges. Use a separate migration identity if your platform supports it.

The MongoDB identity needs read/write access to `pdf_parsing_results`, `ai_metadata`, and `sdg_classifications`, including permission to create the repository's unique indexes during deployment.

Each storage identity needs list, read, write, and delete permissions only for its configured bucket/root. Object versioning, encryption, retention, replication, and provider audit logs are operator responsibilities. The application never needs public object ACLs.

Redis needs separate logical databases or provider namespaces for the default/cache connections. Network access must be private and authenticated. Queue retry time must remain greater than every application job timeout.

## Deployment gate

After injecting secrets and before directing traffic to a release:

```bash
composer install --no-dev --classmap-authoritative --no-interaction
php artisan config:cache
php artisan migrate --force
php artisan rikms:infrastructure-check --write
php artisan rikms:clamav-check
php artisan optimize
```

`rikms:infrastructure-check` verifies the relational database, migration state, MongoDB connectivity and required AI-result index definitions, selected Redis usage, queue/failed-job storage, both upload disks, and the required backup destination. `--write` creates missing MongoDB indexes and performs temporary cache, object-storage, and backup-destination write/read/delete probes. A conflicting MongoDB index definition fails closed and must be reviewed instead of being replaced automatically. Use `--json` for deployment automation. A nonzero exit code must block the release.

The write probe requires delete permission. If cleanup is interrupted, the object remains under `.rikms-health/` and will be reported by storage reconciliation.

Start or reload the queue worker and scheduler only after the gate passes. The included systemd units read `/etc/rikms/rikms.env`; adjust paths and service identities for the target platform.

## Backup and restore boundary

The external backup system must capture a consistent recovery set containing:

1. The complete MySQL/MariaDB database, including migration, queue-failure, audit, and archive records.
2. The configured MongoDB database and its indexes.
3. All versions required by policy from both permanent and quarantine object-storage namespaces.
4. Deployment configuration and encryption-key references from the secret manager; never copy plaintext secrets into backup manifests.

A backup is not considered successful until the operator records its timestamp, release identifier, component snapshots, encryption state, retention class, and restore-test result in the external backup system.

Restore into an isolated environment in this order: relational database, MongoDB, permanent objects, quarantine objects, application release/configuration, migrations, then workers. Run `php artisan rikms:infrastructure-check --write` and `php artisan rikms:storage-reconcile` before allowing traffic. Review reconciliation output before enabling its repair mode.

RPO, RTO, backup frequency, retention, cross-region replication, legal holds, key custody, and restore authorization are external governance decisions and are intentionally not encoded in application code.

## Runtime operations

- Run one scheduler invocation each minute or use a single `schedule:work` process.
- Run workers for `health,default`; the configured queue connection is selected from the environment.
- Run `rikms:monitor-check --alert` independently of the application worker and scheduler.
- Probe `/up` externally for web-process availability.
- Run `rikms:storage-reconcile` as a reviewed dry run before enabling repair.
- Use `rikms:ai-requeue <file-id>` only for a verified active file after provider or queue recovery.

Provider dashboards must alert on database availability/capacity, MongoDB replication and backups, Redis memory/evictions, object-storage errors/capacity, backup freshness, and credential or encryption-policy drift. Application monitoring supplements but does not replace those provider signals.
