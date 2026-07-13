# RIKMS Report Analytics Calculation Rules

This document defines backend-only calculation rules for Terminal Reports and Project Accomplishment Reports. These rules do not create analytics endpoints, dashboards, charts, exports, or database columns.

## Status Concepts

Workflow status is `research.status`. It describes moderation or publication flow, such as `draft`, `submitted`, `approved`, or `published`.

Report completeness describes whether required persisted report information is present. A submitted or approved report is not automatically complete.

Project accomplishment describes physical progress. It is separate from workflow status, report completeness, and financial utilization.

Budget utilization describes reported financial usage. It is separate from physical accomplishment and does not imply report completeness.

## Applicable Records

Report analytics applies only to Terminal Reports and Project Accomplishment Reports.

The report type is resolved to:

- `terminal-report`
- `project-accomplishment`
- `not_applicable`

Ordinary Research Study records return `not_applicable` from the combined assembler and are not treated as Terminal/PAR analytics records.

## Completeness Sections

Completeness is calculated from persisted values on `research`, `research_files`, `research_report_details`, and `research_performance_items`.

The required persisted sections are:

- `document`: report category and an uploaded report document/file reference.
- `project_details`: `reporting_period`, `project_start_date`, `project_end_date`.
- `metadata`: `title`, `abstract`, `public_metadata_fields`.
- `performance`: at least one persisted performance item.
- `financials`: `allotted_budget`, `released_amount`, `obligated_amount`, `utilized_amount`, `financial_as_of_date`.
- `sdg_classification`: at least one persisted SDG tag.

`0` is treated as supplied. `null`, blank strings, and empty arrays are treated as missing.

Completeness returns:

- `not_started` when no sections are complete.
- `incomplete` when at least one section is complete but not all required sections are complete.
- `complete` when all required sections are complete.

## Budget Formulas

Canonical persisted fields are:

- `allotted_budget`
- `released_amount`
- `obligated_amount`
- `utilized_amount`
- `financial_as_of_date`

Calculated fields are not persisted.

Formulas:

- `remaining_balance = allotted_budget - utilized_amount`
- `utilization_percentage = utilized_amount / allotted_budget * 100`

When allotted budget is missing or zero, utilization percentage is `null`. Division by zero is never attempted. Negative remaining balance is allowed when utilization exceeds allotment.

Money calculations use decimal-safe string arithmetic through PHP BCMath. API-compatible money values are returned as two-decimal strings.

## Budget Classifications

- `not_reported`: no financial data exists, or utilization cannot be classified because required values are missing.
- `not_utilized`: utilized amount is exactly `0`.
- `low`: greater than `0%` and below `50%`.
- `moderate`: `50%` to below `80%`.
- `high`: `80%` to below `100%`.
- `fully_utilized`: exactly `100%`.
- `overutilized`: greater than `100%`.

## Budget Warnings

Warnings are non-blocking data-quality flags:

- `released_exceeds_allotted`
- `obligated_exceeds_allotted`
- `utilized_exceeds_allotted`
- `utilized_exceeds_released`
- `obligated_exceeds_released`
- `missing_financial_as_of_date`

Warnings do not reject, mutate, or correct existing report data.

## Accomplishment Rules

The persisted `physical_accomplishment_percent` on `research_report_details` is the official report-level value.

When the official value exists, it is returned with `official_value_source = report_detail` and takes precedence over row averages.

When the official value is missing, the service may derive an unweighted average from performance rows that already have explicit `accomplishment_percentage` values. Rows without explicit percentages are ignored.

Textual `target_value` and `actual_value` values are not used to infer accomplishment percentages. They may include business labels such as beneficiaries, sessions, publications, deliverables, or prototypes, and are not reliable numerical sources.

## Accomplishment Classifications

- `not_reported`: no official value and no reliable row average.
- `not_started`: exactly `0%`.
- `in_progress`: greater than `0%` and below `80%`.
- `substantially_complete`: `80%` to below `100%`.
- `complete`: exactly `100%`.

Backend validation currently permits `0..100`, so values above `100%` are not classified.

## Legacy Reports

Legacy or incomplete report records may have `report_detail = null` and no performance rows.

For those records:

- completeness inspects available persisted values and reports missing sections;
- budget returns `not_reported`;
- accomplishment returns `not_reported`;
- no report-detail row is created automatically;
- missing values remain `null`, not zero.

## Query Efficiency

The services operate on `Research` and its relationships:

- `reportDetail`
- `performanceItems`
- `files`

Services call `loadMissing()` once for required relationships. Future batch consumers should eager load those relationships before invoking the services to avoid N+1 queries. Services do not load file contents, raw AI responses, or parsed PDF text, and they do not write to the database.
