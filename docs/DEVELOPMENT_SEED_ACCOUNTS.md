# Development Seed Accounts

## Purpose

RIKMS v2 includes a guarded development seeder for local, testing, and pilot environments. It creates stable accounts for manual QA, pilot validation, and smoke testing.

These accounts must not be enabled for production use. Change, disable, or remove them before any production launch.

## Environment Limit

`DatabaseSeeder` calls `DevelopmentAccountSeeder` only when the application environment is one of:

- `local`
- `testing`
- `pilot`

The seeder can also be explicitly enabled with `RIKMS_ALLOW_DEV_SEED_ACCOUNTS=true`, but this must not be used in production.

## Seeded Agency

The seeder reuses an existing DOST agency when possible, matching by DOST-like slug, short name, or Department of Science and Technology name. If no match exists, it creates:

- Name: Department of Science and Technology XI
- Short name: DOST XI
- Slug: `dost-xi`
- Status: `active`

## Seeded Accounts

The seeder does not create an Agency Admin account. Use the seeded Super Admin account to create Agency Admin users from the admin portal during local or pilot testing.

Super Admin:

- Email: `super_admin@admin.com`
- Password: `superadmin`
- Role: `super_admin`
- Status: `active`

Passwords are stored with `Hash::make()` and are never stored as plain text.

## Authentication Code Handling

The current backend uses Laravel Fortify two-factor fields, but there is no dedicated admin authentication-code table or verifier for the admin login screen's authentication-code field.

For local and pilot testing, the requested Super Admin authentication code is documented as an environment value:

```env
RIKMS_DEV_SUPER_ADMIN_AUTH_CODE=123456
```

This value is exposed only through backend config in safe environments:

```php
config('rikms.dev_seed_accounts.super_admin_auth_code')
```

It is not stored in the users table and is not exposed to frontend code. If a backend verifier is added later, it should read this config value only in `local`, `testing`, or `pilot` environments.

## Running The Seeder

Run the normal database seeder:

```bash
php artisan db:seed
```

Or run only the development accounts seeder:

```bash
php artisan db:seed --class=DevelopmentAccountSeeder
```

The seeder is idempotent. It updates the Super Admin user, roles, and DOST agency instead of creating duplicates.
