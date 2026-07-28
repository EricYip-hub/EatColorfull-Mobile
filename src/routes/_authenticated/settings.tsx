import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your account — Colorfull" },
      { name: "description", content: "Manage your Colorfull profile and account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isHost, signOut } = useAuth();
  const load = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);

  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load()
      .then((r) => {
        setDisplayName(r.profile?.display_name ?? "");
        setDob(r.profile?.date_of_birth ?? "");
        setProfileEmail(r.email ?? user?.email ?? "");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { display_name: displayName.trim(), date_of_birth: dob || null } });
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const initial = (displayName || profileEmail || "C").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-3 font-serif text-5xl md:text-6xl">My profile</h1>

      <section className="mt-10 border border-border bg-card">
        <div className="grid gap-8 p-6 md:grid-cols-[10rem_1fr] md:p-8">
          <div className="flex md:block">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary font-serif text-5xl text-primary-foreground">
              {initial}
            </div>
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Profile details</p>
            <h2 className="mt-3 truncate font-serif text-3xl md:text-4xl">
              {displayName || "Add your name"}
            </h2>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {profileEmail || user?.email || "Email not available"}
            </p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border-t border-border pt-3">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">My name</dt>
                <dd className="mt-1 truncate text-sm">{displayName || "—"}</dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Date of birth</dt>
                <dd className="mt-1 text-sm">{dob || "—"}</dd>
              </div>
              <div className="border-t border-border pt-3">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Role</dt>
                <dd className="mt-1 text-sm">{isHost ? "Host" : "Guest"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <p className="eyebrow">Edit profile</p>
        <form onSubmit={handleSave} className="mt-6 grid gap-6 border border-border bg-background p-6 md:p-8">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              My name
            </label>
            <input
              id="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!loaded}
              className="h-11 border border-border bg-background px-4 text-sm focus:border-foreground focus:outline-none disabled:opacity-50"
              placeholder="Your name"
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="dob" className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Date of birth
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={!loaded}
              className="h-11 border border-border bg-background px-4 text-sm focus:border-foreground focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Email</label>
            <div className="flex h-11 items-center border border-dashed border-border bg-muted/40 px-4 text-sm text-muted-foreground">
              {profileEmail || user?.email || "—"}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !loaded}
            className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="mt-14">
        <p className="eyebrow">Quick links</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            Your tables
          </Link>
          {isHost && (
            <Link
              to="/host/dashboard"
              className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
            >
              Host dashboard
            </Link>
          )}
        </div>
      </section>

      <section className="mt-14">
        <p className="eyebrow">Session</p>
        <button
          onClick={() => signOut()}
          className="mt-6 inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
