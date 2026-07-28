import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgreementGate } from "@/components/site/AgreementGate";
import { GUEST_AGREEMENT_TEXT, GUEST_AGREEMENT_TITLE } from "@/lib/legal-agreements";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";


export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create an account — Colorfull" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleResend() {
    if (!email || resending) return;
    setResendMsg(null);
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    setResendMsg(error ? error.message : "Confirmation email re-sent. Check your inbox.");
  }
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please review and agree to the Guest & Attendee Agreement to continue.");
      return;
    }
    setError(null); setInfo(null); setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <p className="eyebrow">Apply to attend</p>
      <h1 className="mt-3 font-serif text-4xl">Create your <span className="brand-wordmark">Colorfull</span> account.</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        An account lets you request seats at curated tables and follow your favorite hosts.
      </p>
      <div className="mt-10">
        <GoogleSignInButton redirectPath="/dashboard" label="Sign up with Google" />
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Your name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <AgreementGate
          title={GUEST_AGREEMENT_TITLE}
          text={GUEST_AGREEMENT_TEXT}
          agreeLabel="I have read and agree to the Colorfull Guest & Attendee Agreement, including the assumption of risk, indemnification, content rights, non-circumvention, and binding arbitration provisions."
          checked={agreed}
          onCheckedChange={setAgreed}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">{info}</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="text-[11px] uppercase tracking-[0.22em] text-foreground underline underline-offset-[6px] hover:opacity-80 disabled:opacity-50"
            >
              {resending ? "Resending…" : "Resend confirmation email"}
            </button>
            {resendMsg && <p className="text-xs text-muted-foreground">{resendMsg}</p>}
          </div>
        )}
        <button type="submit" disabled={loading || !agreed}
          className="inline-flex h-12 w-full items-center justify-center bg-foreground text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60">
          {loading ? "Creating account…" : "Create account"}
        </button>

      </form>
      <p className="mt-8 text-sm text-muted-foreground">
        Already a member? <Link to="/login" search={{}} className="underline underline-offset-4 text-foreground">Sign in</Link>
      </p>
    </section>
  );
}
