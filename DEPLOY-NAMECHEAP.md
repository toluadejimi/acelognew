# Deploy to Namecheap Shared Hosting (cPanel)

Your app is a **static React (Vite) build**. Backend (Supabase) stays in the cloud, so you only upload the built files.

---

## Step 1: Set environment variables (before building)

The build bakes your `.env` into the app. Set these in `.env` for production:

- `VITE_SUPABASE_URL` – your Supabase project URL  
- `VITE_SUPABASE_PUBLISHABLE_KEY` – your Supabase anon key  
- `VITE_SPRINTPAY_API_KEY` – your SprintPay API key (for pay redirect)

---

## Step 2: Build the project

On your computer, in the project folder:

```bash
cd /Users/apple/Downloads/assets/social
npm install
npm run build
```

This creates a **`dist`** folder with the site (HTML, JS, CSS).

---

## Step 3: Upload to Namecheap via cPanel

1. Log in to **Namecheap cPanel** (or your hosting cPanel).
2. Open **File Manager**.
3. Go to **`public_html`** (this is your site root; use the folder your domain points to if different).
4. **Delete or backup** any old files in `public_html` if this is a new deploy.
5. Upload the **contents** of the **`dist`** folder:
   - Open your local **`social/dist`** folder.
   - Select **all** files and folders inside it (e.g. `index.html`, `assets/`, `.htaccess`).
   - Upload them into `public_html` (so `index.html` is directly inside `public_html`).

Do **not** upload the whole `dist` folder as a single folder; upload **what’s inside** `dist` so that `public_html/index.html` exists.

---

## Step 4: (Optional) SprintPay webhook proxy

If you use the PHP proxy for SprintPay:

1. Upload **`public/sprintpay-webhook-proxy.php`** into `public_html` as well.
2. In SprintPay, set webhook URL to:  
   `https://yourdomain.com/sprintpay-webhook-proxy.php`

---

## Step 5: Check the site

- Open **https://yourdomain.com** (or your actual domain).
- You should see the app; routes like `/auth`, `/dashboard` should work and refresh correctly (thanks to `.htaccess`).

---

## Troubleshooting

- **Blank page:** Check browser console (F12). Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` were set in `.env` **before** `npm run build`.
- **404 on refresh:** Ensure `.htaccess` was uploaded and that your host has `mod_rewrite` enabled (most Namecheap shared plans do).
- **Wrong domain/folder:** If your domain points to a subfolder (e.g. `public_html/myapp`), upload the contents of `dist` into that folder and set `RewriteBase /myapp/` in `.htaccess`.
