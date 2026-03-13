/**
 * Supabase has been disconnected. This app uses the Laravel API backend.
 * Configure VITE_API_URL in .env and use the api() helper from @/lib/api.
 */

export const supabase = new Proxy({} as any, {
  get() {
    throw new Error(
      "Supabase is disconnected. This project uses the Laravel API. Use api() from @/lib/api and auth from @/contexts/AuthContext."
    );
  },
});
