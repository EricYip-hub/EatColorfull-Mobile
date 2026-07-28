import { useState } from 'react';
import { lovable } from '@/integrations/lovable';

type Props = { label?: string; redirectPath?: string };

export function GoogleSignInButton({ label = 'Continue with Google', redirectPath = '/dashboard' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : undefined,
    });
    if (result.redirected) return; // browser is navigating to Google
    if (result.error) {
      setError(result.error.message ?? 'Google sign-in failed');
      setLoading(false);
      return;
    }
    // Tokens received — full navigation so route guards re-evaluate cleanly
    if (typeof window !== 'undefined') window.location.href = redirectPath;
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 border border-border bg-background text-[11px] uppercase tracking-[0.24em] text-foreground hover:bg-secondary disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.46c-.28 1.48-1.13 2.74-2.4 3.58v2.97h3.88c2.27-2.09 3.55-5.18 3.55-8.79z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-2.97c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.71-4.94H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
          <path fill="#FBBC05" d="M5.29 14.34c-.24-.72-.38-1.49-.38-2.34s.14-1.62.38-2.34V6.57H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.43l4-3.09z"/>
          <path fill="#EA4335" d="M12 4.74c1.76 0 3.34.61 4.58 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.57l4 3.09C6.24 6.85 8.88 4.74 12 4.74z"/>
        </svg>
        {loading ? 'Redirecting…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
