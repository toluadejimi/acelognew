import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthToken, type ApiError } from "@/lib/api";

const AUTH_USER_KEY = "auth_user_cache";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export type User = { id: string; email: string; name: string; roles?: string[] };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (user: User, token: string) => void;
  logout: () => void;
  getSession: () => Promise<{ user: User } | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (!localStorage.getItem("auth_token")) return null;
    return readCachedUser();
  });
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokenState(null);
    setAuthToken(null);
    localStorage.removeItem(AUTH_USER_KEY);
  }, []);

  const setSession = useCallback((u: User, t: string) => {
    setUser(u);
    setTokenState(t);
    setAuthToken(t);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore quota */
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const getSession = useCallback(async (): Promise<{ user: User } | null> => {
    const t = localStorage.getItem("auth_token");
    if (!t) return null;
    try {
      const data = await api<{ user: User }>("/user", { token: t });
      setUser(data.user);
      setTokenState(t);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      } catch {
        /* ignore */
      }
      return data;
    } catch (e) {
      const status = (e as ApiError).status;
      if (status === 401 || status === 403) {
        clearAuth();
        return null;
      }
      const cached = readCachedUser();
      if (cached) setUser(cached);
      return cached ? { user: cached } : null;
    }
  }, [clearAuth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem("auth_token");
      if (!t) {
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const data = await api<{ user: User }>("/user", { token: t });
        if (!cancelled) {
          setUser(data.user);
          setTokenState(t);
          try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        if (cancelled) return;
        const status = (e as ApiError).status;
        if (status === 401 || status === 403) {
          clearAuth();
        } else {
          const cached = readCachedUser();
          if (cached) setUser(cached);
          console.warn(
            "[Auth] /api/user failed (non-401). Rebuild with VITE_PUBLIC_PATH / VITE_API_URL matching your live site URL (see .env.example).",
            e,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clearAuth]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    setSession,
    logout,
    getSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
