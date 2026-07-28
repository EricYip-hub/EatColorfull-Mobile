import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { SignInNotice } from "@/components/site/SignInNotice";
import { z } from "zod";
import { TABLES } from "@/lib/tables-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgreementGate } from "@/components/site/AgreementGate";
import {
  GUEST_AGREEMENT_TEXT,
  GUEST_AGREEMENT_TITLE,
  HOST_AGREEMENT_TEXT,
  HOST_AGREEMENT_TITLE,
} from "@/lib/legal-agreements";
import { logFormSubmission, submitApplication } from "@/lib/log-form-submission";
import mosheImage from "@/assets/moshe-fhima.png.asset.json";
import irieImage from "@/assets/vince-macintosh.jpg.asset.json";


const intentSchema = z.enum(["attend", "host"]);
type Intent = z.infer<typeof intentSchema>;

const dinnerSchema = z.enum(["moshe", "irie"]);
type Dinner = z.infer<typeof dinnerSchema>;

const DINNER_INFO: Record<Dinner, { name: string; tagline: string; link: string; date: string; location: string }> = {
  moshe: {
    name: "Moshe Fhima — Mediterranean Dinner",
    tagline: "Handmade pasta, wood-fired breads, and the warmth of a chef who cooks from memory.",
    link: "/chefs/moshe-fhima",
    date: "By request",
    location: "Location coordinated with Chef Moshe",
  },
  irie: {
    name: "Irie Supper Club — Caribbean Tasting (Vince McIntosh)",
    tagline: "A curated Caribbean tasting menu meant to be shared, story and all.",
    link: "/irie-supper-club",
    date: "Wednesday, June 3, 2026",
    location: "21 Union Jack, Marina Del Rey, CA",
  },
};

const searchSchema = z.object({
  table: z.string().optional(),
  intent: intentSchema.optional(),
  dinner: dinnerSchema.optional(),
});

export const Route = createFileRoute("/apply")({
  validateSearch: (s) => searchSchema.parse(s),
  head: ({ match }) => {
    const intent = (match.search as { intent?: Intent }).intent;
    const title =
      intent === "host"
        ? "Apply to Host — Colorfull"
        : intent === "attend"
          ? "Apply to Attend — Colorfull"
          : "Apply — Colorfull";
    const description =
      intent === "host"
        ? "Apply to host a curated communal dinner."
        : "Apply for a seat at a curated communal dinner.";
    return { meta: [{ title }, { name: "description", content: description }] };
  },
  component: Apply,
});

function Apply() {
  const { table: tableId, intent, dinner } = Route.useSearch();

  // If guest arrived with a table id, treat as attend intent automatically.
  if (!intent) {
    if (tableId) return <Navigate to="/apply" search={{ table: tableId, intent: "attend" }} replace />;
    if (dinner) return <Navigate to="/apply" search={{ dinner, intent: "attend" }} replace />;
    return <Navigate to="/join" replace />;
  }

  return intent === "host" ? <HostApply /> : <AttendApply tableId={tableId} dinner={dinner} />;
}

function AttendApply({ tableId, dinner }: { tableId?: string; dinner?: Dinner }) {
  const table = tableId ? TABLES.find((t) => t.id === tableId) : undefined;
  const dinnerInfo = dinner ? DINNER_INFO[dinner] : undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement | null>(null);
  const captured = useRef<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);

  const captureCurrentStep = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.forEach((value, key) => {
      if (typeof value === "string" && value.trim()) captured.current[key] = value;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (step < 3) {
      captureCurrentStep();
      if (step === 2) {
        if (!user) {
          toast.info("Please sign in or create an account to reserve a seat.");
          navigate({ to: "/login", search: { redirect: window.location.pathname + window.location.search } as any });
          return;
        }
        if (!agreed) {
          setAgreeError("Please review and agree to the Guest & Attendee Agreement to continue.");
          return;
        }
        setAgreeError(null);
        setIsSubmitting(true);
        const c = captured.current;
        const id = await submitApplication({
          source: "guest_application",
          name: c.name ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          location: tableId ?? dinner ?? null,
          notes: c.drawn_to ?? c.communal_meaning ?? c.host_notes ?? null,
          payload: {
            table_id: tableId ?? null,
            dinner: dinner ?? null,
            instagram: c.instagram ?? null,
            drawn_to: c.drawn_to ?? null,
            communal_meaning: c.communal_meaning ?? null,
            host_notes: c.host_notes ?? null,
          },
        });
        setIsSubmitting(false);
        if (id) {
          void navigate({ to: "/apply/status/$id", params: { id } });
          return;
        }
        setStep(3);
      } else {
        setStep(step + 1);
      }
    }
  };


  return (
    <section className="mx-auto max-w-3xl px-6 py-20" data-apply-intent="attend">
      <p className="eyebrow">Apply to attend</p>
      <h1 className="mt-3 font-serif text-5xl text-balance">
        {table ? `Request a seat at ${table.title}.` : "Request a seat at the table."}
      </h1>
      {table && (
        <DinnerSummaryPanel
          name={table.title}
          date={table.date}
          location={table.neighborhood}
          price={`$${table.price}`}
        />
      )}
      {!table && dinnerInfo && (
        <DinnerSummaryPanel
          name={dinnerInfo.name}
          date={dinnerInfo.date}
          location={dinnerInfo.location}
        />
      )}



      <IntentSwitch current="attend" />

      <EditorialHighlight />

      <Tabs defaultValue="apply" className="mt-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apply">Apply for a seat</TabsTrigger>
          <TabsTrigger value="dinners">Browse current dinners</TabsTrigger>
        </TabsList>
        <TabsContent value="dinners" className="mt-6">
          <FeaturedDinners />
        </TabsContent>
        <TabsContent value="apply" className="mt-6">

      <Stepper step={step} total={3} />

      <SignInNotice reason="attend" />

      <form ref={formRef} className="mt-10 space-y-8" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {step === 1 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 1 — Basic info</p>
            {dinnerInfo && (
              <Field label="Selected dinner">
                <input
                  className="input"
                  name="dinner"
                  value={dinnerInfo.name}
                  readOnly
                  aria-readonly="true"
                />
              </Field>
            )}
            <Field label="Name"><input name="name" className="input" required disabled={isSubmitting} /></Field>
            <Field label="Email"><input name="email" type="email" className="input" required disabled={isSubmitting} /></Field>
            <Field label="Phone"><input name="phone" type="tel" className="input" required disabled={isSubmitting} /></Field>
            <Field label="Instagram or social profile (optional)"><input name="instagram" className="input" disabled={isSubmitting} /></Field>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 2 — A few questions</p>
            <Field label="What kind of tables are you drawn to?">
              <textarea
                name="drawn_to"
                rows={3}
                className="input"
                required
                disabled={isSubmitting}
                defaultValue={
                  dinnerInfo
                    ? `Specifically interested in ${dinnerInfo.name}. `
                    : undefined
                }
              />

            </Field>
            <Field label="What does communal dining mean to you?">
              <textarea name="communal_meaning" rows={3} className="input" required disabled={isSubmitting} />
            </Field>
            <Field label="Anything the host should know before approving your request?">
              <textarea name="host_notes" rows={3} className="input" disabled={isSubmitting} />
            </Field>
            <AgreementGate
              title={GUEST_AGREEMENT_TITLE}
              text={GUEST_AGREEMENT_TEXT}
              agreeLabel="I have read and agree to the Colorfull Guest & Attendee Agreement, including the assumption of risk, marketing and data-use consent, indemnification, content rights, non-circumvention, and binding arbitration provisions."
              checked={agreed}
              onCheckedChange={(v) => { setAgreed(v); if (v) setAgreeError(null); }}
            />
            {agreeError && (
              <p className="text-sm text-destructive" role="alert">{agreeError}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="border border-border bg-secondary/40 p-10 text-center anim-fade-up">
            <p className="eyebrow">Confirmation</p>
            <h2 className="mt-3 font-serif text-3xl">Your request has been received.</h2>
            <p className="mt-4 text-muted-foreground">
              If approved, you'll receive access to confirm your seat and unlock the private
              location. We review every application personally.
            </p>
          </div>
        )}

        {step < 3 && (
          <FormNav step={step} setStep={setStep} submitLabel="Submit application" disabled={isSubmitting} />
        )}

        <FormStyles />
      </form>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function EditorialHighlight() {
  const mosheLink = "/chefs/moshe-fhima";
  const irieLink = "/irie-supper-club";

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {/* Moshe */}
      <div className="group relative flex flex-col overflow-hidden border border-border bg-secondary/30 transition hover:bg-secondary/60">
        <Link to={mosheLink} className="block overflow-hidden">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={mosheImage.url}
              alt="Moshe Fhima — Mediterranean dinner"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>
        <div className="flex flex-1 flex-col p-5">
          <p className="eyebrow">Featured · Chef</p>
          <Link to={mosheLink}>
            <h3 className="mt-2 font-serif text-xl group-hover:underline">Moshe Fhima</h3>
          </Link>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            An intimate Mediterranean evening — handmade pasta, wood-fired
            breads, and the warmth of a chef who cooks from memory.
          </p>
          <div className="mt-auto pt-5 flex flex-col gap-3">
            <Link
              to="/apply"
              search={{ intent: "attend", dinner: "moshe" }}
              className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to attend
            </Link>

            <Link
              to={mosheLink}
              className="inline-block text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
            >
              View dinner →
            </Link>
          </div>
        </div>
      </div>

      {/* Irie */}
      <div className="group relative flex flex-col overflow-hidden border border-border bg-secondary/30 transition hover:bg-secondary/60">
        <Link to={irieLink} className="block overflow-hidden">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={irieImage.url}
              alt="Irie Supper Club — Caribbean tasting dinner"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </Link>
        <div className="flex flex-1 flex-col p-5">
          <p className="eyebrow">Featured · Supper Club</p>
          <Link to={irieLink}>
            <h3 className="mt-2 font-serif text-xl group-hover:underline">Irie Supper Club</h3>
          </Link>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Vince McIntosh brings the islands to the table — a curated Caribbean
            tasting menu meant to be shared, story and all.
          </p>
          <div className="mt-auto pt-5 flex flex-col gap-3">
            <Link
              to="/apply"
              search={{ intent: "attend", dinner: "irie" }}
              className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to attend
            </Link>

            <Link
              to={irieLink}
              className="inline-block text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
            >
              View dinner →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedDinners() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Explore more upcoming communal dinners around the city.
      </p>
      <Link
        to="/discover"
        className="inline-block text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
      >
        Browse all tables
      </Link>
    </div>
  );
}

function HostApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const captured = useRef<Record<string, string>>({});
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

  const captureCurrentStep = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.forEach((value, key) => {
      if (typeof value === "string" && value.trim()) captured.current[key] = value;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (step < 3) {
      captureCurrentStep();
      if (step === 2) {
        if (!user) {
          toast.info("Please sign in or create an account to apply as a host.");
          navigate({ to: "/login", search: { redirect: "/apply?intent=host" } as any });
          return;
        }
        if (!agreed) {
          setAgreeError("Please review and agree to the Host & Chef Agreement to continue.");
          return;
        }
        setAgreeError(null);
        setIsSubmitting(true);
        const c = captured.current;
        try {
          await fetch('/api/public/host-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.name ?? '',
              email: c.email ?? '',
              location: c.city ?? '',
              instagram: c.instagram ?? '',
              background: c.background ?? '',
              motivation: c.table_concept ?? '',
              location_status: c.host_location ?? '',
            }),
          });
        } catch (err) {
          console.warn('[host-application] submit failed', err);
        }
        setSubmittedEmail(c.email ?? "");
        setStep(3);
        setIsSubmitting(false);
      } else {
        setStep(step + 1);
      }
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-20" data-apply-intent="host">
      <p className="eyebrow">Apply to host</p>
      <h1 className="mt-3 font-serif text-5xl text-balance">Set a table of your own.</h1>
      <p className="mt-4 text-muted-foreground">
        Tell us about your point of view, your kitchen, and the kind of room you want to gather.
        Hosts are reviewed personally by our team.
      </p>

      <IntentSwitch current="host" />

      <Stepper step={step} total={3} />

      <SignInNotice reason="host" />

      <form ref={formRef} className="mt-10 space-y-8" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {step === 1 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 1 — About you</p>
            <Field label="Name"><input name="name" className="input" required disabled={isSubmitting} /></Field>
            <Field label="Email"><input name="email" type="email" className="input" required disabled={isSubmitting} /></Field>
            <Field label="City"><input name="city" className="input" required disabled={isSubmitting} /></Field>
            <Field label="Instagram or portfolio link"><input name="instagram" className="input" disabled={isSubmitting} /></Field>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 2 — Your table</p>
            <Field label="What kind of table do you want to host?">
              <textarea name="table_concept" rows={3} className="input" required disabled={isSubmitting} />
            </Field>
            <Field label="Where would you host (home, studio, restaurant…)?">
              <textarea name="host_location" rows={2} className="input" required disabled={isSubmitting} />
            </Field>
            <Field label="Cooking or hospitality background">
              <textarea name="background" rows={3} className="input" required disabled={isSubmitting} />
            </Field>
            <AgreementGate
              title={HOST_AGREEMENT_TITLE}
              text={HOST_AGREEMENT_TEXT}
              agreeLabel="I have read and agree to the Colorfull Host & Chef Agreement, including the platform-only acknowledgment, my sole responsibility for food safety, permits, licenses and insurance, marketing and data-use consent, non-circumvention and confidentiality, content rights, indemnification, and binding arbitration."
              checked={agreed}
              onCheckedChange={(v) => { setAgreed(v); if (v) setAgreeError(null); }}
            />
            {agreeError && (
              <p className="text-sm text-destructive" role="alert">{agreeError}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="border border-border bg-secondary/40 p-10 text-center anim-fade-up">
            <p className="eyebrow">Confirmation</p>
            <h2 className="mt-3 font-serif text-3xl">Your host application is in.</h2>
            <p className="mt-4 text-muted-foreground">
              We review every host personally. If it's a fit, you'll hear from us with next steps
              to set your first table.
            </p>
            <div className="mt-6 border-t border-border pt-5">
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
        )}

        {step < 3 && (
          <FormNav step={step} setStep={setStep} submitLabel="Submit application" disabled={isSubmitting} />
        )}

        <FormStyles />
      </form>
    </section>
  );
}

function IntentSwitch({ current }: { current: Intent }) {
  const other: Intent = current === "attend" ? "host" : "attend";
  const otherLabel = other === "host" ? "Apply to host instead" : "Apply to attend instead";
  return (
    <div className="mt-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <Link to="/join" className="underline underline-offset-[6px] hover:text-foreground">
        Change intent
      </Link>
      <span aria-hidden>·</span>
      <Link
        to="/apply"
        search={{ intent: other }}
        className="underline underline-offset-[6px] hover:text-foreground"
      >
        {otherLabel}
      </Link>
    </div>
  );
}

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-3">
          <span className={`flex h-7 w-7 items-center justify-center border ${step >= n ? "border-foreground bg-foreground text-background" : "border-border"}`}>
            {String(n).padStart(2, "0")}
          </span>
          {n < total && <span className="h-px w-10 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function FormNav({
  step,
  setStep,
  submitLabel,
  disabled = false,
}: {
  step: number;
  setStep: (n: number) => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-8">
      <button
        type="button"
        onClick={() => setStep(Math.max(1, step - 1))}
        className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground disabled:opacity-40"
        disabled={disabled || step === 1}
      >
        Back
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-12 items-center gap-2 bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
        )}
        {disabled ? "Submitting…" : step === 2 ? submitLabel : "Continue"}
      </button>
    </div>
  );
}

function FormStyles() {
  return (
    <style>{`
      .input { margin-top: .5rem; height: 2.75rem; width: 100%; border: 1px solid var(--color-border); background: var(--color-background); padding: 0 .75rem; font-size: .875rem; outline: none; }
      textarea.input { height: auto; padding: .75rem; line-height: 1.5; }
      .input:focus { border-color: var(--color-foreground); }
      .input:disabled { opacity: 0.55; cursor: not-allowed; background-color: var(--color-muted); }
    `}</style>
  );
}

function DinnerSummaryPanel({
  name,
  date,
  location,
  price,
}: {
  name: string;
  date: string;
  location: string;
  price?: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-5">
      <p className="eyebrow">Selected dinner</p>
      <h2 className="mt-2 font-serif text-2xl leading-tight">{name}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {date}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {location}
        </span>
        {price && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            {price}
          </span>
        )}
      </div>
    </div>
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
