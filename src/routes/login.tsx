import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const raw = typeof s.redirect === "string" ? s.redirect : "";
    // Never let the redirect target be /login (prevents accumulating ?redirect chains)
    const redirect = raw && !raw.startsWith("/login") ? raw : "/dashboard";
    const reasonRaw = typeof s.reason === "string" ? s.reason : "";
    const allowed = ["favorites", "chefbot", "host", "tastemaker", "attend", "checkout", "reserve", "collaborate", "submit"] as const;
    const reason = (allowed as readonly string[]).includes(reasonRaw) ? (reasonRaw as (typeof allowed)[number]) : "" as (typeof allowed)[number] | "";
    return { redirect, reason };
  },
  head: () => ({ meta: [{ title: "Sign in — Colorfull" }] }),
  component: LoginPage,
});


function LoginPage() {
  const navigate = useNavigate();
  const { redirect, reason } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot-password state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: redirect });
  }

  async function onForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetSent(false);
    const trimmed = resetEmail.trim();
    // Light client-side validation; server enforces the rest.
    if (!trimmed || trimmed.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResetError("Please enter a valid email address.");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    // Always show the same confirmation regardless of whether the email exists,
    // to avoid leaking which addresses have accounts.
    setResetSent(true);
  }

  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-3 font-serif text-4xl">Welcome back to the table.</h1>
      {reason && (
        <div className="mt-6 rounded-md border border-foreground/15 bg-foreground/5 p-4 text-sm text-foreground/80">
          {reason === "favorites" && "Sign in or create an account to save your favorite chefs."}
          {reason === "chefbot" && "Sign in or create an account to chat with Chefbot."}
          {reason === "host" && "Sign in or create an account to apply as a host."}
          {reason === "tastemaker" && "Sign in or create an account to apply as a tastemaker."}
          {reason === "attend" && "Sign in or create an account to request to attend."}
          {reason === "checkout" && "Sign in or create an account to place an order."}
          {reason === "reserve" && "Sign in or create an account to reserve a seat."}
          {reason === "collaborate" && "Sign in or create an account to request a collaboration."}
          {reason === "submit" && "Sign in or create an account to submit this form."}
        </div>
      )}

      <div className="mt-10">
        <GoogleSignInButton redirectPath={redirect} />
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="login-email">Email</label>
          <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="login-password">Password</label>
            <button
              type="button"
              onClick={() => {
                setShowForgot((v) => !v);
                setResetError(null);
                setResetSent(false);
                if (!resetEmail) setResetEmail(email);
              }}
              className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              aria-expanded={showForgot}
              aria-controls="forgot-password-panel"
            >
              Forgot password?
            </button>
          </div>
          <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center bg-foreground text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {showForgot && (
        <div
          id="forgot-password-panel"
          className="mt-8 border border-border bg-secondary/40 p-6"
        >
          <p className="eyebrow">Reset password</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email on your account and we'll send you a link to set a new password.
          </p>
          <form onSubmit={onForgotSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                maxLength={255}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
              />
            </div>
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            {resetSent && (
              <p className="text-sm text-foreground">
                If an account exists for that email, a reset link is on its way. Check your inbox.
              </p>
            )}
            <button
              type="submit"
              disabled={resetLoading}
              className="inline-flex h-11 w-full items-center justify-center border border-foreground text-[11px] uppercase tracking-[0.24em] hover:bg-foreground hover:text-background disabled:opacity-60"
            >
              {resetLoading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        New to <span className="brand-wordmark">Colorfull</span>? <Link to="/signup" className="underline underline-offset-4 text-foreground">Create an account</Link>
      </p>
    </section>
  );
}
