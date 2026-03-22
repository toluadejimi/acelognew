# Mini Laravel storefront (Blade only)

The user **dashboard** (`/dashboard`) and **admin** (`/admin`) are **Blade templates** + **vanilla JavaScript**. They do **not** load the React/Vite bundle.

- **Styles**: copied from the main app’s `src/styles/dashboard.css` and `src/styles/admin.css` into `public/css/`. After you change those files in the repo, copy again:
  ```bash
  cp src/styles/dashboard.css mini-laravel/public/css/dashboard.css
  cp src/styles/admin.css mini-laravel/public/css/admin.css
  ```
- **API**: the browser only calls **same-origin** `/api/...`. `BACKEND_URL` stays on the server in `.env` (proxy). Nothing in the page exposes the backend base URL to clients.

## Scripts

- `public/js/mini-api.js` — JSON `fetch` to `/api/*`
- `public/js/dashboard-blade.js` — store UI (catalog, orders, wallet, support, …)
- `public/js/admin-blade.js` — admin tabs (tables + refresh)

Slider images live under `public/slider/` (copy from `dist/slider` if missing).
