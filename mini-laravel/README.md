# Mini Laravel storefront (Blade)

Separate Laravel app that mirrors the **same HTML structure and CSS** as the main React app in the parent repo (`../src/styles/landing.css`, `auth.css`).

## Backend URL (main app + API)

Set **`BACKEND_URL`** in `.env` to your real **React + Laravel** base (no trailing slash), e.g.:

```env
BACKEND_URL=https://host.hotelbiza.online/backend/public
```

Blade **Sign in**, **Browse catalog**, and nav logo then point at that host (`/auth`, `/`, etc.).  
If **`BACKEND_URL`** is empty, links fall back to this mini app’s `APP_URL`.

## Run locally

```bash
cd mini-laravel
cp .env.example .env
php artisan key:generate
php artisan serve
```

Open **http://127.0.0.1:8000** — marketing landing (Blade)  
**http://127.0.0.1:8000/auth** — shortcut page with link to **`BACKEND_URL/auth`**

## CSS

Styles are copied to `public/css/react-mirror/`. To refresh from the main project:

```bash
cp ../src/styles/landing.css public/css/react-mirror/
cp ../src/styles/auth.css public/css/react-mirror/
```

## Customize

- **App name / branding:** set `APP_NAME` in `.env`, or pass `siteLogo` from `StorefrontController::sharedData()`.
- **Not** the same as `../backend` — deploy this as its own site if you want a server-rendered mirror.

## Requirements

- PHP 8.2+
- Composer dependencies already installed (`vendor/`)
