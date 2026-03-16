# Import legacy users into Ace Log

This guide explains how to import users from your **old database** (the table with `firstname`, `lastname`, `username`, `email`, `password`, `status`, `ev`, `balance`, `role_id`, etc.) into the new Ace Log `users`, `profiles`, `wallets`, and `user_roles` tables.

## 1. Legacy database connection

In `backend/.env`, set the connection to your **old** database (where the source `users` table lives):

```env
DB_LEGACY_HOST=127.0.0.1
DB_LEGACY_PORT=3306
DB_LEGACY_DATABASE=your_old_database_name
DB_LEGACY_USERNAME=root
DB_LEGACY_PASSWORD=your_password
```

If you omit these, the command falls back to your main `DB_*` connection (same as the new app). Use a **separate** database name for the old app so you don’t mix data.

## 2. Table and column mapping

The command expects the legacy table to have at least:

| Legacy column   | Use in new app |
|-----------------|----------------|
| `id`            | Not stored (new `users.id` is auto) |
| `firstname`     | Part of `users.name` (with lastname) |
| `lastname`      | Part of `users.name` |
| `username`      | `users.name` if no first/last; also `profiles.username` |
| `email`         | `users.email` (required; duplicates are skipped) |
| `password`      | `users.password` (must be bcrypt `$2y$...`; otherwise a random temp password is set) |
| `status`        | 0 → `profiles.is_blocked = true`, 1 → false |
| `ev`            | 1 → `users.email_verified_at = now()`, 0 → null |
| `remember_token`| `users.remember_token` |
| `balance`       | `wallets.balance` (NGN) |
| `role_id`       | 1 → moderator, 2 → admin, else → user (`user_roles.role`) |
| `created_at`    | `users.created_at` |
| `updated_at`    | `users.updated_at` |

Other columns (e.g. `country_code`, `mobile`, `ref_by`, `address`, `ver_code`, `telegram_id`, `api_key`) are **not** imported. If you need them, extend the command or add columns to the new schema first.

## 3. Run the import

From the **backend** directory:

```bash
cd backend
php artisan users:import-legacy
```

- **Dry run** (no writes, only logs what would be done):

```bash
php artisan users:import-legacy --dry-run
```

- If the legacy table has a **different name** (e.g. `accounts`):

```bash
php artisan users:import-legacy --table=accounts
```

## 4. After import

- Each imported user has a **profile** (username, is_blocked), a **wallet** (balance in NGN), and a **user_role** (admin / moderator / user).
- Users with the same **email** as an existing user in the new DB are **skipped** (no duplicate emails).
- Legacy **passwords** are kept as-is if they are valid bcrypt hashes; otherwise a one-time random password is set (you’ll need to reset it for those users).

## 5. Troubleshooting

- **“Could not connect to legacy DB”**  
  Check `DB_LEGACY_*` in `.env` and that the legacy MySQL server is reachable.

- **“No rows in legacy table”**  
  Confirm the table name with `--table=your_table` and that the legacy DB has data.

- **Users skipped: “email already exists”**  
  They are already in the new app; the command does not update existing users.

- **Login fails after import**  
  Ensure the legacy `password` column contains bcrypt hashes (`$2y$10$...`). If the old app used a different hashing algorithm, you must reset passwords in the new app or add a custom mapping in the command.
