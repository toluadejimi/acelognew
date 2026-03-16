# Import legacy products

This guide explains how to import products (and optionally categories) from the legacy database into the new `categories` and `products` tables.

## Prerequisites

- Legacy DB connection configured in `config/database.php` as `legacy` (see [IMPORT_LEGACY_USERS.md](IMPORT_LEGACY_USERS.md)).
- `.env` has `DB_LEGACY_*` set (host, port, database, username, password).
- Legacy database has at least:
  - **Categories table** (default name: `categories`) with columns: `id`, `name`, and optionally `slug`, `display_order`, `emoji`, `icon_url`, `image_url`.
  - **Products table** (default name: `products`) with columns: `id`, `category_id`, `name`, `description`, `price`, `image`, `status`, `created_at`, `updated_at`.

## Column mapping

| Legacy (products) | New (products) |
|-------------------|----------------|
| `name`            | `title`        |
| `description`     | `description` (HTML stripped) |
| `price`           | `price`        |
| `image`           | `image_url` (optional base URL + filename) |
| `status` (1 = active) | `is_active` |
| `category_id`     | `category_id` (mapped to new category UUID) |
| —                 | `currency` = NGN |
| —                 | `platform` = General |
| —                 | `stock` = 0    |

## Commands

```bash
cd backend
php artisan products:import-legacy [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--categories-table=categories` | Legacy categories table name. |
| `--products-table=products`     | Legacy products table name. |
| `--import-categories`          | Create new categories from legacy categories table. If omitted, only existing new categories are used (matched by name/slug). |
| `--image-base-url=URL`         | Base URL for product images (e.g. `https://old-site.com/uploads`). Resulting `image_url` = base URL + `/` + legacy `image` filename. |
| `--dry-run`                    | Log what would be done without inserting/updating. |

## Usage examples

**1. Dry run (see what would be imported)**  
```bash
php artisan products:import-legacy --dry-run
```

**2. Map to existing new categories only (no category import)**  
Legacy categories are read to map `category_id` → new category by matching name/slug. New categories are not created.  
```bash
php artisan products:import-legacy
```

**3. Import legacy categories then products**  
Creates missing categories from the legacy categories table, then imports products.  
```bash
php artisan products:import-legacy --import-categories
```

**4. With image base URL**  
If legacy `image` is a filename (e.g. `65ade5fd10fc81705895421.png`), set a base URL so `image_url` is full URL:  
```bash
php artisan products:import-legacy --image-base-url="https://old-site.com/uploads"
```

**5. Custom table names**  
```bash
php artisan products:import-legacy --categories-table=legacy_cats --products-table=legacy_products
```

## Behaviour

- **Categories:**  
  - With `--import-categories`: categories are created with `firstOrCreate(['slug' => $slug], ...)`.  
  - Without: legacy categories are only read; each legacy `id` is mapped to a new category by `name` or `slug`; if no match, that legacy id has no mapping.
- **Products:**  
  - For each legacy product, `category_id` is resolved from the map. If there is no mapping, the product is skipped (or could use a default category if you add that).  
  - `description` is cleaned with `strip_tags()` and normalized whitespace.  
  - `is_active` is true when legacy `status === 1`.  
  - `created_at` / `updated_at` are copied from legacy when present.

## Making product images show (move legacy images into the app)

If you imported products with only filenames (e.g. `65ade5fd10fc81705895421.png`) or with an old site URL, you can copy the image files into the new app so the dashboard and API serve them.

1. **Copy legacy images into app storage**  
   Run (point `--source-dir` at the folder that contains the legacy product image files):

   ```bash
   cd backend
   php artisan products:link-legacy-images --source-dir=/path/to/legacy/uploads
   ```

   This copies image files (jpg, jpeg, png, gif, webp, svg) into `storage/app/public/product_images/` and sets each product's `image_url` to the new app URL when a matching filename is found.

2. **Create the storage symlink** (if not already done): `php artisan storage:link`

3. **Dry run:** `php artisan products:link-legacy-images --source-dir=/path/to/uploads --dry-run`

After this, product images should show in the dashboard.

## Troubleshooting

- **“Could not read legacy categories table”**  
  Check `DB_LEGACY_*` and that the legacy DB has the table name you pass (default `categories`).

- **Products skipped: “no category mapping”**  
  Either run with `--import-categories` or ensure new categories exist with the same name/slug as legacy so the map can be built.

- **Duplicate slug when importing categories**  
  Categories are created with `firstOrCreate` on `slug`; existing slugs are reused. Adjust legacy data or slugs if you need different behaviour.
