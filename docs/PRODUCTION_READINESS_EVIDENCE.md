# RIKMS v2 Production-readiness Evidence

Review date: 2026-08-10  
Branch inspected: `release/pilot-rc1`  
Status: **Not production-ready**

This is the current readiness record. Historical audits remain useful snapshots, but their implementation-gap claims may have been superseded. Repository implementation and fresh command output take precedence. The four requested PDFs under `project_sources/` were not present in the inspected workspace, so no policy claim from those sources is included in this review.

## Status definitions

- **Verified**: demonstrated by repository inspection and/or an executed local command.
- **Implemented but awaiting staging**: application code or CI coverage exists, but the real production-like dependency or environment was not exercised here.
- **Documentation/configuration only**: instructions or examples exist without runtime proof.
- **Blocked by infrastructure**: verification requires an unavailable service, host, credential, or runner.
- **Not implemented**: the required capability is absent.

## Evidence matrix

| Control | Status | Evidence | Verification command/procedure | Environment | Owner | Remaining action |
| ------- | ------ | -------- | ------------------------------ | ----------- | ----- | ---------------- |
| Deterministic frontend install and check-only CI | Verified | `package-lock.json`; `.github/workflows/lint.yml`; `.github/workflows/tests.yml` use `npm ci` and check-only scripts | Inspect workflows; run `npm ci` on a clean runner | Local/CI | Application team | Confirm next GitHub Actions run |
| Frontend production dependency advisories | Verified | npm production audit reported zero vulnerabilities | `npm audit --omit=dev` | Local | Application team | Repeat for the release SHA |
| PHP dependency advisories | Verified | Locked `guzzlehttp/guzzle` 7.15.2 and `league/commonmark` 2.9.1 include the available fixes; the 2026-08-10 audit found no advisories | `composer audit --locked`; inspect locked versions | Local | Application team | Repeat for the release SHA and in CI |
| PHP, frontend format, lint, types, build, SQLite tests | Verified | Composer/npm scripts and the Phase 10 command record below | `composer lint:check`; npm checks/build; `php artisan test`; `composer ci:check` | Local | Application team | Repeat on clean CI runner |
| MySQL schema and behavior | Implemented but awaiting staging | `mysql-integration` workflow; `tests/Feature/MySqlProductionCompatibilityTest.php` | GitHub MySQL 8.4 service: migrate fresh/seed, rollback/remigrate, full tests | GitHub Actions/staging | Database owner | Obtain a successful CI run and safe staging migration/rollback evidence |
| Relational source-of-truth boundary | Verified | Eloquent relational models/migrations; Mongo models limited to AI/PDF/SDG results | Inspect `app/Models`, migrations, `app/Models/Mongo` | Repository | Application team | Monitor for boundary regressions |
| MongoDB/OpenAI AI pipeline | Implemented but awaiting staging | Mongo AI/PDF/SDG models, queued jobs, OpenAI services, fake-provider tests | Exercise extraction/classification with staging credentials and sanitized sample PDFs | Staging | Application/AI owner | Verify connectivity, limits, retries, cost, and provider failure behavior |
| Upload quarantine and fail-closed scanning | Implemented but awaiting staging | `UploadSecurityScanner`, `QuarantinedUploadStorage`, ClamAV adapter, production validation, automated failure tests | Run clean/EICAR/timeout/unavailable/malformed/promotion cases against real ClamAV | Ubuntu staging | Security/operations | Install and isolate ClamAV; capture daemon evidence |
| CAPTCHA configuration and backend verification | Implemented but awaiting staging | `config/rikms.php`, `.env.example`, fixed widget action, exact hostname allowlist, verifier and production validation tests | Test real Turnstile keys/domain, matching action/hostname, missing/invalid token, and provider outage | HTTPS staging | Security/application | Complete live-provider verification |
| CSP staged enforcement | Implemented but awaiting staging | Internal privacy-minimized collector, retention schedule, protected review API, `config/security_headers.php`, middleware/tests, `docs/CSP_DEPLOYMENT.md` | Exercise documented routes in report-only mode and review collected violations | HTTPS staging | Security/application | Review real browser reports; resolve evidence; approve enforcement |
| Other security headers and HTTPS-only HSTS | Implemented but awaiting staging | `AddSecurityHeaders` and automated environment/header tests | Inspect HTTPS responses through the staging proxy | HTTPS staging | Security/operations | Verify proxy trust and observed headers |
| Authorization, agency isolation, MFA, archive/restore | Verified | Route middleware/policies and focused feature tests | `php artisan test` | Local SQLite | Application/security | Repeat on MySQL and browser staging |
| Queue retry, timeout, failed jobs, and scheduler configuration | Implemented but awaiting staging | Job settings, `config/queue.php`, `routes/console.php`, operational tests | Start units; create controlled work/failure; restart; inspect queue/scheduler state | Ubuntu staging | Operations | Verify graceful restart, reboot persistence, alerting, and recovery |
| Ubuntu worker/scheduler service definitions | Documentation/configuration only | `deploy/systemd/*.service`, timer, runbook | Review paths/user; install and exercise units | Ubuntu staging | Operations | Host-specific review and execution |
| Coverage baseline | Implemented but awaiting staging | Xdebug coverage job uploads Clover artifact; local host lacks a coverage driver | Run GitHub `coverage-baseline` job | GitHub Actions | Application team | Capture baseline artifact and define gradual policy |
| Automated backup execution | Not implemented | External-drive readiness service/API and preparation UI exist, but the operational test confirms there is no execution or restore route/job | Inspect the single read-only readiness route and verify execution remains disabled | Repository | Operations/product | Connect the drive, pass readiness, then design controlled backup execution and restore rehearsal |
| Backup and restore proof | Blocked by infrastructure | Restore procedure requires real off-host backups and a disposable target | Restore MySQL, files, and MongoDB to isolated staging; reconcile integrity | Staging/backup platform | Operations/database owner | Provide backup platform, retention, alerts, and successful restore evidence |
| Monitoring and alert delivery | Implemented but awaiting staging | Unified monitor command, synchronous email/webhook dispatcher, cooldown/recovery state, independent systemd timer, Grafana Alloy example, and runbook | Configure organization-owned destinations and inject controlled failures | Ubuntu staging/monitoring | Operations/security | Prove delivery, external host monitoring, ownership, and response |
| Production environment validation | Verified | `AppServiceProvider` production checks and focused tests | Run configuration tests; boot with controlled invalid production cases | Automated test | Application/security | Validate the final secret/config set in staging without exposing values |
| Dormant upload/AI mock services | Verified | Three unused production-source mock modules removed; ESLint import restriction added | Repository search; lint, types, and production build | Local | Frontend team | Prevent reintroduction through CI |
| Browser end-to-end release smoke test | Blocked by infrastructure | No current Phase 10 browser/staging execution evidence | Execute `docs/PILOT_STAGING_SMOKE_TEST.md` against exact release SHA | HTTPS staging | QA/product/application | Record browsers, roles, workflows, results, and approver |
| Private security reporting channel | Not implemented | README documents handling, but repository has no published designated contact/channel | Confirm monitored private intake and escalation drill | Organization | Security owner | Define, publish, and test the channel |

## Phase 1-10 implementation evidence detected

1. Frontend production dependency remediation removed unused Mongoose and left audited locked dependencies.
2. Formatting and CI hardening added deterministic installs, read-only workflow permissions, concurrency cancellation, and check-only quality commands.
3. MySQL 8.4 integration architecture and focused compatibility tests were added while retaining SQLite defaults.
4. Uploads gained quarantine, scanner abstractions, fail-closed production validation, safe logging/errors, and focused malware tests.
5. No separate Phase 5 request is represented in this remediation sequence.
6. CAPTCHA frontend/backend flags, key boundaries, fixed action, exact hostname validation, production validation, and failure behavior were aligned.
7. CSP/security headers were centralized with report-only/enforce modes, nonces, conditional HSTS, and deployment guidance.
8. Security-sensitive and operational reliability tests, a coverage-baseline CI job, queue/scheduler settings, systemd examples, and an operations runbook were added.
9. Three unused upload/AI mock service modules were removed and production imports were restricted.
10. The placeholder README was replaced and this evidence matrix became the current readiness record.
11. The first pilot-readiness batch upgraded `league/commonmark` to 2.9.1, preserved the Guzzle 7.15.2 remediation, fixed the remaining frontend formatting failure, added an independent frontend-test job, and enabled lint/test workflows for `release/**` branches.

## Current gate decision

The repository has a clean PHP and npm dependency audit after the 2026-08-10 remediation. It must not yet be labelled production-ready because the working tree is not a frozen release candidate and MySQL CI/staging, real ClamAV, live CAPTCHA, MongoDB/OpenAI, CSP report review, Ubuntu services/recovery, browser smoke testing, monitoring, and especially backup/restore evidence remain incomplete.

## Manual Ubuntu staging checklist

1. Deploy the exact reviewed commit to HTTPS staging with production-like proxy, filesystem permissions, and `APP_DEBUG=false`.
2. Validate environment configuration without printing secrets; confirm MySQL is non-production and backed up before migration tests.
3. Run fresh MySQL migrations/required seeders in a disposable database, focused compatibility tests, full tests, and reviewed rollback/remigration.
4. Install/configure private ClamAV; test clean, EICAR, timeout, unavailable daemon, malformed response, quarantine cleanup, and failed promotion.
5. Configure real MongoDB/OpenAI staging credentials; exercise parsing/metadata/SDG jobs, failure handling, retries, limits, and relational-record integrity.
6. Configure Turnstile staging keys/domain and `CAPTCHA_ALLOWED_HOSTNAMES`; test valid, mismatched action/hostname, missing, invalid, expired, and provider-unavailable cases.
7. Configure a controlled CSP report collector; run all documented user/role/upload/download/analytics flows in report-only mode and review violations before enforcement.
8. Install the reviewed systemd worker and scheduler units; verify enablement, reboot persistence, graceful in-flight restart, failed jobs, queue drain, scheduler heartbeat, logs, and alerts.
9. Provision encrypted off-host MySQL/file/MongoDB backups; restore into isolated staging and reconcile record/file integrity and access controls.
10. Configure and trigger availability, error, security, queue, scheduler, storage, database, CSP, CAPTCHA, malware, and backup alerts; prove delivery and escalation ownership.
11. Execute the staging smoke-test document for anonymous, public, agency-admin, and super-admin workflows; include MFA, agency isolation, upload/download, archive/restore, and permanent deletion.
12. Record release SHA, commands, timestamps, evidence locations, reviewers, exceptions, rollback decision, and final go/no-go approval.

## Phase 10 command record

Executed locally on 2026-08-04:

| Command | Result |
| ------- | ------ |
| `composer validate` | Passed: `composer.json` is valid. |
| `composer audit --locked` | **Failed:** two advisories affect locked `guzzlehttp/guzzle` 7.15.1. CVE-2026-69246 is high severity and CVE-2026-69245 is medium severity; both report 7.15.2 as the first patched 7.x release. |
| `npm audit --omit=dev` | Passed: zero vulnerabilities. |
| `composer lint:check` | Passed. |
| `npm run format:check` | Passed. |
| `npm run lint:check` | Passed. |
| `npm run types:check` | Passed. The requested `npm run types` does not exist; `types:check` is the repository script. |
| `npm run build` | Passed with Vite 7.3.6: 3,190 modules transformed. The sandboxed attempt failed with `spawn EPERM`; the required esbuild subprocess succeeded outside the sandbox. |
| `php artisan test` | Passed: 377 passed, 3 skipped, 2,154 assertions. The skipped tests do not constitute staging/MySQL proof. |
| `composer ci:check` | Passed: frontend lint/format/types, PHP formatting, and the Laravel suite; 377 passed, 3 skipped, 2,154 assertions. This aggregate does not run dependency audits or the Vite production build. |

`composer audit --locked` initially could not reach Packagist through the sandbox proxy. It was rerun with network access and produced the advisory result above. No dependency was installed or upgraded during Phase 10.

## First pilot-readiness batch record

Executed locally on 2026-08-10:

| Command or change | Result |
| ----------------- | ------ |
| `composer update league/commonmark --with-dependencies` | Upgraded `league/commonmark` 2.8.3 to 2.9.1 and `nette/utils` 4.1.4 to 4.1.5; retained `guzzlehttp/guzzle` 7.15.2. |
| `composer audit --locked` | Passed: no security vulnerability advisories found. |
| `npx prettier --write resources/js/components/upload/reports/ReportDetailsStep.tsx` | Fixed the only frontend formatting failure detected by the 2026-08-10 audit. |
| GitHub Actions hardening | Added an independent `npm run test:frontend` job and enabled lint/test workflows for `release/**` branches. |
| PHP/frontend static gates | Composer validation, Pint, Prettier check, ESLint, and TypeScript all passed. |
| `php artisan test --compact --display-skipped` | Passed: 396 tests, 3 expected skips, and 2,326 assertions. The MySQL-specific collation test remains delegated to MySQL CI. |
| `npm run test:frontend` | Passed: 11 tests across 2 files. |
| `npm run build` | Passed with Vite 7.3.6: 3,193 modules transformed. |
| Disposable SQLite migration/seed | Passed: all migrations and required role, permission, and platform-setting seeders completed. |
| `npm audit --omit=dev` | Passed: zero vulnerabilities. |
