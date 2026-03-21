/**
 * Central API client for Laravel backend.
 * Uses VITE_API_URL (full host), or same-origin with optional VITE_PUBLIC_PATH subfolder.
 */

import { VITE_API_URL_RAW, VITE_PUBLIC_PATH } from "./env";

function apiRoot(): string {
  if (VITE_API_URL_RAW) {
    return `${VITE_API_URL_RAW}/api`;
  }
  return `${VITE_PUBLIC_PATH}/api`;
}

export type ApiError = { message: string; errors?: Record<string, string[]> };

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), ...init } = options;
  const url = path.startsWith("http") ? path : `${apiRoot()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { message?: string; error?: string; errors?: Record<string, string[]> };
    const err: ApiError = {
      message: d.message || d.error || res.statusText || "Request failed",
    };
    if (d.errors) err.errors = d.errors;
    throw err;
  }
  return data as T;
}

export async function apiFormData<T = unknown>(
  path: string,
  formData: FormData,
  token?: string | null
): Promise<T> {
  const t = token ?? getToken();
  const url = `${apiRoot()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { message: (data as { message?: string }).message || res.statusText } as ApiError;
  }
  return data as T;
}
