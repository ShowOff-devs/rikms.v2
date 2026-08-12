# Public Access Request Security

## Threats Addressed

The public access-request endpoint is unauthenticated by design, so it is protected with layered controls against spam, automated form fills, duplicate pending submissions, notification flooding, and simultaneous duplicate inserts.

## Rate Limits

The POST route `/api/public/research/{research}/access-requests` uses the named Laravel limiter `public-access-requests`.

Default limits:

- Per IP burst: 5 requests per minute
- Per IP sustained: 20 requests per hour
- Per normalized requester email: 3 requests per hour

Rate-limit keys hash IP addresses and normalized email addresses before storing them in the cache.

## Duplicate Definition

A duplicate public request is the same normalized requester email for the same research record while the previous request is in an active duplicate status.

The current active duplicate status is:

- `pending`

Denied, cancelled, expired, and approved requests do not block a later public submission under the current business policy.

## Database Safeguard

`access_requests.active_duplicate_key` stores a SHA-256 key for active duplicate records and is protected by a unique index. Inactive records store `NULL`, which is compatible with both SQLite pilot environments and MySQL production environments because unique indexes allow multiple `NULL` values.

The application still performs an application-level duplicate check for friendly responses, but the database key is the concurrency guard. Duplicate-key violations are converted to a safe `409 Conflict`.

## Honeypot

The public form includes a visually hidden `website` field. Human users should leave it empty. Populated honeypot submissions are rejected during validation and do not create access-request records, agency notifications, or legitimate audit entries.

## CAPTCHA

Cloudflare Turnstile is mandatory in `pilot`, `staging`, and `production`. It may be disabled only in the `local` and `testing` environments. The frontend and backend use this contract:

```env
PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED=true
VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=turnstile
VITE_CAPTCHA_SITE_KEY=public-site-key
CAPTCHA_SECRET_KEY=
CAPTCHA_VERIFY_TIMEOUT_SECONDS=3
CAPTCHA_ALLOWED_HOSTNAMES=pilot.example.gov.ph
```

The two enabled flags must match. `VITE_CAPTCHA_SITE_KEY` is the sole public site key and must be present during the Vite build and Laravel runtime/config-cache step. `CAPTCHA_SECRET_KEY` is backend-only and must never use a `VITE_` prefix. `CAPTCHA_ALLOWED_HOSTNAMES` is a comma-separated exact allowlist without schemes, ports, paths, or wildcards. Use separate hostnames and widget credentials per environment. Deployed environments reject disabled or mismatched flags, unsupported providers, missing keys, missing or invalid hostnames, and non-positive timeouts at startup.

The browser sends the fixed Turnstile action `public_access_request` and disables submission until Turnstile returns a token. Missing client configuration or an unavailable widget produces a generic unavailable message. Server-side verification uses a short HTTP timeout and fails closed unless Siteverify returns success, that exact action, and an exact allowed hostname. Failures do not expose secrets, tokens, received hostnames, or provider details to users or logs.

## Data Retained

Access-request audit logs retain the resolved Laravel client IP and a sanitized, length-limited user agent. Security metadata stores hashed requester email and hashed IP values. Public API responses do not include IP address, user agent, CAPTCHA data, or duplicate keys.

## Notifications

Agency-admin notifications are queued with `DB::afterCommit`, so validation failures, CAPTCHA failures, duplicate conflicts, and rolled-back inserts do not create notifications. Notification creation checks the access-request id to avoid repeat notifications for the same record.

## Deferred Timing Token

Minimum form-completion timing is not implemented in this change because the existing public page does not have a server-issued form initialization endpoint. If abuse continues, add a short-lived encrypted or signed form token endpoint and reject submissions completed too quickly.

## Testing

Focused verification:

```powershell
php artisan test --filter=Phase7PublicAccessRequestTest
```

Broader verification:

```powershell
php artisan test
npm run types:check
npm run lint:check
npm run build
php artisan route:list --except-vendor
```

## Production Recommendations

- Configure trusted proxies so Laravel resolves client IPs correctly.
- Keep CAPTCHA enabled in every pilot, staging, and production deployment.
- Keep rate limits aligned with observed agency review capacity.
- Monitor logs for `duplicate_pending`, `honeypot_triggered`, `captcha_failed`, and `created` reason codes.
- Consider a WAF or edge-level bot control for sustained attacks.
