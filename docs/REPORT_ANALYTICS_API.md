# Report Analytics API

Phase 4 adds authenticated, read-only analytics endpoints for Terminal Reports and Project Accomplishment Reports.

No dashboards, exports, mock data, or database columns are introduced by these endpoints.

## Routes

Agency Admin routes:

- `GET /api/agency/analytics/project-reports/summary`
- `GET /api/agency/analytics/project-reports/status`
- `GET /api/agency/analytics/project-reports/budget`
- `GET /api/agency/analytics/project-reports/records`

Super Admin routes:

- `GET /api/admin/analytics/project-reports/summary`
- `GET /api/admin/analytics/project-reports/status`
- `GET /api/admin/analytics/project-reports/budget`
- `GET /api/admin/analytics/project-reports/agencies`
- `GET /api/admin/analytics/project-reports/records`

## Middleware And Access

Agency routes use the existing `auth:sanctum`, `role:agency_admin`, and `agency.scope` middleware. The backend always scopes results to the authenticated user's `agency_id`; supplied `agency_id` query values are ignored.

Admin routes use the existing `auth:sanctum`, `role:super_admin`, and `super_admin.2fa` middleware. Super Admins receive regional data by default and may filter by `agency_id`.

No public route exposes report analytics.

## Report Type Rules

Only persisted Terminal Reports and Project Accomplishment Reports are included. The canonical values are:

- `terminal-report`
- `project-accomplishment`

Eligibility is based on persisted `research.category` values and canonical `research_files.file_type` values. Normal Research Studies are excluded.

Archived reports are excluded by default through `research.archived_at`, archived workflow status, and superseded workflow status.

## Filters

Supported filters:

- `report_type`
- `agency_id` on Super Admin routes only
- `publication_year`
- `reporting_period`: `Q1`, `Q2`, `Q3`, `Q4`, `Annual`, `Final`
- `workflow_status`
- `completeness`: `not_started`, `incomplete`, `complete`
- `budget_classification`: `not_reported`, `not_utilized`, `low`, `moderate`, `high`, `fully_utilized`, `overutilized`
- `accomplishment_classification`: `not_reported`, `not_started`, `in_progress`, `substantially_complete`, `complete`
- `funding_source`
- `date_from`
- `date_to`
- `page`
- `per_page`, maximum `100`
- `sort`
- `direction`: `asc` or `desc`

Sort fields are allowlisted:

- `created_at`
- `title`
- `publication_year`
- `workflow_status`
- `reporting_period`
- `project_start_date`
- `project_end_date`
- `allotted_budget`
- `utilized_amount`

## Summary

The summary endpoint returns real persisted totals only. Missing financial values are not converted into fake zero-value reports.

Financial totals sum reported values:

- `total_allotted_budget`
- `total_released_amount`
- `total_obligated_amount`
- `total_utilized_amount`
- `total_remaining_balance`

Aggregate utilization uses:

```text
sum(utilized_amount) / sum(allotted_budget) * 100
```

It does not average per-report percentages. If the summed allotted budget is missing or zero, utilization is `null`.

## Status

The status endpoint keeps these concepts separate:

- report type
- workflow status from `research.status`
- report completeness from `ReportCompletenessService`
- physical accomplishment from `ProjectAccomplishmentService`

Each distribution returns counts and percentages. Empty datasets return zero counts and `null` percentages.

## Budget

The budget endpoint returns:

- aggregate totals
- budget classification distribution from `BudgetUtilizationService`
- aggregates by report type
- aggregates by reporting period
- aggregates by agency on Super Admin routes

Monetary values are JSON decimal strings. Percentages are numeric values or `null`.

## Agency Comparison

`GET /api/admin/analytics/project-reports/agencies` returns agency-level aggregates for Super Admins only. It is not exposed through Agency Admin routes.

## Records

The records endpoint returns paginated rows with explicit analytics DTO fields:

- `research_id`
- `title`
- authorized agency summary
- `report_type`
- `reporting_period`
- `publication_year`
- `workflow_status`
- `submitted_at`
- `approved_at`
- `completeness`
- `budget`
- `accomplishment`

Calculated sections are assembled through `ReportAnalyticsAssembler`. Raw files, storage paths, AI responses, extracted text, and private file metadata are not serialized.

Pagination follows the existing API convention:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 15,
      "total": 0,
      "last_page": 1,
      "from": null,
      "to": null
    }
  }
}
```

## Missing Data

Missing values stay `null` in record-level analytics. Empty aggregate responses return zero counts, `"0.00"` money totals, empty arrays where applicable, and `null` percentages when the denominator is unavailable.

## Query Strategy And Pilot Constraint

Persisted filters such as agency, report type, publication year, workflow status, reporting period, funding source, and date range are applied in SQL.

The derived filters `completeness`, `budget_classification`, and `accomplishment_classification` reuse the Phase 3 services. Because those classifications intentionally live outside SQL formulas, the API performs a chunked pilot-volume pass to collect matching record IDs, then paginates the final record query at the database level. This avoids duplicating calculation rules while keeping memory bounded by chunk size.
