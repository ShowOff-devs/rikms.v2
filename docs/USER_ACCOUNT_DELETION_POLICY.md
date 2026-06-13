# User Account Deletion Policy

## Product Decision

Normal user deletion in RIKMS uses soft deletion and account deactivation. Standard self-service account deletion must not hard-delete the user row from the `users` table.

## Reason

RIKMS is an institutional research management system. User accounts may be referenced by research records, uploaded files, approval history, access request decisions, moderation actions, notifications, audit logs, security events, archive records, and role assignments.

Soft deletion preserves research ownership, approval history, access decisions, security events, and audit trails while disabling account access.

## Normal Deletion Behavior

When a user deletes their own account, RIKMS:

- validates the current password through the existing profile deletion request;
- sets the user status to `archived`;
- sets `archived_at`, `archived_by`, and `archive_reason`;
- sets `deleted_at` through Laravel `SoftDeletes`;
- revokes database-backed sessions for that user;
- revokes Sanctum personal access tokens when the user model exposes token support;
- invalidates the current session and regenerates the CSRF token;
- records the `user.account_deleted` audit event;
- prevents future login because soft-deleted and non-active users are rejected by authentication;
- excludes the account from normal active-user Eloquent queries.

Archived users can be retrieved only through explicit archive-aware queries such as `User::withTrashed()`, `User::onlyTrashed()`, or the admin archive user endpoint.

## Restoration

User restoration is supported through the existing admin archive workflow. Only Super Admin routes expose restore behavior. Restoration clears `deleted_at`, clears archive fields, sets status back to `active`, restores valid agency/role associations where applicable, and records an admin restore audit event.

## Permanent Deletion

Permanent deletion with `forceDelete()` is not part of the standard account deletion workflow.

If permanent deletion is ever introduced, it must be separately named, restricted to Super Admins with a dedicated permission, blocked when required historical relationships exist, strongly confirmed, reviewed for data retention/privacy requirements, and fully audited.

## Testing

Tests should expect normal account deletion to soft-delete and archive the user, not remove the database row. Use `assertSoftDeleted()` for deletion checks and `User::withTrashed()` when retrieving a deleted account for assertions.

Current coverage verifies that the deleted row remains available for audit/history, `deleted_at` and archived status fields are set, sessions are revoked, the user is logged out, future login fails, protected API access rejects inactive/archived/deleted users, related research and audit records remain, normal user lists exclude the account, and archive user lists include it.
