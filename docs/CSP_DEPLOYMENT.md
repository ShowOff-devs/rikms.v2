# Content Security Policy deployment

RIKMS centralizes browser security headers in `config/security_headers.php`.

## Environment modes

- `local` and `testing`: `CSP_MODE=off` by default and may be set to `report-only` for development checks.
- `pilot` and `staging`: `CSP_MODE=report-only` is required.
- `production`: `CSP_MODE=enforce` and `CSP_PRODUCTION_VALIDATED=true` are required.

The policy uses per-response nonces for the Blade bootstrap script, bootstrap style, and Vite-generated script tags. It does not allow `unsafe-eval`. Inline style attributes remain temporarily allowed through `style-src-attr 'unsafe-inline'` because the React charts, progress indicators, previews, and dynamic theme components currently generate style attributes. Inline script execution is not generally allowed.

The allowlist covers same-origin Vite assets and APIs, Bunny Fonts, local/data/blob images, and Cloudflare Turnstile scripts, frames, and verification connections. Add origins only after a staging report and a repository or browser trace proves they are required.

## Internal report collector

RIKMS includes a same-origin collector at `POST /api/security/csp-reports`, so a separate collector service or public domain is not required for the pilot. Configure:

```dotenv
CSP_REPORT_URI=/api/security/csp-reports
CSP_REPORT_COLLECTOR_ENABLED=true
CSP_REPORT_MAX_PAYLOAD_BYTES=65536
CSP_REPORT_MAX_REPORTS_PER_REQUEST=20
CSP_REPORT_LIMIT_PER_MINUTE=120
CSP_REPORT_RETENTION_DAYS=30
```

The endpoint accepts legacy `application/csp-report`, modern `application/reports+json`, and JSON payloads. It is unauthenticated because browsers submit violations without an application session, but it has an independent IP rate limit, request/report count limits, and a strict content-type allowlist.

Reports are normalized and aggregated in `csp_violation_reports`. Query strings, URL fragments, script samples, raw policies, IP addresses, and full user-agent values are not stored. Blocked URLs retain only their origin; document and source URLs retain origin and path. The raw policy is represented only by a SHA-256 hash, and the user agent is reduced to a coarse browser family.

Authorized security administrators can review the sanitized aggregates at `GET /api/admin/security/csp-reports`, filtering with `directive`, `browser`, `document`, and `per_page`. The response deliberately omits fingerprints and policy hashes. `csp:prune-reports` removes expired aggregates and is scheduled daily at 02:15; the scheduler must remain running for retention to execute.

## Staging review before enforcement

1. Run migrations, enable the internal collector, and set `CSP_REPORT_URI=/api/security/csp-reports`. If an approved external collector replaces it, preserve equivalent access restrictions, privacy minimization, rate limits, and retention.
2. Deploy with `APP_ENV=staging` and `CSP_MODE=report-only`.
3. Exercise anonymous browsing, Turnstile access requests, agency/admin authentication and MFA, uploads and previews, downloads, analytics charts, exports, settings, and error pages.
4. Review reports by directive, blocked origin, route, browser, and frequency. Correlate each exception with browser network traces and repository code. Do not approve wildcard HTTPS sources.
5. Fix application violations or add the narrowest required scheme/host to `config/security_headers.php`, then repeat the staging exercise until expected workflows produce no unexplained violations.
6. Record the review date, tested release SHA, browsers, routes, approved exceptions, and reviewer. Only then set production `CSP_MODE=enforce` and `CSP_PRODUCTION_VALIDATED=true` during the same release deployment.
7. After enforcement, continue collecting and reviewing reports where the production reporting endpoint is approved. Roll back to the reviewed release if enforcement blocks a critical workflow; do not weaken the policy globally as an emergency workaround.

HSTS is sent only for HTTPS requests when `APP_ENV=production`. The application also sends MIME-sniffing, strict referrer, frame-denial, and restricted browser-feature headers in every environment.
