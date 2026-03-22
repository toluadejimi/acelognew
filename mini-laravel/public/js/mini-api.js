/**
 * Same-origin API client — calls this app's /api/* which proxies to BACKEND_URL.
 * Mirrors the React app's fetch pattern (session stores token after login; proxy adds Bearer).
 */
async function miniApi(path, options = {}) {
  const p = path.startsWith("/") ? path : "/" + path;
  const url = "/api" + p;
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText || "Request failed");
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }
  return data;
}
