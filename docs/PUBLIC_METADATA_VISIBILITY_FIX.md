# Public Metadata Visibility Fix

## 1. Problem

Public display checkbox selections made in the Agency Upload Wizard AI Metadata step were not consistently reflected on the public Browse Research and View Details pages. Selected sections such as Methodology or Results and Discussion could be saved in the wizard flow but not appear publicly.

## 2. Root Cause

The upload wizard used camelCase metadata keys for some extracted sections, while the public API and rendering path expected snake_case keys. Public detail rendering also depended on a hardcoded primary subset unless the dynamic `publicMetadata` collection included matching keys.

## 3. Data Contract

The backend now accepts and normalizes supported public metadata keys through `App\Support\PublicMetadata`.

Supported public keys:

- `title`
- `abstract`
- `methodology`
- `review_of_related_literature`
- `theoretical_framework`
- `results_and_discussion`
- `keywords`
- `authors`
- `publication_year`
- `funding_source`
- `implementing_agency`
- `project_leader`
- `study_location`
- `sdg_tags`

The preferred submit payload includes:

```json
{
  "public_metadata_fields": ["title", "abstract", "methodology"],
  "public_metadata": [
    { "key": "title", "label": "Title", "value": "Study title" },
    { "key": "methodology", "label": "Methodology", "value": "Approved methodology text" }
  ]
}
```

Legacy camelCase keys from the wizard are accepted and normalized to snake_case.

## 4. Database Persistence

Approved public metadata values are stored relationally in `research.public_metadata`.

Selected public field keys are stored relationally in `research.public_metadata_fields`.

MongoDB AI metadata remains a draft source only and is not used directly by the public API.

## 5. Public API Behavior

The public API builds public metadata from the selected key list. Unchecked fields are excluded from:

- public detail response metadata
- public browse card summaries
- public search haystacks for abstract, authors, keywords, and selected metadata values

Empty selected fields are omitted from `publicMetadata`.

Title remains visible as the public listing/header title so users can identify research records.

## 6. Frontend Rendering

The Agency Upload Wizard now uses snake_case field keys for AI metadata public display selections.

The public detail page renders selected dynamic metadata from `publicMetadata`.

The public browse card uses the public abstract when selected, otherwise it can fall back to the first selected public metadata text section such as Methodology or Results and Discussion.

## 7. Tests Added

- Agency create/update test now verifies `public_metadata_fields` persistence.
- Public detail test verifies selected fields appear and unchecked fields do not.
- Public browse/search test verifies unchecked metadata is not searchable.
- Public visibility update test verifies changing selected fields removes previously public fields.

## 8. Browser QA

Automated API and frontend build checks were run. Manual Herd browser QA was not completed in this pass because it requires an authenticated agency-admin walkthrough and a sample upload workflow in the browser.

## 9. Remaining Notes

`public_metadata` stores public-safe approved values, while `public_metadata_fields` is the visibility source of truth. Public resources support older records that only have `public_metadata` by deriving selected fields from those entries.
