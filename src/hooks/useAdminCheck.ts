import { useAuth } from "@/contexts/AuthContext";

export function useAdminCheck() {
  const { user, loading } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes("admin"));
  return { isAdmin, loading };
}
