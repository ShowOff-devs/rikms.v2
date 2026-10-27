# Module 01 — Server, IP Access & Deployment QA

This suite covers the eight P0 cases in the pre-deployment checklist. Laravel tests run against an isolated in-memory SQLite configuration. Live HTTP checks and host checks require separate opt-in configuration; passing application tests alone never establishes deployment readiness.

The repository is Laravel 12.64.0, PHP `^8.4.1`, Pest 4.7.5, and `pestphp/pest-plugin-laravel` 4.1.0. Pest and the Laravel plugin are already in `composer.lock`; no dependency was added. PHPUnit's safety-critical test variables use `force="true"`, including the test environment, dummy key, local-only URL, SQLite memory database, array cache/session, and synchronous queue. This prevents inherited deployment settings from redirecting application tests to production services.

## Prerequisites

- PHP 8.4 or newer within the Composer constraint, Composer dependencies from the lock file, and the PHP extensions required by Laravel/Pest.
- A built frontend manifest before the application asset test: `npm ci && npm run build`.
- For live checks, a machine authorized to reach the target IP and explicit `RIKMS_QA_*` variables below. The service exposure test should run from an authorized external network vantage point.
- For host checks, Ubuntu/Linux, a deployment checkout, access to the applicable read-only service commands, and an account authorized to inspect the relevant logs and firewall rules.

No Pest installation or dependency update is needed for this repository.

## Run the checks

Application tests only:

```bash
php artisan test --group=module01-app
```

All Module 01 Pest cases are tagged `module01`. The checklist command below also selects live cases, but those cases skip safely unless the user explicitly enables them and selects the `module01-live` group. It does not make a network request when only `module01` is selected.

```bash
php artisan test --group=module01
```

Live deployment tests require both `RIKMS_QA_LIVE_ENABLED=true` and an explicit live group. The consolidated command runs the app group by default and the live group only with `--live`:

```bash
RIKMS_QA_LIVE_ENABLED=true php artisan rikms:module01-qa --live
```

The same live group can be selected directly for a Pest/JUnit run:

```bash
RIKMS_QA_LIVE_ENABLED=true php artisan test --group=module01-live --log-junit=storage/logs/module01-qa/live-junit.xml
```

Host checks are read-only and are available as a separate command. They do not run in ordinary Pest tests:

```bash
RIKMS_QA_INFRA_ENABLED=true php artisan rikms:module01-infrastructure-check --json
```

Run the consolidated readiness report after the relevant live and host checks. `--enforce-go` makes any P0 failure, blocked check, or missing evidence return a nonzero status:

```bash
RIKMS_QA_LIVE_ENABLED=true RIKMS_QA_INFRA_ENABLED=true php artisan rikms:module01-qa --live --infrastructure --enforce-go
```

The report command always runs application tests. It returns a successful command status when those tests pass, even if the report remains `NO-GO` because deployment evidence has not been collected. Add `--enforce-go` when sign-off must require a complete deployment gate.

Reports are written under `storage/logs/module01-qa/<UTC timestamp>/` by default. Supply `--output-dir=...` to choose a different private evidence directory. Each run contains `module01-report.md`, `module01-report.json`, `module01-junit.xml`, and the per-layer JUnit files for suites that ran.

## Live test configuration

Set these values in the explicitly authorized runner environment. Do not place credentials in them.

| Variable | Requirement |
|---|---|
| `RIKMS_QA_LIVE_ENABLED` | Must be `true`; no live request is made otherwise. |
| `RIKMS_QA_BASE_URL` | Root URL using the assigned IP, such as `https://203.0.113.25`; hostnames, URL credentials, query strings, fragments, and subpaths are rejected. |
| `RIKMS_QA_TRANSPORT_MODE` | `https` or `restricted_http`; the scheme must match the selected mode. |
| `RIKMS_QA_TLS_CA_FILE` | Optional CA bundle for an explicitly approved private trust chain. Normal peer, certificate, date, and IP checks remain enabled. Self-signed certificates are not accepted by bypassing verification. |
| `RIKMS_QA_TIMEOUT_SECONDS` | Optional per-request timeout from 1 to 20 seconds; default 8. |
| `RIKMS_QA_HTTP_PORT` | Optional HTTP port for redirect/restriction checks; default 80. |
| `RIKMS_QA_HTTPS_PORT` | Optional HTTPS port; defaults to the port in `RIKMS_QA_BASE_URL` or 443. |
| `RIKMS_QA_HTTP_POLICY` | Optional `blocked` when HTTP is intentionally firewalled. Evidence is still required. Otherwise the check expects an HTTPS redirect. |
| `RIKMS_QA_SESSION_COOKIE` | Exact deployed Laravel session-cookie name for the cookie attribute and continuity check. |
| `RIKMS_QA_EXPOSURE_PORTS` | Explicit comma-separated TCP ports to probe externally, maximum 16. Populate from the actual service and administrative configuration; do not add ranges. |
| `RIKMS_QA_EXTERNAL_PROBE_CONFIRMED` | Set `true` only when the runner is at the approved external test location. |
| `RIKMS_QA_EXTERNAL_SOURCE_REFERENCE` | Non-secret evidence reference identifying the approved test vantage point. |
| `RIKMS_QA_RESTRICTED_NETWORK_CONFIRMED` | Set `true` only when an authorized external restriction review was completed. |
| `RIKMS_QA_RESTRICTION_EVIDENCE` | Non-secret change, firewall, or test evidence reference for restricted HTTP or blocked HTTP policy. |

For `restricted_http`, both restriction confirmation and an evidence reference are required. The certificate/redirect checks are reported as justified N/A; the deployment gate accepts this only with the recorded justification. Run the external boundary verification described below before using that mode.

The live group only connects to the configured IP. Redirects are followed at most six times and only when every target remains on that IP. HTTPS verification uses the platform trust store (or the explicitly supplied CA file), checks certificate dates, and requires an IP subject alternative name. The service exposure check makes bounded TCP connection attempts only to the supplied ports.

## Host infrastructure configuration

| Variable | Requirement |
|---|---|
| `RIKMS_QA_INFRA_ENABLED` | Must be `true` before host checks run. |
| `RIKMS_QA_ALLOWED_INBOUND_PORTS` | Reviewed UFW port allowlist, for example `22,80,443`. Only ports 80 and 443 may allow `Anywhere`; other allowed ports must match a source in the trusted CIDR list. |
| `RIKMS_QA_TRUSTED_ADMIN_CIDRS` | Comma-separated exact source CIDRs authorized for administrative ports, such as `198.51.100.0/24`. |
| `RIKMS_QA_FIREWALL_EXTERNAL` | Set `true` only when a cloud/network firewall is authoritative instead of host UFW. |
| `RIKMS_QA_FIREWALL_EVIDENCE` | Non-secret reference to reviewed external firewall rules; used to justify N/A for host UFW. |
| `RIKMS_QA_QUEUE_UNIT` | Optional installed systemd queue-worker unit; default `rikms-queue`. |
| `RIKMS_QA_SCHEDULER_TIMER` | Optional installed scheduler timer; default `rikms-scheduler.timer`. |
| `RIKMS_QA_MONITOR_TIMER` | Optional installed monitor timer; default `rikms-monitor.timer`. |
| `RIKMS_QA_MYSQL_UNIT` | Optional local relational database unit name; default `mysql`. |
| `RIKMS_QA_MONGODB_UNIT` | Optional local MongoDB unit name; default `mongod`. |
| `RIKMS_QA_REDIS_UNIT` | Optional local Redis unit name; default `redis-server`. |

The host command reads Apache configuration and status, the active public root, the rewrite module and `.htaccess`, UFW status, listening socket addresses, service connectivity, systemd active/enabled state, bounded Apache/Laravel log tails, and the last 200 journal entries from each checked service unit. It does not restart, reconfigure, or disable services. Database, MongoDB, and Redis connectivity uses read-only `SELECT 1`/`ping` operations with a five-second connection timeout. The declared UFW allowlist is compared with effective inbound rules: unlisted allows fail, missing declared ports fail, and admin ports must be restricted to exact trusted CIDRs. Optional MongoDB or Redis use is reported with a reason when not configured or selected. Local database/Redis and the checked-in queue, scheduler, and monitor units are also checked for active/enabled startup state.

If the current account cannot inspect UFW or logs, the check reports `Blocked`. Use an authorized operations account or provide an approved external-firewall evidence reference. Do not run this command with `sudo` unless the account and resulting report location are approved for the deployment.

## Post-reboot verification

Reboot recovery cannot be established until an authorized reboot has actually completed. The suite never reboots or restarts a service.

1. Before the approved reboot, capture the current boot identifier on the server: `cat /proc/sys/kernel/random/boot_id`.
2. Complete the separately authorized reboot and wait for the server to return.
3. On the server, provide the captured value as `RIKMS_QA_PRE_REBOOT_BOOT_ID`, set `RIKMS_QA_POST_REBOOT_ENABLED=true`, configure the same IP transport variables, and run:

```bash
RIKMS_QA_POST_REBOOT_ENABLED=true RIKMS_QA_PRE_REBOOT_BOOT_ID='<captured-id>' RIKMS_QA_INFRA_ENABLED=true php artisan rikms:module01-qa --infrastructure --post-reboot --enforce-go
```

The command requires a changed Linux boot ID, active Apache, and HTTP 200 from the configured `/up` health route. The infrastructure group separately checks active/startup configuration for the applicable services and timer. Until this procedure runs after an authorized reboot, TEST 01-08 remains blocked and the gate remains `NO-GO`.

## Read the reports

- `module01-report.json` contains all eight P0 cases, expected and actual results, status, execution time, duration, sanitized evidence, failure reason, corrective action, and coverage by application, live deployment, infrastructure, and post-reboot layer.
- `module01-report.md` is the human-readable sign-off table.
- `module01-junit.xml` is a consolidated JUnit document. A blocked, N/A, or not-run layer is represented as skipped in JUnit and retains its distinct status in the JSON and Markdown reports.
- Per-layer JUnit files preserve the actual Pest outcomes. A skipped or incomplete test is never counted as a pass.

Each report includes the application environment, PHP and Laravel versions, operating system, build/commit identifier when available, and UTC execution time. The report stores only check summaries and sanitized diagnostics; it does not include connection strings, credentials, raw response bodies, cookies, or log lines.

The readiness gate is `GO` only when every required layer for all eight P0 cases passes, or a check is N/A with a non-empty documented justification. Any failure yields `NO-GO`; blocked or not-run evidence also prevents GO. Application test results cannot establish TLS, Apache, firewall, public exposure, or reboot recovery.

## Traceability matrix

| Test ID | Application assertions | Live deployment evidence | Host/manual evidence |
|---|---|---|---|
| TEST 01-01 | Valid configured URL syntax, generated URL host, landing route response. | Root page over the assigned IP, same-IP redirect chain, final Inertia application response. | No host-only check; use live result. |
| TEST 01-02 | Secure, HttpOnly, encrypted, host-only session configuration and acceptable SameSite policy. | Trusted TLS handshake, IP SAN match, certificate dates and trust; or justified restricted-network evidence. | Firewall evidence required for the restricted HTTP alternative. |
| TEST 01-03 | Generated route preserves the configured scheme. | HTTP redirects to the same IP over HTTPS without loops/downgrade, or external restriction is evidenced. | HTTP firewall restriction may require operations evidence. |
| TEST 01-04 | Laravel front controller, rewrite directive, Vite manifest/files, and a public route. | Public route and referenced built assets load; internal application paths are denied. | Apache syntax, active virtual-host DocumentRoot, rewrite module, and `AllowOverride` for front-controller rules. |
| TEST 01-05 | Test-only session route proves session persistence; cookie flags are checked; web middleware includes CSRF enforcement. | Deployed session cookie flags and CSRF token stability across requests; a credential-free POST without a token returns 419. | Test-only Laravel CSRF behavior is not treated as deployed verification. |
| TEST 01-06 | Debug is disabled and a test-only exception response hides details. | Generic 404/error response; `.env`, `.git`, Composer files, source, backups, and logs are denied. | No secret values or log lines are emitted by infrastructure checks. |
| TEST 01-07 | PHPUnit forces in-memory SQLite, array sessions/cache, and sync queues, isolated from deployment services. | Bounded external TCP probes against the explicitly configured service/admin port list. | MySQL read query and configured MongoDB/Redis pings; listener bindings checked against actual configured ports. |
| TEST 01-08 | `/up` health route and checked-in queue/scheduler/monitor startup examples. | No remote reboot claim. | UFW/default policy and allowlist, systemd active/enabled state, Apache/Laravel log tails, then a separate authorized reboot plus changed boot ID and HTTP health smoke test. |

## CI/CD

The existing GitHub Actions `ci` matrix runs the application-only Module 01 QA command after building the frontend and uploads Markdown, JSON, consolidated JUnit, and per-layer JUnit reports as a CI artifact. The workflow does not set live, infrastructure, or post-reboot flags and cannot reach production through this suite. A CI report is expected to show `NO-GO` until deployment evidence is collected; CI fails when the application P0 tests fail.

## Troubleshooting and controlled verification

- **Missing Vite manifest or asset:** run `npm ci && npm run build` in the isolated checkout, then repeat the application group.
- **`could not find driver` for SQLite:** install/enable `pdo_sqlite` for the PHP runtime that executes Pest, then rerun. The report records setup errors as `Blocked`; no assertions ran.
- **Live checks show Blocked:** check the enable flag, IP-only base URL, transport mode, session cookie name, and external source reference. Missing configuration sends no request.
- **TLS check fails:** verify that the IP has a currently trusted certificate with the correct IP SAN. For an approved private CA, provide its CA bundle through `RIKMS_QA_TLS_CA_FILE`; never turn off peer verification.
- **Apache check is Blocked:** run `apache2ctl -t`, `apache2ctl -M`, and inspect the active site and directory rules with an authorized operations account. The code repository does not contain the deployed Apache virtual host.
- **Firewall or log check is Blocked:** the current account lacks read access, the active firewall is managed outside UFW, or log routing differs. Add a non-secret reference to the reviewed policy or run from the approved operations account.
- **External port check is Blocked:** run it from the approved external test vantage point and supply only the reviewed, bounded port list. Do not replace this check with an unrestricted scanner.
- **Reboot recovery is Blocked:** run it only after an authorized reboot with the pre-reboot boot ID. The suite does not initiate a reboot or service restart.

The external network boundary, privileged firewall rules, and actual reboot remain controlled verification steps when the authorized runner or account cannot directly observe them. Attach their reviewed evidence reference before sign-off.
