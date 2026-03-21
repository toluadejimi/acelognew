/**
 * Production subfolder deploy (e.g. cPanel: https://domain.com/backend/public/).
 * Set VITE_PUBLIC_PATH=/backend/public (no trailing slash). Leave empty for local dev / docroot = public.
 */
export const VITE_PUBLIC_PATH = (import.meta.env.VITE_PUBLIC_PATH || "").replace(/\/$/, "");
export const VITE_API_URL_RAW = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** Prefix for resolving relative storage/API URLs when not using a full VITE_API_URL host. */
export function getSameOriginPrefix(): string {
  return VITE_API_URL_RAW || VITE_PUBLIC_PATH;
}
