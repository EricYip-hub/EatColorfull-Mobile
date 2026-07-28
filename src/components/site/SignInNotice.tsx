import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

type Reason =
  | "favorites"
  | "chefbot"
  | "host"
  | "tastemaker"
  | "attend"
  | "checkout"
  | "reserve"
  | "collaborate"
  | "submit";

type Props = {
  /** Backwards-compatible free-text (unused for redirect message). */
  action?: string;
  reason?: Reason;
  redirect?: string;
};

/**
 * When an unauthenticated user lands on a submission surface, redirect them
 * straight to /login with a reason so the sign-in page explains why. Renders
 * nothing for signed-in users. Wait for auth to hydrate before redirecting to
 * avoid bouncing signed-in users on hard refresh.
 */
export function SignInNotice({ reason = "submit", redirect }: Props) {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  const target =
    redirect ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");
  return <Navigate to="/login" search={{ redirect: target, reason } as any} replace />;
}
