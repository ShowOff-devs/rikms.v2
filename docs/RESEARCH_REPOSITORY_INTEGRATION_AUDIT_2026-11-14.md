# Research Repository Integration, Security, and Regression Audit

Date: 2026-11-14 (Asia/Shanghai)  
Branch: `release/pilot-rc1`  
Baseline commit: `611fa2bfaf29c6b3b76e18e0721a391d4df2589d`

## Scope and safety baseline

The audit covered the Research Study, Terminal Report, and Project Accomplishment Report editors; their API persistence; report relationships; private files; malware scanning; RBAC; moderation; AI degradation behavior; and optimistic concurrency.

The pre-existing working tree was preserved. Before this audit it contained changes in `ResearchViewModal.tsx`, `ReportEditSections.tsx`, `FinancialSummaryCard.tsx`, and an untracked `resources/js/components/repository/view/` directory. No branch switch, commit, push, deployment, destructive migration, real-record mutation, or real upload deletion was performed.

Database-backed tests used `.env.testing`: `APP_ENV=testing`, in-memory SQLite, array cache/session, synchronous queue, and isolated test storage. The configured development database and MongoDB collections were not modified.

## Architecture and traceability

`EditDocumentPage.tsx` routes the canonical API `document_type` to a dedicated entry point. Research Study continues through `LegacyDocumentEditPage`; Terminal Report and PAR use `ReportEditPage` with different document types and PAR multiple-highlight support. `ResearchResource` derives the canonical type from active file roles first and category second. The frontend maps editor state in `repository-service.ts` and `report-upload-service.ts`; `UpdateAgencyResearchRequest` validates it; `AgencyResearchWriteController` persists scalar and related data inside transactions; Eloquent models and API resources hydrate the response.

| UI area | Frontend state | Request field | Validator / enforcement | Persistence | API response | Coverage |
|---|---|---|---|---|---|---|
| Research title, abstract, authors | `RepositoryUpdatePayload` | `title`, `abstract`, `authors` | `UpdateAgencyResearchRequest` | `research.title`, `abstract`, JSON `authors` | `ResearchResource` | full backend suite; editor routing tests |
| Year and classification | `year`, `category` | `publication_year`, `category` | year range and string rules | `research.publication_year`, `category` | `ResearchResource` | repository and report workflow tests |
| Keywords and SDGs | `keywords`, `sdgs` / `selectedSDGs` | `keywords`, `sdg_tags` | bounded arrays | JSON `research.keywords`, `sdgs` | `ResearchResource` | workflow mapping and public metadata tests |
| Institution / publisher | `publisher` | not writable | derived/read-only agency identity | `research.agency_id` relationship | `AgencyResource` | agency-scope feature tests |
| External/access settings | `accessType`, `externalLink`, `embargoUntil` | `access_level`, `external_url`, `embargo_until` | enum, URL, future embargo | `research` scalar fields | `ResearchResource` | protected/public API suites |
| Reporting period and project dates | `details.*` | `report_details.*` | report detail rules plus date ordering | `research_report_details` | `ResearchReportDetailResource` | `TerminalReportWizardWorkflowTest` |
| Official physical accomplishment | `physicalAccomplishmentPercent` | `report_details.physical_accomplishment_percent` | numeric 0–100 | report detail decimal | detail resource | report workflow and calculation tests |
| Performance rows | `performanceProjects[]` | `performance_items[]` | bounded nested rules; nested ownership check | `research_performance_items` | item resource | identity, omission, calculation, stale-write tests |
| PAP and beneficiaries | `papClassification` | report detail PAP fields | bounded arrays and sector enum | report detail JSON/text fields | detail resource | report persistence tests |
| Financials | `financials` | report detail budget fields | nullable numeric, non-negative | report detail decimals | detail resource | zero/null/aggregate tests |
| Primary and additional highlights | `highlights`, `additionalHighlights` | `report_highlights[]` | bounded nested rules; nested ownership check | `research_report_highlights` | highlight resource | PAR multi-highlight and new hydration regression test |
| Highlight attachments | `supportingFiles[]` | multipart `file` | PDF/PNG/JPEG MIME and envelope, size/quota, scanner, parent ownership | private `research_files.report_highlight_id` | file resource nested in highlight | malware, count, duplicate, scope, workflow-lock tests |
| Main PDF | `details.uploadedFile*` / repository file | multipart `file`, canonical `file_type` | PDF MIME/envelope, quota, duplicate, scanner, policy | versioned private `research_files` rows | file resource | upload readiness, replacement/history, download tests |
| Public metadata | `selectedPublicMetadata` | `public_metadata_fields`, `public_metadata` | accepted-key allow-list | JSON research fields | research/public resources | visibility and report workflow tests |
| Concurrency token | `serverUpdatedAt`, `serverDraftVersion` | `expected_updated_at`, `expected_draft_version` | date/integer | locked research/detail row; incremented `draft_version` | `updated_at`, detail version | stale-write and migration tests |

No circular editor imports were found. Partial scalar updates are preserved through `sometimes` validation and `researchPayload()` key selection. Related arrays are replacement collections when explicitly present; omitted collections remain untouched. Row IDs are checked through the parent relationship before updates.

## Implementation status

| Document type | Routing | Hydration/editing | Persistence | Files | Authorization | Moderation |
|---|---|---|---|---|---|---|
| Research Study | Verified | Existing editor preserved | Verified by mapping and full suite | Private/versioned flow verified | Agency policy and scope verified | Draft/revision/published locks verified |
| Terminal Report | Verified | Shared report workflow verified | Detail, performance, finance, PAP, SDG, highlight persistence verified | Canonical Terminal Report PDF and supporting files verified | Agency/nested ownership and workflow locks verified | Submission/revision/history regression suites pass |
| Project Accomplishment Report | Verified | Dedicated entry point and multiple highlights verified | Shared persistence with PAR identity verified | Canonical PAR PDF and highlight files verified | Same server-side controls verified | Shared moderation lifecycle verified |

## Findings and fixes

### High — secondary PAR highlights could be lost on first save (fixed)

- Root cause: the initial `ReportEditPage` load hydrated the primary highlight but did not initialize `additionalHighlights`; the replacement payload could therefore omit persisted secondary highlights.
- Impact: an immediate save could delete secondary highlight rows and archive their associated files.
- Fix: centralized extraction in `reportAdditionalHighlightsFromRecord()` and initialized additional highlights on both initial load and reload.
- Verification: added a frontend regression test that retains every highlight after the primary; full frontend suite and production build pass.

### High — files could be deleted from immutable workflow states (fixed)

- Root cause: `ResearchFilePolicy::delete()` checked file agency ownership but not the parent research status or archive state.
- Impact: a same-agency administrator could directly call the API to archive a file belonging to a submitted or published record.
- Fix: require a matching parent agency, an unarchived parent, and `draft` or `rejected` workflow state.
- Verification: added a feature test proving supporting-file deletion is forbidden for both submitted and published reports while the file remains active.

### Low — repository-wide Prettier baseline is not clean (open, pre-existing)

`npm run format:check` reports seven files unrelated to the fixes. The shared report page touched by this audit was formatted, but no repository-wide bulk formatting was applied because it would create unrelated churn in a working tree that already contains user changes. ESLint, TypeScript, Pint, and `git diff --check` pass.

## Security, file, AI, workflow, and concurrency assessment

- Policies and controller checks enforce agency ownership for reads, edits, uploads, nested performance/highlight IDs, downloads, and removals.
- Main and supporting files use private storage, quarantine, content-envelope validation, quotas, duplicate checks, fail-closed malware scanning, transactional metadata commits, cleanup after failures, and inactive-file download rejection.
- Main uploads create versioned rows rather than overwriting the prior object. Revision files are copied to independent physical objects.
- AI/PDF/SDG retrieval is asynchronous and gracefully exposes queued, skipped, failed, or absent results. Manual relational metadata remains editable when AI/MongoDB is unavailable; suggestions require explicit UI application.
- Report updates lock the research and detail rows and reject stale `draft_version`/`updated_at` tokens with HTTP 409. Revision uniqueness has a database constraint and transaction locking.
- Moderation transitions use row locks and a transaction for research state, decision, audit, and internal notification records; rollback tests pass.

## Test results

| Command | Result |
|---|---|
| `php artisan test` | 575 passed, 3,444 assertions, 5 MySQL-only cases skipped; no failures |
| `php artisan test tests/Feature/TerminalReportWizardWorkflowTest.php` | 12 passed, 110 assertions after both fixes |
| `npm run test:frontend` | 21 files, 62 tests passed |
| `npm run types:check` | passed |
| `npm run lint:check` | passed |
| `vendor/bin/pint --parallel --test` | passed |
| `npm run build` | passed; 3,224 modules transformed |
| `git diff --check` | passed |
| `npm run format:check` | failed on seven pre-existing formatting targets; see finding above |

## Remaining risks and limitations

- No interactive browser session was executed, so viewport behavior, keyboard traversal, screen-reader output, unsaved-navigation prompts, live session expiry, and browser console cleanliness still require manual acceptance testing.
- Five MySQL-only process/concurrency integration cases were skipped because a confirmed disposable MySQL integration database was not configured. SQLite tests do not prove MySQL deadlock behavior or concurrent process locking.
- No live ClamAV daemon, MongoDB server, OpenAI provider, S3/object store, queue worker, backup restore, or disaster-recovery exercise was performed. Their test doubles and failure paths pass, but operational readiness depends on deployment checks.
- The current working tree contains unrelated user changes; release review must include those changes separately.

## Readiness decision

**CONDITIONAL PASS** — the audited code paths and automated regression suite are healthy after two high-impact fixes, but production readiness cannot be declared until interactive browser acceptance, disposable-MySQL concurrency tests, live infrastructure checks, and the pre-existing formatting baseline are resolved.

## Manual Agency Admin acceptance checklist

1. Open one existing Research Study, Terminal Report, and PAR owned by the test agency. Confirm the canonical editor, title/type, values, active PDF name/size/status, and refresh identity.
2. Change one authorized field in each document, save, reload, and confirm the change while unrelated fields, files, row IDs, and document type remain intact.
3. For Terminal Report, test target/actual combinations 100/80, 100/100, 100/120, zero target, and null values; compare UI calculations with the saved response.
4. Test null, zero, decimal, and over-allocation financial values and an out-of-range as-of date; verify validation/warnings and reload values.
5. For PAR, edit multiple highlights, add one, remove one, reorder them, and verify IDs and each supporting file association after reload. Save an untouched legacy multi-highlight PAR and confirm no highlight disappears.
6. Replace each main PDF with a valid test PDF and confirm the previous version remains in history. Try invalid, oversized, duplicate, and safe malware-test fixtures and confirm the active file is unchanged.
7. Upload valid PDF/PNG/JPEG supporting files; try invalid MIME, empty, oversized, duplicate, sixth-file, and quota-limit cases.
8. Sign in as another agency administrator and confirm detail, edit, download, upload, row/highlight mutation, file removal, archive, and restore attempts are rejected.
9. Submit a draft and confirm metadata/file edits and file removal are blocked. Exercise revision-requested, published revision, archived, restored, and superseded states.
10. Open the same draft in two sessions, save A, then save B and confirm B receives a conflict without overwriting A.
11. Disable or disconnect AI/MongoDB in a safe environment, reload the editor, save manual metadata, and confirm no suggestion is auto-applied.
12. Repeat at desktop and mobile widths using keyboard-only navigation; check labels, focus, overflow, loading/save feedback, network failure, expired session, and browser console output.
