# Platform Settings Enforcement

This document records the RIKMS v2 platform setting registry, runtime enforcement points, cache behavior, and remaining deferred controls.

## Architecture

Platform settings are defined in `config/platform_settings.php` and read through `App\Services\PlatformSettingsService`.

The service provides typed accessors, safe defaults, malformed-value fallback, validation, serialization, and cache invalidation. Runtime code should not query `PlatformSetting` directly for behavior decisions.

Settings are cached under `rikms.platform_settings` for 300 seconds and are invalidated after successful admin updates and seeding. Queue jobs read through the service at handle time so normal setting changes do not require worker restarts.

## Precedence

Deployment security floors override database settings where configured:

- `PUBLIC_ACCESS_REQUESTS_ENABLED=false` disables public access requests even if `access_requests.enabled=true`.
- `RIKMS_FORCE_SUPER_ADMIN_MFA=true` requires Super Admin MFA even if `security.require_mfa_super_admins=false`.
- PHP and web-server upload limits still cap `uploads.max_file_size_mb`; the API reports the effective value.

## Enforcement Matrix

| Setting | Type | Default | Status | Runtime effect | Enforcement point | Restart |
| --- | --- | ---: | --- | --- | --- | --- |
| `site.name` | string | RIKMS v2 | Informational | Display metadata | Admin API/frontend | No |
| `site.short_name` | string | RIKMS | Informational | Display metadata | Admin API/frontend | No |
| `site.default_language` | string | English | Informational | No runtime subsystem yet | Deferred UI label | No |
| `site.timezone` | string | Asia/Manila | Informational | Server timezone remains deployment-managed | Deferred UI label | Deployment |
| `site.logo_url` | string | null | Informational | Uploaded logo URL | Logo upload + settings save | No |
| `uploads.max_file_size_mb` | integer | 25 | Active | Caps PDF upload validation, limited by PHP | `StoreResearchFileRequest`, `UploadLimitService` | No |
| `uploads.allowed_file_types` | json | PDF | Active | Backend accepts PDF only | `StoreResearchFileRequest` | No |
| `research.default_status` | string | draft | Deferred | Not applied to research creation yet | Marked not enforced | No |
| `research.require_authors` | boolean | true | Deferred | Not applied to validation yet | Marked not enforced | No |
| `research.require_abstract` | boolean | true | Deferred | Not applied to validation yet | Marked not enforced | No |
| `research.require_keywords` | boolean | false | Deferred | Not applied to validation yet | Marked not enforced | No |
| `research.require_publication_year` | boolean | true | Deferred | Not applied to validation yet | Marked not enforced | No |
| `access_requests.enabled` | boolean | true | Active | Blocks public access request UI and API | Public settings endpoint, `PublicAccessRequestController` | No |
| `access_requests.default_policy` | string | request-access | Deferred | Not applied to research creation yet | Marked not enforced | No |
| `access_requests.embargo_override_enabled` | boolean | false | Deferred | Not applied globally yet | Marked not enforced | No |
| `access_requests.embargo_duration_months` | integer | 6 | Deferred | Not applied globally yet | Marked not enforced | No |
| `security.require_mfa_super_admins` | boolean | true | Active | Requires Super Admin 2FA unless deployment permits disabling | `EnsureSuperAdminHasTwoFactor` | No |
| `security.login_alerts_enabled` | boolean | true | Deferred | Not applied globally yet | Marked not enforced | No |
| `security.failed_login_threshold` | integer | 5 | Deployment-managed | Fortify/Laravel throttling is not DB-controlled | Marked deployment-managed | Deployment |
| `security.lockout_duration_minutes` | integer | 15 | Deployment-managed | Fortify/Laravel throttling is not DB-controlled | Marked deployment-managed | Deployment |
| `security.session_timeout_minutes` | integer | 60 | Active | Default session timeout when user has no preference | `EnforceUserSessionTimeout` | No |
| `notifications.system_enabled` | boolean | true | Deferred | User preference logic remains primary | Marked not enforced | No |
| `notifications.email_enabled` | boolean | false | Deployment-managed | Mail transport is env/infrastructure-controlled | Marked deployment-managed | Deployment |
| `notifications.security_alerts_enabled` | boolean | true | Deferred | Not applied globally yet | Marked not enforced | No |
| `notifications.access_request_submitted` | boolean | true | Deferred | Not applied globally yet | Marked not enforced | No |
| `notifications.research_published` | boolean | true | Deferred | Not applied globally yet | Marked not enforced | No |
| `notifications.weekly_activity_digest` | boolean | false | Deferred | No scheduled digest implemented | Marked not enforced | No |
| `maintenance.enabled` | boolean | false | Active | Blocks normal web/API traffic with recovery allowlist | `EnforcePlatformMaintenanceMode` | No |
| `maintenance.notice_text` | string | RIKMS is temporarily unavailable... | Informational | Maintenance response text | `EnforcePlatformMaintenanceMode` | No |
| `backup.last_backup_at` | string | Not configured | Informational | Display only | Admin UI | No |
| `backup.frequency` | string | Daily at 03:00 AM | Informational | Actual backups are deployment-managed | Admin UI | Deployment |
| `backup.status` | string | idle | Informational | Display only | Admin UI | No |
| `ai.processing.enabled` | boolean | false | Active | Prevents new AI dispatch, manual reruns, and queued processing | Upload controller, AI rerun endpoint, AI jobs | No |

## Security Notes

No secrets are defined in the registry. API keys, mail credentials, database credentials, queue configuration, and storage credentials remain environment-managed.

High-impact setting changes are audited through `AuditLogger` in the platform settings controller. Audit entries store setting keys and redacted encrypted values.

The maintenance mode implementation is application-level rather than `php artisan down`, so Super Admin login, MFA setup, platform settings API, static assets, and `/up` remain reachable for recovery.

## Manual Verification

Public access requests:

1. Set `PUBLIC_ACCESS_REQUESTS_ENABLED=true`.
2. In Super Admin settings, enable access requests and save.
3. Browse to a restricted public research record and submit a request.
4. Disable access requests and save.
5. Refresh the research page and confirm the request button is hidden.
6. Submit directly with PowerShell and confirm `503`:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/public/research/{slug}/access-requests -ContentType 'application/json' -Body '{"requester_name":"Test User","requester_email":"test@example.com","requester_purpose":"A sufficiently detailed access request purpose."}'
```

Upload limit:

1. Set maximum upload size to `1` MB and save.
2. Upload a small PDF under 1 MB and confirm success.
3. Upload a PDF over 1 MB and confirm validation failure.
4. Restore the normal value.
5. Compare the admin API `effective_value` with PHP limits:

```powershell
php -r "echo ini_get('upload_max_filesize').PHP_EOL.ini_get('post_max_size').PHP_EOL;"
```

AI processing:

1. Enable AI processing and upload a PDF; confirm `ParsePdfDocumentJob`, `ExtractResearchMetadataJob`, and `ClassifyResearchSdgJob` are dispatched.
2. Disable AI processing and upload a PDF; confirm the file is stored and AI metadata status is `skipped`.
3. POST to `/api/agency/research/{id}/ai-results/process` and confirm `503` with `AI_PROCESSING_DISABLED`.
4. Confirm no OpenAI provider request occurs.

MFA:

1. Set `RIKMS_FORCE_SUPER_ADMIN_MFA=false`.
2. Disable `security.require_mfa_super_admins`; confirm a Super Admin without 2FA can access admin APIs.
3. Enable the setting; confirm the same user receives `403` JSON or a two-factor setup redirect.
4. Set `RIKMS_FORCE_SUPER_ADMIN_MFA=true`; confirm the database setting cannot bypass MFA.

Maintenance mode:

1. Enable maintenance mode and save a message.
2. Confirm `/browse-research` returns a maintenance page with status `503`.
3. Confirm `/api/public/research` returns JSON `503` with code `PLATFORM_MAINTENANCE`.
4. Confirm `/admin/login`, `/admin/platform-settings`, `/api/admin/platform-settings`, and `/up` remain reachable as recovery routes.
5. Disable maintenance mode and confirm normal access returns.

## Verification Commands

Focused tests:

```powershell
php artisan test --filter=PlatformSettingsEnforcementTest
php artisan test --filter=SecurityRemediationPhase85Test
```

Broader checks:

```powershell
vendor\bin\pint --test
php artisan test
npm run types:check
npm run lint:check
npm run build
php artisan route:list --except-vendor
```

Do not run `php artisan migrate:fresh --seed` against development, staging, or production data.

## Remaining Risks

Infrastructure upload limits outside PHP, such as Nginx `client_max_body_size` or proxy request caps, cannot be detected automatically and must be documented during deployment.

Deferred settings are registered and labeled but not yet wired into runtime behavior. They should not be described as active controls until corresponding validation, notification, scheduling, or workflow code is implemented.
