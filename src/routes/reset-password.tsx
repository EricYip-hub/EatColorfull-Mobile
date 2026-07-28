import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Set a new password — Colorfull' }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When Supabase sends a recovery link, it appends an access token in the URL
  // hash and onAuthStateChange fires "PASSWORD_RECOVERY". We wait for that
  // (or an already-existing session from the link) before showing the form.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo('Password updated. Redirecting you to your dashboard…');
    setTimeout(() => navigate({ to: '/dashboard' }), 1200);
  }

  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <p className="eyebrow">Reset password</p>
      <h1 className="mt-3 font-serif text-4xl">Set a new password.</h1>
      {!ready ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Waiting for your reset link to verify… If you didn't arrive here from your email, request a new link from the sign-in page.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
            />
            <p className="mt-2 text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-foreground">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center bg-foreground text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </section>
  );
}
