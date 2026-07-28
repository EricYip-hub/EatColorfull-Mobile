import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) {
    // Avoid redirect loops: don't send users to /login with a redirect back to /login
    if (location.pathname === "/login") {
      return null;
    }
    const safeRedirect = location.href.startsWith("/login") ? "/dashboard" : location.href;
    const p = location.pathname;
    let reason: string | undefined;
    if (p.startsWith("/chefbot")) reason = "chefbot";
    else if (
      p.startsWith("/favorites") ||
      p.startsWith("/saved") ||
      p.startsWith("/dashboard")
    )
      reason = "favorites";
    return (
      <Navigate
        to="/login"
        search={{ redirect: safeRedirect, ...(reason ? { reason } : {}) } as any}
        replace
      />
    );
  }
  return <Outlet />;
}
