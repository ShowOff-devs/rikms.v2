# RIKMS v2 Command Guide

This guide lists the commands needed to run and maintain this system locally.

## 1) Initial Setup (run once per machine/project clone)

| Command | Short description | Where to use it |
| --- | --- | --- |
| `composer setup` | Full first-time setup: installs PHP/Node deps, creates `.env`, generates key, runs migrations, builds assets. | Use right after cloning the project. |
| `composer install` | Installs backend (PHP) dependencies only. | Use when `composer.lock` changes or `vendor` is missing. |
| `npm install` | Installs frontend (Node) dependencies only. | Use when `package-lock.json` changes or `node_modules` is missing. |
| `php artisan key:generate` | Generates `APP_KEY` for encryption/session security. | Use if `.env` is new or `APP_KEY` is empty. |
| `php artisan migrate` | Creates/updates database tables from migrations. | Use after pulling new backend schema changes. |

## 2) Daily Development (run while coding)

| Command | Short description | Where to use it |
| --- | --- | --- |
| `composer dev` | Starts local backend server, queue listener, and Vite dev server together. | Main command for day-to-day local development. |
| `npm run dev` | Starts only the Vite frontend dev server. | Use when backend already runs elsewhere. |
| `php artisan serve` | Starts only the Laravel backend server. | Use when frontend is already running separately. |
| `php artisan queue:listen --tries=1` | Processes queued jobs in local development. | Use when testing notifications/jobs/async tasks. |
| `composer dev:ssr` | Runs SSR-oriented dev stack (with logs and Inertia SSR process). | Use when testing SSR behavior. |

## 3) Build and Preview

| Command | Short description | Where to use it |
| --- | --- | --- |
| `npm run build` | Builds production frontend assets. | Use before deployment checks or production testing. |
| `npm run build:ssr` | Builds frontend assets and server-side rendering bundle. | Use when SSR build output is required. |

## 4) Code Quality and Testing

| Command | Short description | Where to use it |
| --- | --- | --- |
| `composer test` | Runs backend checks (`pint --test`) and Laravel tests. | Use before committing backend changes. |
| `php artisan test` | Runs Laravel/Pest test suite directly. | Use for backend-only test runs. |
| `composer lint` | Auto-formats backend PHP code with Pint. | Use to fix backend style issues. |
| `composer lint:check` | Checks backend PHP formatting without changing files. | Use in CI-style local validation. |
| `npm run lint` | Lints and auto-fixes frontend JS/TS code. | Use before committing frontend changes. |
| `npm run lint:check` | Lint check only (no auto-fix). | Use for strict validation/CI checks. |
| `npm run format` | Formats frontend files in `resources/` using Prettier. | Use to normalize frontend formatting. |
| `npm run format:check` | Checks Prettier formatting without changes. | Use in pre-commit/CI verification. |
| `npm run types:check` | TypeScript type-check without build output. | Use after TS changes for safety. |
| `composer ci:check` | Runs lint/type/format/test checks for full local CI pass. | Use before opening a PR or merging. |

## 5) Recommended Quick Start Flow

1. `composer setup`
2. `composer dev`
3. Open the app in browser and start coding.

## 6) Notes

- Run all commands from the project root (`rikmsv2`).
- Default local DB is SQLite (`.env.example` shows `DB_CONNECTION=sqlite`).
- If you change environment values, restart running dev processes.
