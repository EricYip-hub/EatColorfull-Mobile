import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { SignInNotice } from "@/components/site/SignInNotice";
import hostImg from "@/assets/host-portrait.jpg";

export const Route = createFileRoute("/host")({
  head: () => ({
    meta: [
      { title: "Apply to Host — Colorfull" },
      { name: "description", content: "Colorfull hosts are chefs, storytellers, and cultural creators who craft meaningful dinners around one shared table." },
      { property: "og:title", content: "Apply to Host — Colorfull" },
      { property: "og:description", content: "Chefs, storytellers, and cultural creators crafting meaningful dinners around one shared table." },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: HostApply,
});

const FIELDS = [
  ["name", "Name", "text"],
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["location", "Location (city, neighborhood)", "text"],
  ["instagram", "Instagram or website", "text"],
] as const;

function HostApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleResend() {
    if (!submittedEmail || resending) return;
    setResendMsg(null);
    setResending(true);
    try {
      const res = await fetch("/api/public/host-application/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });
      if (res.ok) {
        setResendMsg("Confirmation email re-sent. Check your inbox.");
      } else if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setResendMsg(body?.error ?? "Please wait a moment before resending.");
      } else {
        setResendMsg("Could not resend right now. Try again in a moment.");
      }
    } catch {
      setResendMsg("Could not resend right now. Try again in a moment.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!user) {
      toast.info("Please sign in or create an account to apply as a host.");
      navigate({ to: "/login", search: { redirect: "/host" } as any });
      return;
    }
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Cap total upload size at 25MB
    let totalSize = 0;
    for (const [, v] of fd.entries()) {
      if (v instanceof File) totalSize += v.size;
    }
    if (totalSize > 25 * 1024 * 1024) {
      setError("Uploaded files exceed the 25MB limit. Please reduce file sizes.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/public/host-application", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Submission failed (${res.status})`);
      }
      setSubmittedEmail(String(fd.get("email") || ""));
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="eyebrow">For hosts</p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl text-balance">
              Apply to host a table.
            </h1>
            <p className="mt-6 max-w-xl text-muted-foreground leading-relaxed">
              <span className="brand-wordmark">Colorfull</span> hosts are chefs, storytellers, cultural creators, home cooks, artists,
              wellness guides, and community builders who create meaningful dining experiences
              around one shared table.
            </p>
            <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
              We're a small, curated community of hosts who treat hospitality as a craft.
            </p>
            <a
              href="#apply"
              className="mt-6 inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to Host
            </a>
          </div>
          <div className="aspect-[4/5] overflow-hidden bg-muted">
            <img src={hostImg} alt="A Colorfull host" loading="lazy" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">Host Compliance</p>
          <h2 className="mt-3 font-serif text-3xl">What it means to host with Colorfull.</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="brand-wordmark">Colorfull</span> is a curated platform for private dining, chef-led gatherings, and
              social table experiences. Approved hosts, chefs, caterers, venues, permitted home
              kitchen operators, and other providers are responsible for ensuring their experience
              complies with all applicable food safety, health, zoning, business licensing, alcohol,
              tax, insurance, and local permit requirements.
            </p>
            <p>
              Before hosting, approved hosts may be required to sign <span className="brand-wordmark">Colorfull</span>'s Host &amp; Chef
              Agreement, provide compliance information, upload supporting documents, and confirm
              that they are legally authorized to host the proposed experience at the proposed
              location.
            </p>
            <p>
              <span className="brand-wordmark">Colorfull</span> does not provide legal, tax, insurance, food safety, zoning, or
              permitting advice. Hosts are responsible for confirming their own compliance with
              applicable laws and local agencies.
            </p>
          </div>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-6 py-20 scroll-mt-24">
        {submitted ? (
          <div className="border border-border bg-secondary/40 p-12 text-center">
            <p className="eyebrow">Thank you</p>
            <h2 className="mt-3 font-serif text-4xl">Your host application has arrived.</h2>
            <p className="mt-4 text-muted-foreground">
              We read every application personally. You'll hear from us within 24 hours.
            </p>
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">Didn't receive a confirmation email?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !submittedEmail}
                className="mt-2 text-[11px] uppercase tracking-[0.22em] text-foreground underline underline-offset-[6px] hover:opacity-80 disabled:opacity-50"
              >
                {resending ? "Resending…" : "Resend confirmation email"}
              </button>
              {resendMsg && <p className="mt-2 text-xs text-muted-foreground">{resendMsg}</p>}
            </div>
          </div>
        ) : (
          <>
          <SignInNotice reason="host" />
          <form onSubmit={handleSubmit} className="space-y-10">
            <div>
              <p className="eyebrow">About you</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {FIELDS.map(([name, label, type]) => (
                  <label key={name} className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
                    <input name={name} type={type} required={name !== "instagram"} disabled={submitting} className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground disabled:opacity-50" />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow">Your craft</p>
              <div className="mt-6 space-y-6">
                <Field label="Type of experience you want to host">
                  <input name="experience_type" className="input" required disabled={submitting} />
                </Field>
                <Field label="Food or hospitality background">
                  <textarea name="background" rows={3} className="input" required disabled={submitting} />
                </Field>
                <Field label="Sample menu or concept">
                  <textarea name="sample_menu" rows={4} className="input" required disabled={submitting} />
                </Field>
                <Field label="Maximum guest capacity">
                  <input name="guest_count" type="number" min={4} max={50} className="input" required disabled={submitting} />
                </Field>
                <Field label="Do you have access to a permitted or compliant hosting location?">
                  <select name="location_status" className="input" required disabled={submitting} defaultValue="">
                    <option value="" disabled>Select…</option>
                    <option>Yes, I have a permitted location</option>
                    <option>Private residence — compliance review required before approval.</option>
                    <option>Not yet</option>
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Private home food service may be regulated by state, county, and city law,
                    including MEHKO rules where available. A private home is not automatically
                    approved for paid dining experiences. Hosts may not list or host any paid food
                    experience unless they are legally authorized to do so.
                  </p>
                </Field>
              </div>
            </div>

            <div>
              <p className="eyebrow">Compliance details</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Required fields depend on your event type. Approved hosts may be asked to upload
                supporting documents (food handler card, CFPM certificate, MEHKO permit, catering
                permit, business license, general liability insurance, liquor liability,
                venue/lease/HOA approval) before listing.
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Field label="Food preparation location">
                  <select name="food_prep_location" className="input" disabled={submitting} defaultValue="">
                    <option value="" disabled>Select…</option>
                    <option>Private home</option>
                    <option>Commercial kitchen</option>
                    <option>Restaurant</option>
                    <option>Caterer</option>
                    <option>Venue kitchen</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="County / city where the experience takes place">
                  <input name="county_city" className="input" disabled={submitting} />
                </Field>
                <Field label="Permit number (if applicable)">
                  <input name="permit_number" className="input" disabled={submitting} />
                </Field>
                <Field label="Issuing agency (if applicable)">
                  <input name="permit_agency" className="input" disabled={submitting} />
                </Field>
                <Field label="Permit expiration date">
                  <input name="permit_expiration" type="date" className="input" disabled={submitting} />
                </Field>
                <Field label="Emergency contact (name + phone)">
                  <input name="emergency_contact" className="input" disabled={submitting} />
                </Field>
              </div>
            </div>

            <div>
              <Field label="Why do you want to host with Colorfull?">
                <textarea name="motivation" rows={4} className="input" required disabled={submitting} />
              </Field>
            </div>

            <div>
              <p className="eyebrow">Supporting documents</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Upload any documents you already have. All files are stored privately and only
                reviewed by the <span className="brand-wordmark">Colorfull</span> compliance team.
                PDF, JPG, or PNG · 10MB max per file · 25MB total.
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <FileField name="doc_food_handler" label="Food handler card" />
                <FileField name="doc_cfpm" label="CFPM certificate" />
                <FileField name="doc_mehko" label="MEHKO permit" />
                <FileField name="doc_catering" label="Catering permit" />
                <FileField name="doc_business_license" label="Business license" />
                <FileField name="doc_gl_insurance" label="General liability insurance" />
                <FileField name="doc_liquor" label="Liquor liability insurance" />
                <FileField name="doc_venue_approval" label="Venue / lease / HOA approval" />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Hosts are responsible for complying with applicable local food, health, permitting,
              and safety requirements. See our{" "}
              <Link to="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
              <Link to="/community" className="underline underline-offset-2">Community Standards</Link>.
            </p>

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Apply to Host a Table"}
            </button>

            <style>{`.input { margin-top: .5rem; height: 2.75rem; width: 100%; border: 1px solid var(--color-border); background: var(--color-background); padding: 0 .75rem; font-size: .875rem; outline: none; } textarea.input { height: auto; padding: .75rem; line-height: 1.5; } .input:focus { border-color: var(--color-foreground); } .input:disabled { opacity: 0.5; cursor: not-allowed; }`}</style>
          </form>
          </>
        )}
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input
        name={name}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="mt-2 block w-full text-xs file:mr-3 file:border file:border-border file:bg-secondary/50 file:px-3 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.18em] file:text-foreground hover:file:bg-secondary"
      />
    </label>
  );
}
