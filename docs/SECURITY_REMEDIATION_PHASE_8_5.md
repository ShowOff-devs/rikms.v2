# Phase 8.5 Security Remediation and Production Hardening

## 1. Objective

Phase 8.5 remediates critical security and production-hardening findings before Phase 9 feature work. The work keeps the relational database as the RIKMS source of truth and keeps MongoDB limited to secondary AI/PDF/SDG processing metadata.

## 2. Critical Findings Addressed

- Removed the committed MongoDB URI fallback from `config/database.php`.
- Cleared the ignored local `.env` `MONGODB_URI` value in this workspace.
- Verified `.env.example` contains only a localhost-style placeholder.
- Confirmed `.gitignore` excludes `.env`, `.env.backup`, and `.env.production`.
- Patched the Composer advisories for `symfony/http-foundation`, `symfony/routing`, and `symfony/polyfill-intl-idn`.
- Disabled public Fortify registration.

## 3. MongoDB Credential Rotation Required

A MongoDB credential was found in committed config defaults. The hardcoded default has been removed from `config/database.php`, and `MONGODB_URI` is now read from the environment only.

Manual rotation is still required:

- Rotate the MongoDB Atlas/database user password or revoke the exposed URI immediately.
- Create a new MongoDB user/password if needed.
- Update local `.env` manually with the new URI.
- Update staging and production environment variables manually.
- Never commit `.env`.
- Verify `.gitignore` continues to include `.env`.
- Search Git history if this repository has already been pushed.
- If pushed, treat the credential as compromised even after removal from the latest commit.

No credential is printed in this document.

## 4. Composer Security Audit

Before remediation, `composer audit` reported 3 advisories:

- `symfony/http-foundation` CVE-2026-48736
- `symfony/routing` CVE-2026-48784
- `symfony/polyfill-intl-idn` CVE-2026-46644

Updated packages:

- `symfony/http-foundation`: `v7.4.8` to `v7.4.13`
- `symfony/routing`: `v7.4.12` to `v7.4.13`
- `symfony/polyfill-intl-idn`: `v1.37.0` to `v1.38.1`
- Dependency resolution also updated `symfony/polyfill-intl-normalizer`, `symfony/polyfill-mbstring`, and `symfony/polyfill-php83`.

After remediation, `composer audit` reports no security vulnerability advisories found.

## 5. Public Registration Decision

Open public registration is disabled. RIKMS accounts should be created through seeders or authorized administrative workflows until a formal public-account approval flow exists.

Implemented behavior:

- Removed `Features::registration()` from Fortify features.
- `/register` and `POST /register` are unavailable.
- Public access request submission remains available without registration.
- The stale registration page no longer posts to a removed route helper.

## 6. AI/PDF/SDG Jobs

Minimal persistence was implemented for queued AI/PDF/SDG jobs.

- `ParsePdfDocumentJob` writes `pdf_parsing_results` MongoDB records when `MONGODB_URI` is configured.
- `ExtractResearchMetadataJob` writes `ai_metadata` MongoDB records with `skipped` status when no AI provider is configured.
- `ClassifyResearchSdgJob` writes `sdg_classifications` MongoDB records with `skipped` status when no SDG provider is configured.
- If `MONGODB_URI` is missing, jobs skip safely and update non-authoritative relational file metadata with pipeline status.
- Uploads do not fail when secondary AI/PDF/SDG processing is unavailable.
- Official research metadata remains relational and is not sourced from MongoDB.

## 7. Mock/Local Fallback Remediation

Removed or hardened:

- Agency access request listing no longer returns mock data when the protected API fails.
- Agency archive listing and restore no longer fall back to local/mock records.
- Agency archive permanent-delete now reports that production deletion is not configured instead of pretending success.
- Agency archive activity no longer reads local mock/localStorage records.
- Admin archive listing and restore no longer silently fall back to mock records.
- Admin archive permanent-delete and export now report not configured instead of pretending success.
- Agency portal auth no longer trusts localStorage/sessionStorage as login state.
- Agency password reset now calls the real Fortify password reset endpoint instead of a mocked delay/message.

Retained and explicitly non-authoritative:

- Local UI preferences such as sidebar and appearance still use browser storage.
- Other mock-backed areas outside the targeted official workflows remain future hardening candidates and are listed as remaining risks.

## 8. Backup and Logo Upload Honesty

Backup is no longer represented as a completed real operation. The backup action is disabled/labeled as not configured, and the service throws an explicit configuration error.

Logo upload remains local preview only. Saving a selected logo now fails with an explicit message that protected media storage is not configured; the object URL is not saved as a persisted asset.

Deferred real implementation:

- Add protected media upload/storage endpoint for platform logo assets.
- Add real backup job endpoint integrated with a configured backup system.
- Audit backup job requests/results.
- Surface backup job status from backend job state, not settings-only markers.

## 9. PDF Upload Production Hardening

Current status:

- PDF-only validation is present.
- MIME type validation requires `application/pdf`.
- File size is limited to 20 MB.
- SHA-256 checksum is stored.
- Files are stored on the local private disk for pilot/local use.

Production hardening checklist:

- Add malware scanning.
- Store uploads in quarantine before final acceptance.
- Add async parse failure handling and user-visible retry/error states.
- Verify checksums after storage.
- Move production storage to a safer configured private disk/object store.
- Make max upload size configurable through platform settings.
- Add MIME sniffing beyond extension and browser-provided MIME.
- Audit upload rejection and processing failure events.

## 10. MySQL Staging Verification

Status: pending. No destructive MySQL staging commands were run in this phase.

Checklist:

- Configure `DB_CONNECTION=mysql`.
- Configure `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
- Run `php artisan migrate:fresh --seed` on staging only.
- Run `php artisan test --env=staging`.
- Verify JSON columns.
- Verify indexes.
- Verify foreign keys.
- Verify soft deletes.
- Verify reporting queries.
- Verify RBAC seeders.
- Verify seeded admin accounts.
- Verify uploads metadata.
- Verify archive/restore.
- Verify notifications, audit logs, and security events.

## 11. Tests Added or Updated

Added `tests/Feature/SecurityRemediationPhase85Test.php` covering:

- MongoDB config has no credential fallback.
- Public registration is disabled.
- Public access requests still work without registration.
- AI/PDF/SDG jobs skip safely when MongoDB is not configured.
- PDF upload stores relational metadata and dispatches queued jobs.
- Targeted frontend services no longer contain the audited silent fallback behavior.

Existing registration tests now skip because the Fortify registration feature is intentionally disabled.

## 12. Commands Run and Results

- `composer audit`: before update found 3 advisories.
- `composer update symfony/http-foundation symfony/routing symfony/polyfill-intl-idn --with-dependencies`: completed; patched Symfony packages.
- `composer audit`: passed; no security vulnerability advisories found.
- `php artisan route:list`: passed; no `/register` route; public access-request route remains.
- `php artisan migrate:status`: passed; all migrations were already run.
- `php artisan migrate`: passed; nothing to migrate.
- `php artisan db:seed`: passed.
- `php artisan test tests/Feature/SecurityRemediationPhase85Test.php`: passed; 6 tests, 28 assertions.
- `php artisan test`: passed; 124 passed, 2 skipped, 678 assertions.
- `composer test`: passed after Pint formatting; 124 passed, 2 skipped, 678 assertions.
- `npm run types:check`: passed.
- `npm run lint:check`: passed.
- `npm run build`: initial sandbox run failed with `spawn EPERM`; rerun with permission passed.
- `npm run dev`: initial sandbox/background run failed with `spawn EPERM`; rerun with permission started Vite successfully on `http://localhost:5174` for Herd app URL `http://rikmsv2.test`.

`php artisan serve` was not run because this project uses Laravel Herd.

## 13. Remaining Risks

- MongoDB credential rotation is manual and still pending outside the codebase.
- Git history may still contain the exposed credential if the repository was pushed.
- MongoDB jobs need staging verification against a rotated real MongoDB URI.
- AI provider integration is not implemented; metadata and SDG jobs currently write explicit `skipped` records when provider integration is absent.
- Production backup jobs are not configured.
- Platform logo upload persistence is not configured.
- PDF upload malware scanning/quarantine is not implemented.
- MySQL staging verification is pending.
- Some mock/local patterns outside the targeted official workflows remain and should be audited before production.

## 14. Recommended Phase 9 Task

Proceed to Phase 9 only after the MongoDB credential has been rotated and staging environment variables are updated. The recommended Phase 9 task is to implement production-grade AI/PDF/SDG processing providers, real backup/media-upload endpoints, PDF quarantine/scanning, and MySQL staging verification while preserving relational source-of-truth boundaries.
