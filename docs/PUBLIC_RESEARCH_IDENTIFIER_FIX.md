# Public Research Identifier Fix

## Problem

Published research records could appear on Browse Research, but clicking a public detail link could show "Research record not found."

## Root Cause

The public resource overloaded `id` by returning the slug when present and the numeric database ID when no slug existed. The frontend used that value for `/browse-research/{identifier}` links, but the API detail route used slug-only binding with `/api/public/research/{research:slug}`. Records with nullable or missing slugs therefore generated numeric links that the API treated as slug lookups.

## Chosen Strategy

Public URLs prefer slugs, but numeric IDs remain a fallback for old records without slugs. The API now resolves public research detail identifiers by slug or numeric ID and applies the same public visibility rule in both cases.

## ID, Slug, and Public Identifier

- `id` is always the database ID.
- `slug` is always the database slug or `null`.
- `public_identifier` is the frontend-safe URL identifier: slug when available, otherwise the numeric ID as a string.

## API Route Behavior

`GET /api/public/research/{identifier}` accepts either a slug or a numeric ID. The backend only returns records that are published, not archived, not soft-deleted, and not marked with private access.

## Frontend Link Behavior

Public browse cards and featured research links use `/browse-research/{public_identifier}`. Existing numeric links keep working through the same API fallback.

## Slug Generation Behavior

New agency-created research still receives a unique slug from its title. Existing records with missing slugs are backfilled when updated with a title by an agency user or when published by a super admin. Existing slugs are preserved.

## Tests Added

- Public browse response includes `id`, `slug`, and `public_identifier`.
- Public detail works by slug.
- Public detail works by numeric ID fallback when slug is missing.
- Draft, archived, and private-access records are not publicly exposed.
- Publishing approved research with a missing slug generates and persists a slug.

## Browser QA Result

Executed against `http://rikmsv2.test` without running `php artisan serve`.

- `GET /api/public/research?per_page=1` returned public records.
- The first record detail loaded through `/api/public/research/{public_identifier}`.
- The detail response returned the expected title and matching `public_identifier`.
