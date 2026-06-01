# Phase 4 Frontend/API Integration

## 1. Objective

Phase 4 connects protected Phase 2/3 APIs to the Inertia/React agency and super admin portals incrementally. The focus is real Laravel/Fortify/Sanctum session-backed API calls for write workflows, while retaining unverified mock fallbacks until browser verification is complete.

## 2. Previous Phase Dependencies

APIs used from Phase 2/3:

- `GET /api/auth/user`
- `GET /api/agency/research`
- `GET /api/agency/research/{research}`
- `POST /api/agency/research`
- `PATCH /api/agency/research/{research}`
- `POST /api/agency/research/{research}/submit`
- `POST /api/agency/research/{research}/files`
- `GET /api/agency/access-requests`
- `POST /api/agency/access-requests/{accessRequest}/approve`
- `POST /api/agency/access-requests/{accessRequest}/deny`
- `GET /api/admin/research`
- `POST /api/admin/research/{research}/approve`
- `POST /api/admin/research/{research}/reject`
- `POST /api/admin/research/{research}/publish`
- `POST /api/admin/research/{research}/return`
- `POST /api/admin/research/{research}/archive`
- `POST /api/admin/research/{research}/restore`

The relational database remains the source of truth. MongoDB remains reserved for AI/PDF/SDG metadata and flexible secondary payloads.

## 3. Sanctum UI Authentication Verification

Confirmed by tests:

- Fortify login creates a real authenticated session.
- Authenticated sessions can call `GET /api/auth/user`.
- Agency/admin APIs return 401 for guests and 403 for wrong roles.
- Agency portal web routes now require `agency_admin`.
- Admin portal web routes now require `super_admin`.

Browser checklist status: pending. A live browser run was not completed in this environment, so unverified mock fallbacks were retained.

## 4. Frontend Mock Audit

Replaced or connected:

- Agency research draft/update/submit now calls real agency research APIs.
- Agency research PDF upload now calls the real nested file endpoint.
- Agency access request approve/deny now calls real decision APIs.
- Admin moderation queue loads real admin research where available and real moderation actions are used.
- Agency/admin login forms now submit to Fortify `/login`.

Retained:

- AI metadata extraction and SDG suggestions: backend only queues jobs; no stable result/read/apply UI API yet.
- Agency archive/restore UI: agency-scoped backend endpoints are not ready.
- Admin archive list: research restore endpoint exists, but archive list API is not ready.
- Analytics/reporting, platform setting writes, RBAC writes, agency profile/settings writes, complex notifications: outside Phase 4 stable write scope.
- Read fallbacks in dashboard/repository/notification/admin services remain until browser verification is complete.

## 5. API Client Layer

Updated:

- `resources/js/lib/api-client.ts`

Added:

- `resources/js/lib/agency/agency-research-service.ts`
- `resources/js/lib/agency/agency-upload-service.ts`
- `resources/js/lib/agency/agency-access-request-service.ts`
- `resources/js/lib/admin/admin-moderation-service.ts`

The client now sends same-origin credentials, `Accept: application/json`, `X-Requested-With`, CSRF token from the page meta tag, JSON content type for JSON bodies, and preserves `FormData` bodies for uploads. It parses standardized success/error envelopes and redirects 401 API responses to the relevant login page.

## 6. Agency Research UI Integration

Connected:

- `resources/js/components/agency/UploadResearchWizard.tsx`
- `resources/js/lib/repository/repository-service.ts`
- `resources/js/components/repository/edit/EditDocumentPage.tsx`

Endpoints:

- `POST /api/agency/research`
- `PATCH /api/agency/research/{research}`
- `POST /api/agency/research/{research}/submit`
- `GET /api/agency/research`
- `GET /api/agency/research/{research}`

The upload wizard creates a relational draft first, updates the same draft as metadata changes, and submits that draft for moderation.

## 7. Agency Upload UI Integration

Connected:

- `resources/js/components/agency/UploadResearchWizard.tsx`
- `resources/js/lib/agency/agency-upload-service.ts`

Endpoint:

- `POST /api/agency/research/{research}/files`

The UI now validates PDF-only uploads with a 20 MB limit, uses `FormData`, stores relational file metadata through the API, and leaves AI result display mocked for Phase 5.

## 8. Agency Access Request Decision UI Integration

Connected:

- `resources/js/lib/access-requests/access-request-service.ts`
- `resources/js/lib/agency/agency-access-request-service.ts`
- `resources/js/components/access-requests/AccessRequestsPage.tsx`

Endpoints:

- `POST /api/agency/access-requests/{accessRequest}/approve`
- `POST /api/agency/access-requests/{accessRequest}/deny`

The decision dialog now disables duplicate saves during submission, sends decision notes, updates the list after success, and surfaces API errors.

## 9. Admin Moderation UI Integration

Connected:

- `resources/js/lib/admin/research-moderation-service.ts`
- `resources/js/lib/admin/admin-moderation-service.ts`
- `resources/js/components/admin/research-moderation/ResearchModerationPage.tsx`

Endpoints:

- `GET /api/admin/research`
- `POST /api/admin/research/{research}/approve`
- `POST /api/admin/research/{research}/reject`
- `POST /api/admin/research/{research}/publish`
- `POST /api/admin/research/{research}/return`
- `POST /api/admin/research/{research}/archive`

The existing moderation UI vocabulary remains mostly unchanged. "Mark resolved" maps to approve/publish where valid, "Keep flagged" maps to reject/return where valid, and archive uses the real archive endpoint.

## 10. Archive/Restore UI Integration

Deferred for agency archive/restore because agency-scoped archive endpoints are not implemented.

Partially available for admin research through moderation archive. The dedicated admin archive page remains mocked because a stable archive listing API is not implemented.

## 11. Notifications Integration

Light read integration already existed through `GET /api/agency/notifications`. Mark-read behavior remains local/mock because no stable mark-read endpoint exists.

## 12. Error Handling and Validation

Implemented:

- API client parses `{ message, errors }` responses.
- 401 API responses redirect to `/agency/login` or `/admin/login`.
- 403/422/500 messages are surfaced from API messages where available.
- Upload wizard displays upload/submit errors.
- Access request decisions display decision errors.
- Admin moderation displays action errors.
- CSRF token meta support was added to the root Blade template.

## 13. Mock Fallbacks Removed

No mock data files were deleted. Real write services are now used for the connected Phase 4 flows, but legacy mock modules remain until browser verification is complete.

## 14. Mock Fallbacks Retained

- `mock-research-upload-service.ts`: AI extraction and legacy draft/upload/submit helpers retained with TODO Phase 5 comments.
- Repository archive/restore/file replacement: retained with TODO Phase 5 comments until agency-scoped APIs exist.
- Access request read fallback: retained until browser verification with seeded real data.
- Admin moderation read fallback: retained until browser verification with seeded real data.
- Analytics, reports, RBAC, profile/settings, platform settings, security center, system activity, admin archive: retained for future phases.

## 15. Tests Added or Updated

Updated:

- `tests/Feature/Agency/AgencyPortalPagesTest.php`

Coverage added:

- Agency protected pages render for authenticated agency admins.
- Agency protected pages redirect guests.
- Admin portal rejects agency users.
- Admin portal renders for super admins.

No frontend unit test framework exists in the project; manual UI verification remains pending.

## 16. Commands Run and Results

- `php artisan route:list`: passed, 119 routes.
- `php artisan migrate:status`: passed, all 22 migrations ran.
- `php artisan test --filter=AgencyPortalPagesTest`: passed, 16 tests and 83 assertions.
- `php artisan test`: passed, 85 tests and 344 assertions.
- `npm run types:check`: passed.
- `npm run lint`: passed after ESLint auto-fix.
- `npm run build`: first failed in sandbox with Vite/esbuild `spawn EPERM`; rerun with approved escalation passed.
- `composer test`: first failed on Pint import ordering; after Pint fix, passed Pint and 85 tests/344 assertions. Composer still prints the pre-existing Git safe-directory ownership warning after success.
- `vendor/bin/pint ...`: fixed import ordering in `AgencyPortalPagesTest.php`.

## 17. Manual UI Verification Checklist

Pending browser checks:

- Agency login as agency admin.
- Open agency dashboard.
- Create research draft.
- Edit draft.
- Upload PDF.
- Submit research.
- View submitted research.
- Approve/deny access request.
- Verify another agency's records are inaccessible.
- Admin login as super admin.
- Open admin dashboard.
- View moderation queue.
- Approve/reject/return/publish/archive research.
- Verify agency admin cannot access admin moderation routes.
- Logout.
- Verify protected APIs return 401 for guests.
- Verify protected pages redirect correctly.
- Verify wrong role receives 403.

## 18. Issues Deferred to Phase 5

- Browser/Sanctum verification with real seeded users and documents.
- AI/PDF/SDG result read/apply UI after backend result APIs exist.
- Agency-scoped archive/restore endpoints and UI.
- Dedicated admin archive listing and restore UI backed by real APIs.
- Notification mark-read API integration.
- Analytics/reporting/export real API integration.
- RBAC and platform settings write API integration.
- MySQL staging verification.
- Full frontend tests if a test runner is introduced.

## 19. Recommended Next Step

Recommended Phase 5 prompt:

Perform browser-level Sanctum verification for RIKMS v2, then complete the remaining frontend/API integrations that now have stable backends. Start with seeded agency/admin login flows, verify agency draft/edit/upload/submit and admin moderation end to end in a real browser, remove only the mocks proven unnecessary, then add AI/PDF/SDG result APIs and UI once backend processing outputs are available. Keep relational tables as the source of truth and MongoDB limited to AI/document metadata payloads.
