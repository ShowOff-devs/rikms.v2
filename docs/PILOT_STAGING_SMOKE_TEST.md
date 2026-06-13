# Pilot Staging Smoke Test

Use the Herd/staging domain. Do not run `php artisan serve`.

## Public Portal

- Landing page loads.
- Browse research loads and searches real published research.
- Research detail opens by slug.
- Research detail opens by numeric ID fallback.
- Public metadata only shows selected public fields.
- Restricted research can receive a public access request.
- Invalid/duplicate public access requests return expected validation messages.

## Agency Admin

- Login succeeds for an active agency admin.
- Wrong agency selection rejects login.
- Dashboard loads real metrics.
- Research draft create/edit/save works.
- PDF upload accepts valid PDFs and rejects invalid files.
- AI processing can be started and degrades gracefully if AI/MongoDB is unavailable.
- Research submission moves through expected status.
- Access request approve/deny works for own agency only.
- Notifications mark read/unread and bulk read.
- Archive and restore work for allowed records.
- Settings update account, password, notification, security, and session preferences.

## Super Admin

- Login succeeds for active Super Admin.
- Super Admin without 2FA is forced to 2FA setup before protected admin pages.
- Dashboard loads real metrics.
- Agencies/users management writes relational records.
- Research moderation approve/reject/return/publish/archive/restore works.
- Access monitoring and audit review actions work.
- RBAC assign/remove/custom role actions work.
- Platform settings update and logo upload work.
- Security event resolve/reopen/acknowledge actions work.
- Archive pages list and restore/delete allowed archived records.
- Analytics/export endpoints work and write audit logs.

## Technical Checks

- Queue worker processes AI/PDF jobs or records skipped/failure state safely.
- MongoDB AI result collections are readable when configured.
- Private downloads require authorization.
- Audit logs are written for admin write actions.
- Notifications are created for upload/access decision flows.
- Browser console has no production errors on primary pages.
- HTTP 401, 403, 404, and 422 responses are correct for guest, wrong role, missing record, and validation cases.

## Result

Not yet executed on a staging environment during this audit.
