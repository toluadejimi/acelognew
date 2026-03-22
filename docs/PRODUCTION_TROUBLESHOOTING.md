# Production not working (works on localhost)

Dev uses **Vite’s proxy** (`DEV_API_PROXY` / `DEV_API_PATH_PREFIX`). Those variables are **ignored in `npm run build`** — only **`VITE_*`** vars are baked into the JS.

## 1. Decide your architecture

### A) Same domain for SPA + Laravel (recommended)

- Example: everything at `https://host.hotelbiza.online/backend/public/`
- **Before `npm run build`**, in **project root** `.env`:
  - `VITE_API_URL=` (empty)
  - `VITE_PUBLIC_PATH=/backend/public` **only if** the browser URL contains `/backend/public`
  - If the site is at `https://yoursite.com/` with **no** subfolder → `VITE_PUBLIC_PATH=` empty
- Deploy **`dist/*`** into Laravel **`public/`** next to `index.php`.
- Point the domain’s **document root** at Laravel **`public`**.
- **`backend/.env`**: `APP_URL` must match the public URL (no trailing slash is fine).

### B) Frontend and API on different domains

- Example: SPA on `https://acelogstores.online`, API on `https://host.hotelbiza.online/backend/public`
- **Before `npm run build`**:
  ```env
  VITE_API_URL=https://host.hotelbiza.online/backend/public
  ```
  (No trailing slash.)
- In **`backend/.env`**, set **`CORS_ALLOWED_ORIGINS`** to include your **frontend** origin, e.g.:
  ```env
  CORS_ALLOWED_ORIGINS=https://acelogstores.online,https://www.acelogstores.online
  ```
- Run `php artisan config:clear` on the server after changing `.env`.

## 2. Quick checks

| Check | What to do |
|--------|------------|
| Wrong `/api` path | Open DevTools → Network. Failed calls show the exact URL. It must match where Laravel serves `/api`. |
| 404 on `/api/*` | Laravel not on that host, or wrong `VITE_PUBLIC_PATH` in the **build**. Rebuild after fixing `.env`. |
| CORS errors in console | Use **B** above: set `VITE_API_URL` + `CORS_ALLOWED_ORIGINS`. |
| Blank after login | Often `/api/user` 404 — same as wrong path / wrong build env. |
| `/up` returns 404 | Document root is not Laravel `public` or PHP not routing to `index.php`. |

## 3. Rebuild after any `.env` change

```bash
npm run build
```

Upload the **new** `dist` (or copy into `backend/public/`).

## 4. Remember

- **`DEV_API_PROXY`** / **`DEV_API_PATH_PREFIX`** → **local dev only** (Vite).
- **`VITE_*`** → **production** frontend bundle.
