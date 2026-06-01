# Phase 3 Write Workflows

## 1. Objective

Phase 3 implements protected write workflows incrementally for the core RIKMS v2 lifecycle. This phase focuses on agency research draft creation/update/submit, protected research file upload metadata, AI/PDF/SDG job dispatch stubs, agency access request decisions, admin research moderation, and research archive/restore.

The relational database remains the source of truth. MongoDB remains limited to future AI/PDF/SDG metadata payloads and flexible secondary data.

## 2. Deferred Items From Phase 2

- Write APIs
- Upload execution
- AI jobs
- Access request decisions
- Moderation actions
- Archive restore
- Full analytics/reporting
- MySQL staging verification
- Public API response refactor
- Removal of temporary frontend mock fallbacks after Sanctum confirmation

## 3. Authentication/Sanctum Confirmation

Real Laravel/Fortify/Sanctum session behavior is confirmed by feature tests for agency and admin users:

- Login through `login.store` creates an authenticated session.
- `GET /api/auth/user` returns the authenticated agency admin.
- `GET /api/auth/user` returns the authenticated super admin.
- Guests receive HTTP 401 on protected agency/admin API writes.
- Authenticated users without the required role receive HTTP 403.
- Agency admins remain scoped to their own agency.
- Super admins remain limited to admin write workflows for Phase 3; agency write Form Requests require `agency_admin`.

Frontend mock fallbacks were not removed in this phase because no frontend write services were connected and browser-level UI verification was not part of this backend-only increment.

## 4. Agency Research Draft APIs

Endpoints:

- `POST /api/agency/research`
- `PUT|PATCH /api/agency/research/{research}`
- `POST /api/agency/research/{research}/submit`

Permissions:

- Only authenticated `agency_admin` users with an agency can create/update/submit through agency write APIs.
- Records are always assigned to the authenticated agency admin's `agency_id`.
- Request-provided `agency_id`, `status`, `created_by`, or ownership fields are not trusted.
- Agency admins cannot update or submit another agency's records.

Validation:

- `StoreAgencyResearchRequest`
- `UpdateAgencyResearchRequest`
- `SubmitAgencyResearchRequest`

Status transitions:

- New records start as `draft`.
- `draft` or `rejected` can be submitted to `submitted`.
- Published/archived records cannot be submitted through agency APIs.

Audit events:

- `research.created`
- `research.updated`
- `research.submitted`

## 5. Upload Metadata and File Workflow

Endpoints:

- `GET /api/agency/research/{research}/files`
- `POST /api/agency/research/{research}/files`
- `DELETE /api/agency/research/{research}/files/{file}`

Rules:

- Only agency admins can upload/delete files for their own agency research.
- Uploads are limited to PDF files by MIME type and extension.
- Max upload size is 20 MB.
- Physical files are stored on the Laravel `local` disk.
- Official file metadata is stored in `research_files`.
- Large extracted text and AI outputs are not stored in the relational database.

Metadata stored relationally:

- `research_id`
- `agency_id`
- `uploaded_by`
- `original_name`
- `stored_name`
- `disk`
- `path`
- `mime_type`
- `extension`
- `size_bytes`
- `checksum`
- `file_type`
- `visibility`
- `access_level`
- `status`
- `uploaded_at`

Audit events:

- `research_file.uploaded`
- `research_file.deleted`

## 6. AI/PDF/SDG Job Preparation

Job stubs added:

- `App\Jobs\ParsePdfDocumentJob`
- `App\Jobs\ExtractResearchMetadataJob`
- `App\Jobs\ClassifyResearchSdgJob`

Dispatch point:

- After successful PDF upload and relational `research_files` creation.

Job identifiers:

- `research_id`
- `file_id`
- `agency_id`
- `uploaded_by_user_id`

MongoDB collections reserved for future job output:

- `pdf_parsing_results`
- `ai_metadata`
- `sdg_classifications`

Deferred:

- Full PDF parser execution
- AI provider integration
- OpenAI prompt handling
- SDG classification implementation
- AI metadata review/apply endpoints

## 7. Access Request Decision APIs

Endpoints:

- `POST /api/agency/access-requests/{accessRequest}/approve`
- `POST /api/agency/access-requests/{accessRequest}/deny`

Permissions:

- Agency admins can decide only pending access requests for research owned by their agency.
- Agency admins cannot decide another agency's access requests.
- Super admin monitoring remains read-only through admin APIs in this phase.

Status transitions:

- `pending` to `approved`
- `pending` to `denied`

Relational fields updated:

- `status`
- `reviewed_by`
- `reviewed_at`
- `review_notes`

Audit events:

- `access_request.approved`
- `access_request.denied`

Notifications:

- Created for approved/denied decisions using the Phase 1 `notifications` table.
- `expires_at` is accepted for approve requests and stored in notification/audit metadata only because no relational `access_requests.expires_at` column exists yet.

## 8. Admin Research Moderation APIs

Endpoints:

- `POST /api/admin/research/{research}/approve`
- `POST /api/admin/research/{research}/reject`
- `POST /api/admin/research/{research}/publish`
- `POST /api/admin/research/{research}/return`
- `POST /api/admin/research/{research}/archive`
- `POST /api/admin/research/{research}/restore`

Permissions:

- Only authenticated `super_admin` users can use these admin write endpoints.

Status transitions:

- `submitted` or `under_review` to `approved`
- `submitted` or `under_review` to `rejected`
- `approved` to `published`
- `rejected` or `under_review` to `draft`
- `published`, `approved`, or `rejected` to `archived`
- `archived` to previous status where archive metadata exists, otherwise `published`

Relational writes:

- Official `research.status` is updated in SQLite/MySQL.
- `research_approvals` records are created for approve/reject/publish/return actions.
- `archive_records` records are created/updated for archive/restore.

Audit events:

- `research.approved`
- `research.rejected`
- `research.published`
- `research.returned`
- `research.archived`
- `research.restored`

Notifications:

- Agency notifications are created for moderation actions where the notification foundation exists.

## 9. Archive/Restore Flow

Implemented for research records only:

- Admin archive stores `archived_at`, `archived_by`, `archive_reason`, and official status `archived`.
- Admin archive creates an `archive_records` row with `previous_status`.
- Admin restore clears archive fields, sets `restored_at`/`restored_by`, restores the previous status, and marks the archive record restored.
- Agency research lists continue excluding archived records by default through the Phase 2 read query filter.

Deferred:

- Archive/restore for users
- Archive/restore for agencies
- Archive/restore for access requests
- Archive retention policy
- Archive listing UI/API

## 10. Analytics/Reporting Preparation

No new analytics/reporting endpoints were added in Phase 3. Existing Phase 2 dashboard counts remain available.

Deferred:

- CSV exports
- Report builders
- AI analytics
- SDG intelligence dashboards
- Scheduled analytics cache jobs

## 11. Public API Response Refactor

No public API response refactor was performed in Phase 3. Public portal response shapes remain unchanged to avoid breaking existing pages/tests.

Aligned in Phase 3:

- New agency write APIs
- New access request decision APIs
- New admin moderation APIs

Deferred:

- `PublicResearchController`
- `PublicAgencyController`
- Local-only MongoDB test route

## 12. Frontend Mock Fallback Removal

Removed:

- None.

Retained:

- Agency research repository fallback data
- Upload/smart upload mock services
- AI metadata simulation
- Access request UI mock flows
- Admin moderation mock services
- Archive mock services
- Analytics/reporting mocks
- Settings/notifications mocks not yet connected to complete write APIs

Reason:

- Backend Sanctum/session behavior is confirmed by tests, but frontend write services were not connected or browser-verified in this phase.

## 13. Policies and Authorization

Policies added:

- `ResearchPolicy`
- `ResearchFilePolicy`
- `AccessRequestPolicy`
- `ResearchApprovalPolicy`
- `ArchivePolicy`

Authorization rules:

- Agency admins can create and manage only their own agency research drafts.
- Agency admins cannot manage another agency's research.
- Agency admins can upload/delete files only for own agency research.
- Agency admins can decide only pending access requests for own agency research.
- Super admins can perform admin moderation and research restore actions.
- Guests cannot access protected writes.

## 14. Form Requests and Validation

Agency Form Requests:

- `StoreAgencyResearchRequest`
- `UpdateAgencyResearchRequest`
- `SubmitAgencyResearchRequest`
- `StoreResearchFileRequest`
- `DeleteResearchFileRequest`
- `ApproveAccessRequestRequest`
- `DenyAccessRequestRequest`

Admin Form Requests:

- `ApproveResearchRequest`
- `RejectResearchRequest`
- `PublishResearchRequest`
- `ReturnResearchRequest`
- `ArchiveResearchRequest`
- `RestoreResearchRequest`

Validation covers:

- Required title
- Max lengths
- Authors/keywords/SDG arrays
- Publication year range
- Access levels
- Embargo date
- URLs
- PDF MIME/type/size
- Decision notes
- Moderation notes
- Archive/restore notes

## 15. Transactions and Audit Logging

Transactions wrap:

- Research draft creation
- Research draft update
- Research submit
- Research file metadata creation
- Research file deletion metadata update
- Access request approve/deny
- Admin moderation actions
- Archive/restore

Audit helper added:

- `App\Support\AuditLogger`

Audit logging captures:

- `user_id`
- `agency_id`
- `event`
- `auditable_type`
- `auditable_id`
- `old_values`
- `new_values`
- `metadata`
- `ip_address`
- `user_agent`

Audit logging failures are logged and do not break the main workflow.

## 16. MySQL Staging Verification

MySQL staging verification was not completed because no MySQL staging database is configured in the local environment.

SQLite status:

- SQLite pilot remains supported.
- Existing migrations are all applied.
- Full test suite passes on SQLite.

Pending MySQL checklist:

1. Configure `DB_CONNECTION=mysql`.
2. Configure staging database credentials.
3. Run migrations and seeders on staging.
4. Run `php artisan test`.
5. Verify JSON columns.
6. Verify foreign keys and indexes.
7. Verify rollback order where practical.
8. Verify upload metadata writes.
9. Verify queue job payload serialization.

## 17. Tests Added

Added `tests/Feature/Phase3WriteWorkflowsTest.php` covering:

- Guest cannot use protected write endpoints.
- Agency login session can call `/api/auth/user`.
- Admin login session can call `/api/auth/user`.
- Authenticated non-agency write user receives 403.
- Agency admin can create, update, and submit own draft research.
- Agency admin cannot write another agency's research.
- Invalid agency submit transition fails.
- Agency admin can upload valid PDF.
- Upload creates relational file metadata.
- Upload dispatches PDF/AI/SDG jobs.
- Invalid upload file type is rejected.
- Cross-agency upload is forbidden.
- Agency admin can approve own agency access request.
- Agency admin can deny own agency access request.
- Cross-agency access request decision is forbidden.
- Super admin can approve and publish research.
- Invalid moderation transition fails.
- Moderation creates audit logs, approvals, and notifications.
- Admin can archive and restore research.
- Archived research is excluded from agency lists.

## 18. Commands Run and Results

- `php artisan route:list`: passed. Shows 119 routes including new agency research writes, file writes, access request decisions, and admin moderation/archive routes.
- `php artisan route:list --path=api`: passed. Shows 40 API routes during implementation.
- `php artisan migrate:status`: passed. All 22 migrations are marked `Ran`.
- `php artisan migrate`: passed. Nothing to migrate.
- `php artisan test --filter=Phase3WriteWorkflowsTest`: passed, 12 tests and 67 assertions.
- `php artisan test --filter=ProtectedApiRbacTest`: passed, 9 tests and 37 assertions.
- `vendor/bin/pint ...`: passed after formatting touched PHP files.
- `php artisan test`: passed, 83 tests and 340 assertions.
- `php artisan queue:failed`: passed. No failed jobs found.
- `php artisan queue:work --once`: passed with no output; no blocking queue work remained.
- `composer test`: passed Pint check and all tests, 83 tests and 340 assertions. Composer still prints the existing Git safe-directory ownership warning after success.

Frontend commands were not run because no frontend services were changed.

## 19. Issues Deferred to Phase 4

- Connect frontend agency research create/update/submit services to real APIs.
- Connect frontend upload flow to `POST /api/agency/research/{research}/files`.
- Remove frontend mock fallbacks only after browser verification of real authenticated flows.
- Implement AI/PDF/SDG job handlers and MongoDB writes.
- Add AI suggestions read/apply endpoints.
- Add `access_requests.expires_at` if approval expiry becomes official source-of-truth state.
- Expand admin moderation with explicit under-review assignment if needed.
- Build archive list and retention APIs.
- Implement reporting/export endpoints.
- Verify complete migration/test flow on MySQL staging.
- Refactor public APIs to the standard response convention safely.

## 20. Recommended Next Step

Recommended Phase 4 task prompt:

Connect the Phase 3 protected write APIs to the Inertia/React agency and admin portals incrementally. Start with agency research draft create/update/submit and PDF upload, then access request approve/deny and admin research moderation. Remove mock fallbacks only after each frontend service has real Sanctum session coverage, feature tests or browser verification, and passing typecheck/build. Keep MongoDB limited to AI/PDF/SDG metadata and continue preserving the relational database as the source of truth.
