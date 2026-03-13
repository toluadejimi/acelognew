import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((u: User, t: string) => {
    setUser(u);
    setTokenState(t);
    setAuthToken(t);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setTokenState(null);
    setAuthToken(null);
  }, []);

  const getSession = useCallback(async (): Promise<{ user: User } | null> => {
    const t = localStorage.getItem("auth_token");
    if (!t) return null;
    try {
      const data = await api<{ user: User }>("/user", { token: t });
      setUser(data.user);
      setTokenState(t);
      return data;
    } catch {
      setAuthToken(null);
      setUser(null);
      setTokenState(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem("auth_token");
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const data = await api<{ user: User }>("/user", { token: t });
        if (!cancelled) {
          setUser(data.user);
          setTokenState(t);
        }
      } catch {
        if (!cancelled) {
          setAuthToken(null);
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
