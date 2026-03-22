import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, getSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    (async () => {
      // Fresh login: context already has user + token — do not call getSession() here.
      // getSession() clears the session if /api/user fails (static hosting / wrong base URL),
      // which left the app stuck after "Welcome back! Redirecting...".
      if (user) {
        setAuthenticated(true);
        try {
          const profile = await api<{ is_blocked?: boolean }>("/profile");
          if (!cancelled && profile?.is_blocked) setBlocked(true);
        } catch {
          // ignore
        }
        if (!cancelled) setLoading(false);
        return;
      }

      const session = await getSession();
      if (cancelled) return;
      if (!session?.user) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);
      try {
        const profile = await api<{ is_blocked?: boolean }>("/profile");
        if (!cancelled && profile?.is_blocked) {
          setBlocked(true);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, getSession]);

  if (authLoading || loading) return null;
  if (blocked) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "DM Sans, sans-serif", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Account Blocked</h2>
        <p style={{ color: "#64748B", marginBottom: 24 }}>Your account has been suspended. Please contact support for assistance.</p>
        <a href="/auth" style={{ color: "#4B7BF5", fontWeight: 600, textDecoration: "none" }}>Back to Login</a>
      </div>
    </div>
  );
  if (!authenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
