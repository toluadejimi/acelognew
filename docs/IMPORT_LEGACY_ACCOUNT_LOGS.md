# Import legacy account logs (product details)

Import legacy "product details" rows (e.g. `login|password|email|...`) into the new `account_logs` table so they appear as stock for products and can be assigned to orders.

## Prerequisites

- Legacy DB connection configured (see [IMPORT_LEGACY_USERS.md](IMPORT_LEGACY_USERS.md)).
- **Products** in the new app must be linkable to legacy product ids:
  - Either run **products import with legacy_id**: `php artisan products:import-legacy ...` (so each new product gets `legacy_id` = legacy product id), or
  - The command can fall back to matching by **product title** if you pass `--legacy-products-table=products` and the legacy products table has a `name` column.
- Legacy table with one row per account/log, e.g. columns: `id`, `product_id`, optional status/sold column, and a **details** column containing pipe-separated credentials: `login|password|email|...`.

## Command

```bash
cd backend
php artisan account-logs:import-legacy [options]
```

### Required

| Option | Description |
|--------|-------------|
| `--details-column=COLUMN` | Name of the column that contains the credentials string, e.g. `login\|password\|email\|...` (pipe-separated). First part = login, second = password. |

### Backfill legacy_id first (if only a few logs were created)

If you already imported products **before** the app had `legacy_id`, run this so every new product gets a legacy id and the account-logs import can resolve all 50k+ rows:

```bash
php artisan products:backfill-legacy-id --legacy-table=products
```

Then run `account-logs:import-legacy` again.

### Optional

| Option | Description |
|--------|-------------|
| `--table=account_logs` | Legacy table name. |
| `--product-id-column=product_id` | Column that stores the legacy product id (integer). |
| `--is-sold-column=COLUMN` | Column for sold status (0/1). If present, 1 → `is_sold` = true. |
| `--legacy-products-table=products` | If a product is not found by `legacy_id`, look up legacy product by id in this table and match new product by **title** = legacy `name`. |
| `--dry-run` | Show counts only; do not insert. |

## Example

Legacy table `product_details` with columns: `id`, `product_id`, `status`, `account_details` (string like `username|password|email|...`), `created_at`, `updated_at`:

```bash
php artisan account-logs:import-legacy \
  --table=product_details \
  --details-column=account_details \
  --product-id-column=product_id \
  --is-sold-column=status
```

If your credentials column has another name (e.g. `details`, `content`, `credentials`), use that:

```bash
php artisan account-logs:import-legacy --details-column=details
```

## Behaviour

- Reads legacy rows in chunks; for each row:
  - Resolves **product**: by `legacy_id` on the new `products` table, or (if `--legacy-products-table` is set) by legacy product `name` → new product `title`.
  - Splits the details column by `|`; first part = `login`, second = `password`.
  - Creates an **AccountLog** with `product_id`, `order_id` = null, `login`, `password`, `is_sold` from optional column.
- Skips rows with unknown product, empty details, or empty login.

## Making products match (legacy_id) – fix “only a few created” / 50k → 94

If the old DB has many rows (e.g. 50k) but only a small number of account logs were created (e.g. 94), most rows are skipped because **no new product** was found for that legacy `product_id`. Fix it by making sure every legacy product id maps to a new product:

1. **Backfill `legacy_id` on existing products** (if you already imported products before `legacy_id` existed):

   ```bash
   php artisan products:backfill-legacy-id --legacy-table=products
   ```

   This reads the legacy products table and sets `legacy_id` on each new product by matching legacy **name** to new product **title** (case-insensitive, trimmed). After this, re-run the account-logs import.

2. **Or** (if you haven’t imported products yet) run the **products** import so new products get `legacy_id`:

   ```bash
   php artisan products:import-legacy --import-categories
   ```

3. Then run the **account logs** import:

   ```bash
   php artisan account-logs:import-legacy --details-column=account_details
   ```

The import now reports skip reasons: **no product**, **empty details**, **empty login**, **error**. If “no product” is high, run the backfill above and try again.
