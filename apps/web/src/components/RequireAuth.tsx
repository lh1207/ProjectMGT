import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../lib/auth-store";

// Route guard: redirects unauthenticated users to /login.
export function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
