# Content Security Policy deployment

RIKMS centralizes browser security headers in `config/security_headers.php`.

## Environment modes

- `local` and `testing`: `CSP_MODE=off` by default and may be set to `report-only` for development checks.
- `pilot` and `staging`: `CSP_MODE=report-only` is required.
- `production`: `CSP_MODE=enforce` and `CSP_PRODUCTION_VALIDATED=true` are required.

The policy uses per-response nonces for the Blade bootstrap script, bootstrap style, and Vite-generated script tags. It does not allow `unsafe-eval`. Inline style attributes remain temporarily allowed through `style-src-attr 'unsafe-inline'` because the React charts, progress indicators, previews, and dynamic theme components currently generate style attributes. Inline script execution is not generally allowed.

The allowlist covers same-origin Vite assets and APIs, Bunny Fonts, local/data/blob images, and Cloudflare Turnstile scripts, frames, and verification connections. Add origins only after a staging report and a repository or browser trace proves they are required.

## Staging review before enforcement

1. Configure a controlled CSP report collector and set `CSP_REPORT_URI` to its HTTPS endpoint. The collector must restrict access to security/operations staff and apply retention limits because reports can contain page URLs.
2. Deploy with `APP_ENV=staging` and `CSP_MODE=report-only`.
3. Exercise anonymous browsing, Turnstile access requests, agency/admin authentication and MFA, uploads and previews, downloads, analytics charts, exports, settings, and error pages.
4. Review reports by directive, blocked origin, route, browser, and frequency. Correlate each exception with browser network traces and repository code. Do not approve wildcard HTTPS sources.
5. Fix application violations or add the narrowest required scheme/host to `config/security_headers.php`, then repeat the staging exercise until expected workflows produce no unexplained violations.
6. Record the review date, tested release SHA, browsers, routes, approved exceptions, and reviewer. Only then set production `CSP_MODE=enforce` and `CSP_PRODUCTION_VALIDATED=true` during the same release deployment.
7. After enforcement, continue collecting and reviewing reports where the production reporting endpoint is approved. Roll back to the reviewed release if enforcement blocks a critical workflow; do not weaken the policy globally as an emergency workaround.

HSTS is sent only for HTTPS requests when `APP_ENV=production`. The application also sends MIME-sniffing, strict referrer, frame-denial, and restricted browser-feature headers in every environment.
