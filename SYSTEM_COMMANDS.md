# RIKMS v2 Command Guide

Use this guide from the project root:

```powershell
cd C:\Users\Administrator\Herd\rikmsv2
```

RIKMS v2 is a Laravel 12 backend with Inertia, React, TypeScript, Vite, Pest tests, Pint formatting, and optional MongoDB/OpenAI integrations for AI metadata features.

## 1) First-Time Setup

| Command | What it does | When to use it |
| --- | --- | --- |
| `composer setup` | Installs PHP dependencies, creates `.env` if missing, generates `APP_KEY`, runs migrations, installs Node dependencies, and builds frontend assets. | Best one-command setup after cloning the project. |
| `composer install` | Installs PHP/Laravel dependencies into `vendor/`. | Use if `vendor/` is missing or `composer.lock` changed. |
| `npm install` | Installs frontend dependencies into `node_modules/`. | Use if `node_modules/` is missing or `package-lock.json` changed. |
| `Copy-Item .env.example .env` | Creates a local `.env` file manually. | Use only if `.env` does not exist. |
| `php artisan key:generate` | Generates the Laravel application key. | Use after creating a new `.env`. |
| `php artisan migrate` | Runs database migrations. | Use after setup or after pulling database schema changes. |
| `php artisan storage:link` | Links public storage to `public/storage`. | Use when uploaded/public files need to be served by the browser. |

## 2) Daily Development

| Command | What it does | When to use it |
| --- | --- | --- |
| `composer dev` | Starts Laravel server, queue listener, and Vite dev server together. | Main command for local development. |
| `php artisan serve` | Starts only the Laravel backend. | Use when you want backend only. |
| `npm run dev` | Starts only the Vite frontend dev server. | Use when backend is already running. |
| `php artisan queue:listen --tries=1` | Runs queued jobs locally. | Use when testing async work such as notifications, PDF parsing, or AI jobs. |
| `php artisan pail --timeout=0` | Streams Laravel logs in the terminal. | Use while debugging backend requests. |
| `composer dev:ssr` | Builds SSR assets and starts server, queue, logs, and Inertia SSR process. | Use when testing server-side rendering behavior. |

Default local URLs are usually:

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:8000` | Laravel app served by `php artisan serve`. |
| `http://localhost:5173` | Vite dev server for frontend assets. |

## 3) Database Commands

| Command | What it does | When to use it |
| --- | --- | --- |
| `php artisan migrate` | Applies new migrations. | Use after pulling schema changes. |
| `php artisan migrate:status` | Shows which migrations have run. | Use when checking database state. |
| `php artisan migrate:fresh` | Drops all tables and rebuilds the database. | Use when you want a clean local database. This deletes local data. |
| `php artisan migrate:fresh --seed` | Rebuilds the database and runs seeders. | Use for a clean local database with roles, permissions, settings, and development accounts. |
| `php artisan db:seed` | Runs all configured seeders. | Use when you need default data without dropping tables. |
| `php artisan db:seed --class=DevelopmentAccountSeeder` | Seeds only local development accounts. | Use when you only need login accounts refreshed. |
| `php artisan db:wipe` | Drops all database tables, views, and types. | Use only when intentionally clearing the local database. |

Local seeded accounts are guarded for safe environments such as `local`, `testing`, and `pilot`.

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `super_admin@admin.com` | `superadmin` |
| Agency Admin | `agency@admin.com` | `agency admin` |

## 4) Build Commands

| Command | What it does | When to use it |
| --- | --- | --- |
| `npm run build` | Builds production frontend assets. | Use before deployment checks or production testing. |
| `npm run build:ssr` | Builds frontend assets and the SSR bundle. | Use when SSR output is required. |

## 5) Testing Commands

| Command | What it does | When to use it |
| --- | --- | --- |
| `composer test` | Clears config, checks PHP formatting, and runs the Laravel/Pest test suite. | Main backend test command. |
| `php artisan test` | Runs all Laravel/Pest tests directly. | Use for a normal test run. |
| `php artisan test --filter=AuthenticationTest` | Runs tests matching a class or method name. | Use for focused backend testing. |
| `php artisan test tests/Feature/PublicPortalApiTest.php` | Runs one test file. | Use when working on a specific feature. |
| `npm run types:check` | Runs TypeScript type checking. | Use after frontend TypeScript changes. |
| `composer ci:check` | Runs frontend lint check, format check, TypeScript check, and backend tests. | Best full local validation before committing or opening a PR. |

## 6) Formatting and Linting

| Command | What it does | When to use it |
| --- | --- | --- |
| `composer lint` | Auto-formats PHP code with Laravel Pint. | Use after backend changes. |
| `composer lint:check` | Checks PHP formatting without changing files. | Use for CI-style validation. |
| `npm run lint` | Runs ESLint and auto-fixes frontend issues where possible. | Use after frontend changes. |
| `npm run lint:check` | Runs ESLint without auto-fixing. | Use for CI-style validation. |
| `npm run format` | Formats frontend files in `resources/` with Prettier. | Use after editing React/TypeScript/CSS files. |
| `npm run format:check` | Checks frontend formatting without changing files. | Use before committing. |

## 7) Laravel Maintenance and Debugging

| Command | What it does | When to use it |
| --- | --- | --- |
| `php artisan optimize:clear` | Clears config, route, view, and app caches. | Use after `.env`, route, config, or view changes behave strangely. |
| `php artisan config:clear` | Clears cached config. | Use after changing `.env` or files in `config/`. |
| `php artisan route:clear` | Clears cached routes. | Use after route cache issues. |
| `php artisan view:clear` | Clears compiled Blade views. | Use after view/rendering issues. |
| `php artisan cache:clear` | Clears application cache. | Use when cached app data is stale. |
| `php artisan route:list` | Lists registered routes. | Use when checking available pages/API endpoints. |
| `php artisan route:list --path=api` | Lists API routes only. | Use when working on API controllers. |
| `php artisan about` | Shows Laravel environment and configuration summary. | Use for quick environment diagnostics. |
| `php artisan tinker` | Opens an interactive Laravel shell. | Use for quick model/database checks. |

## 8) Queue and Jobs

| Command | What it does | When to use it |
| --- | --- | --- |
| `php artisan queue:listen --tries=1` | Continuously processes local queue jobs. | Best during development. |
| `php artisan queue:work --tries=1` | Processes queue jobs with the worker command. | Useful when matching production-style queue behavior. |
| `php artisan queue:failed` | Lists failed queue jobs. | Use when jobs fail. |
| `php artisan queue:retry all` | Retries all failed jobs. | Use after fixing a job issue locally. |
| `php artisan queue:flush` | Deletes all failed jobs. | Use only when you intentionally want to clear failed job history. |

## 9) Git Commands

| Command | What it does | When to use it |
| --- | --- | --- |
| `git status` | Shows changed files and current branch. | Use before and after making changes. |
| `git pull` | Pulls latest changes from the current remote branch. | Use before starting work. |
| `git branch` | Lists branches and highlights the current one. | Use to confirm where you are working. |
| `git checkout -b my-feature-name` | Creates and switches to a new branch. | Use before starting a new feature/fix. |
| `git add .` | Stages all changed files. | Use when preparing a commit. |
| `git commit -m "Describe the change"` | Creates a commit. | Use after staging related changes. |
| `git push` | Pushes commits to the remote branch. | Use after committing. |

## 10) Common Workflows

### Start Local Development

```powershell
cd C:\Users\Administrator\Herd\rikmsv2
composer dev
```

Then open:

```text
http://127.0.0.1:8000
```

### Reset Local Database With Seed Data

```powershell
php artisan migrate:fresh --seed
```

### Run A Full Local Check Before Committing

```powershell
composer ci:check
```

### Fix Common Cache Problems

```powershell
php artisan optimize:clear
```

### Reinstall Dependencies After Pulling Changes

```powershell
composer install
npm install
php artisan migrate
npm run build
```

## 11) Important Environment Notes

- Keep secrets in `.env`, never in source-controlled files.
- Local SQLite is configured in `.env.example` with `DB_CONNECTION=sqlite`.
- MongoDB is used for AI/PDF/flexible metadata features through `MONGODB_URI` and `MONGODB_DATABASE`.
- OpenAI-powered features need `OPENAI_API_KEY` in `.env`.
- Restart `composer dev` after changing `.env`.
- Do not enable development seed accounts in production.
