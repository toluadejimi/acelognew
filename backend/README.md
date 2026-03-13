# Acelog Laravel API

REST API backend for the Acelog frontend. Uses Laravel 12, MySQL, and Sanctum for authentication.

## Setup

1. **Copy environment and configure MySQL:**

   ```bash
   cp .env.example .env
   # Edit .env: set DB_DATABASE, DB_USERNAME, DB_PASSWORD for MySQL
   ```

2. **Install dependencies and run migrations:**

   ```bash
   composer install
   php artisan key:generate
   php artisan migrate
   ```

3. **Create storage link (for uploads):**

   ```bash
   php artisan storage:link
   ```

4. **Optional – SprintPay (virtual accounts / webhook):**  
   Set `SPRINTPAY_API_KEY` and `SPRINTPAY_SECRET` in `.env`.

5. **CORS:**  
   If the frontend runs on a different origin, add it to `config/sanctum.php` under `stateful` or configure CORS in `bootstrap/app.php` / middleware.

## Run

```bash
php artisan serve
```

API base: `http://localhost:8000/api`

## Frontend

In the frontend `.env` set:

- `VITE_API_URL=http://localhost:8000`

Then run the Vite app and use the dashboard; all data goes through this API.
