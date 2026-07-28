import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { notifyIrieRsvp } from "@/lib/irie-rsvp.functions";
import { logFormSubmission } from "@/lib/log-form-submission";
import { AgreementGate } from "@/components/site/AgreementGate";

const GUEST_DISCLOSURE = `By reserving a seat at the Irie Supper Club, you acknowledge and agree to the following:

SMS & EMAIL NOTIFICATIONS
You consent to receive transactional text messages and emails related to this event — including a reminder the day of the event and a few hours prior to service, arrival details, the rooftop address, and any last-minute updates from the host. Message and data rates may apply. Reply STOP to opt out of SMS at any time; opting out may mean you miss day-of logistics.

ARRIVAL & TIMING
Doors open at 6:00 PM for drinks and hors d'oeuvres. The seated dinner begins promptly at 7:30 PM. Late arrivals disrupt the room and may not be seated. If you cannot attend, please notify the host as early as possible.

CANCELLATION & REFUNDS
Seats are limited to 17 guests and held in order of submission. Paid reservations are non-refundable within 7 days of the event. Coupon-comped seats that are no-showed may forfeit access to future Colorfull events.

DIETARY RESTRICTIONS & ALLERGIES
You are responsible for disclosing all allergies, intolerances, and dietary restrictions in the form below. The chef cooks for the full table and cannot guarantee accommodation of undisclosed restrictions.

PRIVATE EVENT & CONDUCT
This is a private, invite-only experience hosted at a private residence/rooftop. Treat the space, the host, the staff, and your fellow guests with respect. Phones down at the table. Stories shared between guests stay between guests; photos of other guests require their consent.

AGE REQUIREMENT
All guests must be 18 years or older. Alcoholic beverages will be served; valid ID may be requested.

ASSUMPTION OF RISK
You acknowledge that dining involves inherent risks (including food allergens, alcohol consumption, and gathering in a private venue) and agree to hold Colorfull, the host, and Chef Vince McIntosh harmless for any related claims, except in cases of gross negligence.

MARKETING, PROMOTIONAL USE & DATA MONETIZATION
You expressly consent to Colorfull's use, sharing, disclosure, licensing, rental, and SALE of the personal information you submit (including name, email, phone, dietary notes, photos, video, likeness, voice, and attendance history) for marketing, advertising, retargeting, audience-modeling, and any other commercial purpose — across email, SMS, paid social, programmatic display, out-of-home, and any current or future medium — by Colorfull and its affiliates, sponsors, brand partners, ad networks, data brokers, and list buyers, for monetary or other valuable consideration. This consent expressly authorizes the "sale" and "sharing" of personal information under the CCPA/CPRA and similar state privacy laws. To opt out where the law allows, email privacy@eatcolorfull.com with subject "Do Not Sell or Share My Personal Information."

By checking the box below, you confirm that you have read, understood, and agree to these terms on behalf of yourself and every guest in your reservation.`;

export const Route = createFileRoute("/irie-supper-club")({
  head: () => {
    const title = "Irie Supper Club — Sunset Rooftop Dinner | Chef Vince McIntosh";
    const desc =
      "An invite-only sunset rooftop dinner with Chef Vince McIntosh. Wednesday, June 3, 2026 — 21 Union Jack, Marina Del Rey.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: IrieSupperClubPage,
});

const EVENT_SLUG = "irie-supper-club";
const PRICE_CENTS = 18000; // $180

const MENU = [
  {
    section: "i.",
    label: "Passed",
    courses: [
      {
        title: "Plantain Tostones",
        detail: "Black Tiger Shrimp · Cold Water Lobster · Jerk Honey · Lemon-Chive Aïoli",
      },
      {
        title: "Short Rib Toast",
        detail:
          "Chardonnay-Braised Beef · Caramelized Onion · Black Truffle & Gruyère Crème · Brown Butter Brioche",
      },
      {
        title: "Lobster Curry Bisque",
        detail: "Passed in demitasse · Toasted Herb Oil",
      },
    ],
  },
  {
    section: "ii.",
    label: "First Course",
    courses: [
      {
        title: "Garden Salad",
        detail:
          "Spinach & Spring Greens · Roasted Japanese Sweet Potato · English Cucumber · Sage & Brown Butter Vinaigrette",
      },
    ],
  },
  {
    section: "iii.",
    label: "The Duo Plate",
    courses: [
      {
        title: "Black Angus Oxtail",
        detail: "Whipped Golden Potatoes · Oyster Mushroom · Peppercorn Crème",
      },
      {
        title: "Butter-Poached Lobster Tail",
        detail: "Sweet Corn Velouté · Chive Oil · Crispy Prosciutto Dust",
      },
    ],
  },
  {
    section: "iv.",
    label: "Dessert",
    courses: [
      {
        title: "Rum Strawberry Cake",
        detail: "Macerated Berries · Vanilla Cream · Lime Zest",
      },
    ],
  },
];

const formSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  age: z
    .number({ invalid_type_error: "Please enter your age" })
    .int()
    .min(18, "Guests must be 18+")
    .max(120),
  phone: z.string().trim().min(7, "Please enter a phone number").max(30),
  dietary_notes: z.string().trim().max(500).optional().or(z.literal("")),
  guest_count: z.number().int().min(1).max(8),
  coupon_code: z.string().trim().max(40).optional().or(z.literal("")),
});

function IrieSupperClubPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<
    { kind: "idle" } | { kind: "valid"; discount: number; code: string } | { kind: "invalid"; message: string }
  >({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const subtotalCents = PRICE_CENTS * guestCount;
  const discountPercent = couponState.kind === "valid" ? couponState.discount : 0;
  const amountDueCents = Math.round(subtotalCents * (1 - discountPercent / 100));
  const isFree = amountDueCents === 0;

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponState({ kind: "idle" });
      return;
    }
    const { data, error: err } = await supabase.rpc("validate_event_coupon", {
      _code: code,
      _event_slug: EVENT_SLUG,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (err || !row || !row.valid) {
      const reason = row?.reason;
      const message =
        reason === "expired"
          ? "This code has expired."
          : reason === "wrong_event"
            ? "Code isn't valid for this event."
            : reason === "exhausted"
              ? "This code has reached its usage limit."
              : "That code isn't valid.";
      setCouponState({ kind: "invalid", message });
      return;
    }
    setCouponState({ kind: "valid", discount: row.discount_percent, code });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError("Please review and accept the guest agreement to continue.");
      return;
    }
    const parsed = formSchema.safeParse({
      full_name: fullName,
      email,
      age: Number(age),
      phone,
      dietary_notes: dietary,
      guest_count: guestCount,
      coupon_code: coupon,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: insErr } = await supabase
        .from("event_bookings")
        .insert({
          event_slug: EVENT_SLUG,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          age: parsed.data.age,
          phone: parsed.data.phone,
          dietary_notes: parsed.data.dietary_notes || null,
          guest_count: parsed.data.guest_count,
          coupon_code: couponState.kind === "valid" ? couponState.code : null,
          price_cents: subtotalCents,
          amount_due_cents: amountDueCents,
          payment_status: isFree ? "comped" : "pending",
        });
      if (insErr) throw insErr;

      // Audit log for /admin/contacts
      void logFormSubmission({
        source: "rsvp_irie",
        name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        location: EVENT_SLUG,
        notes: parsed.data.dietary_notes || null,
        payload: {
          age: parsed.data.age,
          guest_count: parsed.data.guest_count,
          coupon_code: couponState.kind === "valid" ? couponState.code : null,
          price_cents: subtotalCents,
          amount_due_cents: amountDueCents,
          payment_status: isFree ? "comped" : "pending",
        },
      });

      // Fire-and-forget host notification to Chef Vince.
      notifyIrieRsvp({
        data: {
          bookingId: crypto.randomUUID(),
          guestName: parsed.data.full_name,
          guestEmail: parsed.data.email,
          guestPhone: parsed.data.phone,
          guestAge: parsed.data.age,
          guestCount: parsed.data.guest_count,
          dietaryNotes: parsed.data.dietary_notes || undefined,
          couponCode: couponState.kind === "valid" ? couponState.code : undefined,
          amountDueCents: amountDueCents,
        },
      }).catch((e) => console.error("[irie] notify failed", e));

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="eyebrow">RSVP received</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">You're on the list.</h1>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Thank you, {fullName.split(" ")[0]}. We've recorded your RSVP for the Irie Supper
          Club on Wednesday, June 3, 2026. A confirmation with the rooftop address and
          arrival details will follow at {email}.
        </p>
        {isFree && (
          <p className="mt-4 text-sm text-muted-foreground">
            Your seat is fully covered — no payment required.
          </p>
        )}
        <Link
          to="/tastemakers/$tastemakerId"
          params={{ tastemakerId: "vince-macintosh" }}
          className="mt-10 inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.24em] hover:bg-foreground hover:text-background"
        >
          View Chef Vince's profile
        </Link>
      </section>
    );
  }

  return (
    <>
      {/* Invite hero */}
      <section className="bg-[#f3ecd9] text-[#1a1a1a]">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <h1 className="font-serif text-5xl tracking-tight md:text-7xl">
            IRIE SUPPER CLUB
          </h1>
          <p className="mt-6 font-mono text-base md:text-lg">Chef: Irie Don</p>
          <p className="mt-2 font-serif italic text-sm md:text-base opacity-80">
            Invite Only
          </p>

          <div className="mt-12 space-y-2 font-mono text-sm md:text-base">
            <p className="font-bold">Wednesday 06.03.26</p>
            <p>
              <span className="font-mono">6:00 PM</span>{" "}
              <span className="italic">Drinks & D'Horderves</span>
            </p>
            <p>
              <span className="font-mono">7:30 PM</span>{" "}
              <span className="italic">Sunset Rooftop Dinner</span>
            </p>
            <p className="pt-4">21 Union Jack | Marina Del Rey, CA</p>
          </div>

          <a
            href="#rsvp"
            className="mt-12 inline-flex h-12 items-center bg-[#1a1a1a] px-8 text-[11px] uppercase tracking-[0.28em] text-[#f3ecd9] hover:opacity-90"
          >
            Reserve your seat
          </a>
        </div>
      </section>

      {/* Menu */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <h2 className="text-center font-serif text-5xl md:text-7xl">MENU</h2>
          <div className="mt-14 space-y-14">
            {MENU.map((s) => (
              <div key={s.section} className="text-center">
                <p className="font-serif italic text-base text-muted-foreground">
                  {s.section}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                  {s.label}
                </p>
                <div className="mt-6 space-y-8">
                  {s.courses.map((c) => (
                    <div key={c.title}>
                      <h3 className="font-serif text-2xl md:text-3xl">{c.title}</h3>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                        {c.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mx-auto mt-10 h-px w-12 bg-border" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RSVP / Payment */}
      <section id="rsvp" className="bg-secondary/30 scroll-mt-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-[1fr_1.2fr] md:py-28">
          <div>
            <p className="eyebrow">Booking</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">Reserve your seat.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Seats are limited to 17 guests. Submit your information below — if you have a
              coupon code, enter it to apply your discount.
            </p>

            <dl className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
              {couponState.kind === "valid" && discountPercent === 100 ? (
                <>
                  {Array.from({ length: guestCount }, (_, i) => (
                    <div key={i} className="flex items-baseline justify-between">
                      <dt className="text-muted-foreground">Guest {i + 1}</dt>
                      <dd className="font-mono text-sm">
                        <span className="text-muted-foreground line-through mr-2">$180.00</span>
                        <span>$0.00</span>
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="line-through">${(subtotalCents / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between text-foreground">
                    <dt>Coupon {couponState.code}</dt>
                    <dd>−{couponState.discount}%</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Price per guest</dt>
                    <dd className="font-serif text-xl">$180</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Guests</dt>
                    <dd>{guestCount}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>${(subtotalCents / 100).toFixed(2)}</dd>
                  </div>
                  {couponState.kind === "valid" && (
                    <div className="flex items-baseline justify-between text-foreground">
                      <dt>Coupon {couponState.code}</dt>
                      <dd>−{couponState.discount}%</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="text-[11px] uppercase tracking-[0.22em]">Total due</dt>
                <dd className="font-serif text-3xl">
                  ${(amountDueCents / 100).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-background p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                required
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                required
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />
              <Field
                label="Age"
                type="number"
                required
                value={age}
                onChange={setAge}
                min={18}
                max={120}
              />
              <Field
                label="Phone"
                type="tel"
                required
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="eyebrow">Guests</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setGuestCount(n)}
                    className={`h-11 border text-[11px] uppercase tracking-[0.22em] ${
                      guestCount === n
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Coupon codes apply to every seat in your reservation.
              </p>
            </div>

            <div>
              <label className="eyebrow" htmlFor="dietary">
                Dietary restrictions / allergies (optional)
              </label>
              <textarea
                id="dietary"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Allergies, preferences, anything the chef should know."
                className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm focus:border-foreground focus:outline-none"
              />
            </div>

            <div>
              <label className="eyebrow" htmlFor="coupon">
                Coupon code (optional)
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="coupon"
                  type="text"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value);
                    if (couponState.kind !== "idle") setCouponState({ kind: "idle" });
                  }}
                  placeholder="ENTER CODE"
                  className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm uppercase tracking-widest focus:border-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="inline-flex h-11 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
                >
                  Apply
                </button>
              </div>
              {couponState.kind === "valid" && (
                <p className="mt-2 text-xs text-foreground">
                  ✓ {couponState.code} applied — {couponState.discount}% off.
                </p>
              )}
              {couponState.kind === "invalid" && (
                <p className="mt-2 text-xs text-destructive">{couponState.message}</p>
              )}
            </div>

            {!isFree && (
              <div className="rounded-md border border-dashed border-border bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
                Card payment will be collected separately — we'll email you a secure
                payment link to {email || "your email"} once your RSVP is reviewed.
              </div>
            )}

            <div className="pt-2">
              <AgreementGate
                title="Guest agreement & event disclosures"
                text={GUEST_DISCLOSURE}
                agreeLabel="I have read and agree to the guest agreement, including consent to receive SMS reminders the day of the event."
                checked={agreed}
                onCheckedChange={setAgreed}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !agreed}
              className="inline-flex h-12 w-full items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.28em] text-background hover:bg-foreground/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Submitting…"
                : isFree
                ? "Confirm my seat (free)"
                : `Reserve seat · $${(amountDueCents / 100).toFixed(2)}`}
            </button>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              By submitting, you agree to receive event details by email and SMS. Seats are
              confirmed in order of submission.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="eyebrow">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        min={min}
        max={max}
        className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-foreground focus:outline-none"
      />
    </div>
  );
}
