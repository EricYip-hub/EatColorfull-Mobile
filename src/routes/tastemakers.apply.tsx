import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AgreementGate } from "@/components/site/AgreementGate";
import { HOST_AGREEMENT_TEXT, HOST_AGREEMENT_TITLE } from "@/lib/legal-agreements";
import { logFormSubmission } from "@/lib/log-form-submission";
import { useAuth } from "@/lib/auth-context";
import { SignInNotice } from "@/components/site/SignInNotice";


export const Route = createFileRoute("/tastemakers/apply")({
  head: () => ({
    meta: [
      { title: "Apply as a Tastemaker — Colorfull" },
      {
        name: "description",
        content:
          "A curated application for chefs, cultural hosts, and food creators who want to bring their content offline.",
      },
      { property: "og:title", content: "Apply as a Tastemaker — Colorfull" },
      {
        property: "og:description",
        content:
          "From content to community. Apply to host tables, offer meal plans, and collaborate with Colorfull.",
      },
    ],
  }),
  component: TastemakerApply,
});

type FormData = {
  name: string;
  email: string;
  phone: string;
  city: string;
  links: string;
  contentType: string;
  cuisines: string;
  hostedBefore: "yes" | "no" | "";
  wantsToHost: boolean;
  wantsMealPlans: boolean;
  bio: string;
  whyJoin: string;
  samples: string;
};

const EMPTY: FormData = {
  name: "",
  email: "",
  phone: "",
  city: "",
  links: "",
  contentType: "",
  cuisines: "",
  hostedBefore: "",
  wantsToHost: false,
  wantsMealPlans: false,
  bio: "",
  whyJoin: "",
  samples: "",
};

function TastemakerApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!user) {
      toast.info("Please sign in or create an account to apply as a tastemaker.");
      navigate({ to: "/login", search: { redirect: "/tastemakers/apply" } as any });
      return;
    }
    if (!agreed) {
      setAgreeError("Please review and agree to the Host & Chef Agreement to continue.");
      return;
    }
    setAgreeError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    void logFormSubmission({
      source: "tastemaker_application",
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      location: data.city || null,
      notes: data.whyJoin || data.bio || null,
      payload: {
        links: data.links,
        contentType: data.contentType,
        cuisines: data.cuisines,
        hostedBefore: data.hostedBefore,
        wantsToHost: data.wantsToHost,
        wantsMealPlans: data.wantsMealPlans,
        samples: data.samples,
      },
    });
    setSubmitting(false);
    setSubmitted(true);
  };


  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="eyebrow">Application received</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">
          Thank you for applying.
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          Our team personally reviews every tastemaker application. We'll be in touch within
          two weeks if your world feels like a fit for <span className="brand-wordmark">Colorfull</span>.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/tastemakers"
            className="inline-flex h-11 items-center justify-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            Browse tastemakers
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
          >
            Back home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link
        to="/tastemakers"
        className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        ← Tastemakers
      </Link>
      <p className="eyebrow mt-6">Apply as a tastemaker</p>
      <h1 className="mt-3 font-serif text-4xl leading-[1.05] md:text-5xl text-balance">
        Share what you cook. Host who you inspire.
      </h1>
      <p className="mt-5 text-muted-foreground leading-relaxed">
        Every <span className="brand-wordmark">Colorfull</span> tastemaker is hand-selected.
        Tell us about your food world — we read every application personally.
      </p>

      <SignInNotice reason="tastemaker" />

      <form
        onSubmit={handleSubmit}
        aria-busy={submitting}
        className="mt-12 grid gap-6"
      >
        <fieldset disabled={submitting} className="grid gap-6 contents">
          <Row>
            <Field label="Name">
              <input className="tm-input" required value={data.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="tm-input" required value={data.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Phone number">
              <input className="tm-input" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="City / neighborhood">
              <input className="tm-input" required value={data.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
          </Row>
          <Field label="Instagram / TikTok / website">
            <input className="tm-input" placeholder="@handle, links separated by commas" value={data.links} onChange={(e) => update("links", e.target.value)} />
          </Field>
          <Field label="What kind of food content do you create?">
            <textarea className="tm-input" rows={3} value={data.contentType} onChange={(e) => update("contentType", e.target.value)} />
          </Field>
          <Field label="What cuisines or food cultures do you focus on?">
            <input className="tm-input" value={data.cuisines} onChange={(e) => update("cuisines", e.target.value)} />
          </Field>

          <Field label="Have you hosted dinners before?">
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update("hostedBefore", v)}
                  className={`h-10 rounded-full border px-5 text-[11px] uppercase tracking-[0.2em] ${
                    data.hostedBefore === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={data.wantsToHost}
                onChange={(e) => update("wantsToHost", e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-serif text-base">I'd like to host a Colorfull table.</span>
                <span className="block text-xs text-muted-foreground">
                  We'll guide you through hosting your first dinner.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={data.wantsMealPlans}
                onChange={(e) => update("wantsMealPlans", e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-serif text-base">
                  I'd like to offer meal plans inspired by my content.
                </span>
                <span className="block text-xs text-muted-foreground">
                  Members can request a week of cooking inspired by your world.
                </span>
              </span>
            </label>
          </div>

          <Field label="Sample food photos or videos (links)">
            <textarea
              className="tm-input"
              rows={2}
              placeholder="Paste links to your best food work"
              value={data.samples}
              onChange={(e) => update("samples", e.target.value)}
            />
          </Field>
          <Field label="Short bio">
            <textarea className="tm-input" rows={3} required value={data.bio} onChange={(e) => update("bio", e.target.value)} />
          </Field>
          <Field label="Why do you want to join Colorfull?">
            <textarea className="tm-input" rows={4} required value={data.whyJoin} onChange={(e) => update("whyJoin", e.target.value)} />
          </Field>

          <AgreementGate
            title={HOST_AGREEMENT_TITLE}
            text={HOST_AGREEMENT_TEXT}
            agreeLabel="I have read and agree to the Colorfull Host & Chef Agreement, including the platform-only acknowledgment, marketing and data-use consent, content rights, non-circumvention, indemnification, and binding arbitration."
            checked={agreed}
            onCheckedChange={(v) => { setAgreed(v); if (v) setAgreeError(null); }}
          />
          {agreeError && (
            <p className="text-sm text-destructive" role="alert">{agreeError}</p>
          )}

          <div className="mt-2 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/tastemakers"
              className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !agreed}
              className="inline-flex h-12 items-center justify-center bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background transition-opacity hover:bg-foreground/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>

        </fieldset>
      </form>

      <style>{`
        .tm-input {
          display: block;
          width: 100%;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          border-radius: 0.5rem;
          transition: border-color 120ms ease;
          font-family: inherit;
        }
        .tm-input:focus { outline: none; border-color: var(--foreground); }
        .tm-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--muted); }
      `}</style>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 sm:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
