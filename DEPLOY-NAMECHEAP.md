# Deploy to Namecheap Shared Hosting (cPanel)

The frontend is a **Vite React SPA**; the **Laravel API** lives under `/api` on the same domain when you deploy correctly.

---

## Hide the backend URL (same-origin API — recommended)

**You do not need a Laravel Blade clone of the React app.** The browser must always know *some* URL for API calls; what you want is **same-origin** so Network shows only your site (e.g. `https://host.hotelbiza.online/api/...`), not `https://other-backend.com/api/...`.

1. **Before `npm run build`**, in the project root `.env` set:
   - `VITE_API_URL=` **empty** (same as `.env.example`).  
   - Do **not** set `VITE_API_URL=https://your-laravel-host/...` — that bakes a separate host into the JS and it will show in DevTools.

2. **Serve the SPA from Laravel’s `public` folder** so the origin is the same as Laravel:
   - Build: `npm run build`
   - Copy **everything inside** `dist/` into **`backend/public/`** (next to `index.php`): `index.html`, `assets/`, etc.
   - Point the domain’s **document root** in cPanel to **`backend/public`** (or the full path your host uses, e.g. `.../host.hotelbiza.online/backend/public`).

3. Laravel already exposes routes at **`/api/...`**. With an empty `VITE_API_URL`, the React app calls **`/api/...`** on the **same hostname** — no second backend URL in the Network tab.

4. **Optional:** If the site is in a **subfolder** (not at domain root), set Vite `base` to that path and rebuild, or assets will 404. Ask your host for the exact web path.

**Security note:** Power users can still see `/api` paths and replay requests. Hiding the hostname only avoids exposing a separate API server; use normal auth (Sanctum), HTTPS, and rate limits.

---

## Step 1: Set environment variables (before building)

The build bakes Vite env vars into the JS. In the **repo root** `.env` set:

- **`VITE_API_URL=`** — leave **empty** so production uses same-origin `/api/...` (see section above).
- `VITE_SUPABASE_URL` – your Supabase project URL (if used)
- `VITE_SUPABASE_PUBLISHABLE_KEY` – your Supabase anon key (if used)
- `VITE_SPRINTPAY_API_KEY` – SprintPay API key (for pay redirect), if used

---

## Step 2: Build the project

On your computer, in the **project root** (not `backend/`):

```bash
npm install
npm run build
```

This creates a **`dist`** folder with the site (HTML, JS, CSS).

---

## Step 3: Upload via cPanel File Manager

### Option A — Same domain as Laravel (hides separate API host) — **recommended**

1. In cPanel **File Manager**, open your Laravel app folder (e.g. `host.hotelbiza.online/backend/public/`).
2. Upload the **contents** of local **`dist/`** into **`public/`** (same folder as `index.php`):
   - `index.html`, `assets/`, `robots.txt`, etc. **Do not** replace Laravel’s `public/.htaccess` with a “SPA-only” file that sends *all* URLs to `index.html` — that breaks **`/api/*`** (you’ll get 404 on `/api/auth/login`). Keep the **Laravel** `.htaccess` from `backend/public/` (unknown paths → `index.php`).
3. In cPanel **Domains** → document root for this site → point to **`.../backend/public`** (not `public_html` only), if your host allows it.
4. After upload, **hard refresh** or clear cache; rebuild if you change `.env`.

### Option B — Static site only in `public_html` (API will show a different URL unless you proxy)

1. Open **`public_html`** (or the folder your domain uses).
2. Upload **everything inside** `dist/` (not the `dist` folder itself) so `public_html/index.html` exists.

If the Laravel API is on another hostname and you set `VITE_API_URL` to that host, **that URL will appear in the Network tab** — use Option A instead.

---

## Step 4: SprintPay webhook (Laravel API)

Wallet top-ups use the **Laravel** route:

1. In SprintPay, set the webhook URL to:  
   `https://<your-domain>/api/webhooks/sprintpay`  
   (same domain as in Option A, or your real API base URL.)
2. Configure `SPRINTPAY_WEBHOOK_SECRET` in `backend/.env` (see `docs/SPRINTPAY_WEBHOOK.md`).

---

## Step 5: Check the site

- Open your domain over **HTTPS**.
- Routes like `/auth`, `/dashboard` should work; **refresh** on those URLs should load the app (Laravel `Route::fallback` + `public/index.html` when using Option A).

---

## Troubleshooting

- **Blank page:** Check browser console (F12). Ensure env vars were set in `.env` **before** `npm run build`.
- **404 on refresh (Option B):** Ensure `.htaccess` was uploaded and `mod_rewrite` is on.
- **Wrong domain/folder:** If the app lives in a subfolder, set Vite `base` and rebuild, or fix document root to `backend/public`.
- **Still seeing a full backend URL in Network:** Rebuild with `VITE_API_URL` empty and deploy SPA into Laravel `public` (Option A).

### `POST /api/...` → **404** on production (e.g. `acelogstores.online`)

The API is **Laravel**, not static files. This usually means **`/api` never reaches `index.php`**.

1. **cPanel → Domains** → document root for `acelogstores.online` must be the folder that contains **`index.php`** from Laravel (`.../backend/public`), **not** only `public_html` with HTML/JS and no PHP.
2. On the server you must have the **full Laravel app**: `app/`, `bootstrap/`, `config/`, `public/`, `routes/`, `vendor/`, `backend/.env`, etc.
3. **`public/.htaccess`** on the server must be **Laravel’s** (rewrite to `index.php`). Delete any old **SPA-only** `.htaccess` that rewrites every request to `index.html`.
4. For a **root domain** like `https://acelogstores.online/`, **`RewriteBase` must be commented out** in `backend/public/.htaccess`. Only use `RewriteBase /something/` when the URL path includes that subfolder (e.g. `/backend/public/`).
5. **`APP_URL`** in `backend/.env` should match the real URL, e.g. `APP_URL=https://acelogstores.online`
6. Test: open `https://acelogstores.online/up` — Laravel should return **200** (health). If that 404s, PHP/Laravel routing isn’t wired.

### "Not Found" on `https://yourdomain.com/backend/public/`

1. **`backend/public/.htaccess` must include `RewriteBase /backend/public/`** (adjust if your folder name differs). Without it, Apache often returns 404 and never runs `index.php`.
2. **Rebuild the React app** with the same path in **root `.env`**:  
   `VITE_PUBLIC_PATH=/backend/public`  
   Then `npm run build` and upload `dist/*` into `backend/public/` again.  
   Otherwise `index.html` loads JS/CSS from `/assets/...` (site root) and everything 404s.
3. In **`backend/.env`**, set  
   `APP_URL=https://yourdomain.com/backend/public`  
   (no trailing slash is fine; Laravel normalizes).
4. Ensure **AllowOverride** allows `.htaccess` (most cPanel hosts do).
