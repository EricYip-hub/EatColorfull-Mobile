import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { notifyMolinoOrder } from "@/lib/molino-order.functions";
import { logFormSubmission } from "@/lib/log-form-submission";
import { AgreementGate } from "@/components/site/AgreementGate";

const GUEST_DISCLOSURE = `By placing a pre-order with the Molino Neapolitan Pizza Pop-Up, you acknowledge and agree to the following:

SMS & EMAIL NOTIFICATIONS
You consent to receive transactional text messages and emails related to this pop-up — including order confirmation, pickup-ready notifications, the pickup address, and any last-minute updates from Chef Moshe. Message and data rates may apply. Reply STOP to opt out of SMS at any time; opting out may mean you miss day-of pickup logistics.

PICKUP & TIMING
Pickup is Saturday, June 6, 2026 between 9:25 PM and 12:30 AM at the address shared by the chef after your order is confirmed. Pizzas are made to order from a wood-fired Neapolitan oven and are best eaten within 15 minutes of pickup. If you cannot make your selected window, please notify the chef as early as possible.

ORDERS, INVENTORY & REFUNDS
Quantities are limited and pre-orders are fulfilled in the order received. Once a pizza is started, the order is non-refundable. No-shows forfeit their order without refund.

DIETARY RESTRICTIONS & ALLERGIES
This kitchen handles wheat, dairy, and other common allergens. You are responsible for disclosing all allergies, intolerances, and dietary restrictions in the order form. The chef cannot guarantee accommodation of undisclosed restrictions.

CONDUCT & RESPECT
This is a small-batch pop-up hosted in a private kitchen. Please treat the space, the chef, and other guests with respect at pickup.

ASSUMPTION OF RISK
You acknowledge that prepared food involves inherent risks (including food allergens and high-heat oven service) and agree to hold Colorfull, the host, and Chef Moshe Fhima harmless for any related claims, except in cases of gross negligence.

MARKETING, PROMOTIONAL USE & DATA MONETIZATION
You expressly consent to Colorfull's use, sharing, disclosure, licensing, rental, and SALE of the personal information you submit (including name, email, phone, dietary notes, photos, video, likeness, voice, and order history) for marketing, advertising, retargeting, audience-modeling, and any other commercial purpose — across email, SMS, paid social, programmatic display, out-of-home, and any current or future medium — by Colorfull and its affiliates, sponsors, brand partners, ad networks, data brokers, and list buyers, for monetary or other valuable consideration. This consent expressly authorizes the "sale" and "sharing" of personal information under the CCPA/CPRA and similar state privacy laws. To opt out where the law allows, email privacy@eatcolorfull.com with subject "Do Not Sell or Share My Personal Information."

By checking the box below, you confirm that you have read, understood, and agree to these terms on behalf of yourself and everyone in your order.`;

export const Route = createFileRoute("/molino-pizza-pop-up")({
  head: () => {
    const title = "Molino — Neapolitan Pizza Pop-Up | Chef Moshe Fhima";
    const desc =
      "A one-night Neapolitan pizza pop-up by Chef Moshe Fhima. Saturday, June 6, 2026 — 9:25 PM to 12:30 AM. Pre-order Margherita, La Bianca, Fusilloni alla Vodka, and Nutella Calzone.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: MolinoPopUpPage,
});

const EVENT_SLUG = "molino-pizza-pop-up";
const INVITE_URL = "https://www.eatcolorfull.com/molino-pizza-pop-up";
const PIZZA_BASE_CENTS = 2500;
const PASTA_BASE_CENTS = 2500;
const CALZONE_BASE_CENTS = 1800;

type PickupSlot = { label: string; soldOut?: boolean };
const PICKUP_SLOTS: PickupSlot[] = [
  { label: "8:30 PM", soldOut: true },
  { label: "9:00 PM", soldOut: true },
  { label: "9:30 PM", soldOut: true },
  { label: "10:00 PM", soldOut: true },
  { label: "10:30 PM" },
  { label: "11:00 PM" },
  { label: "11:30 PM" },
  { label: "12:00 AM" },
  { label: "12:30 AM" },
];

type AddOn = { id: string; label: string; cents: number };
const MARGHERITA_ADDONS: AddOn[] = [
  { id: "mushrooms", label: "Wild Mushrooms", cents: 300 },
  { id: "olives", label: "Olives", cents: 200 },
  { id: "shallots", label: "Shallots", cents: 100 },
  { id: "jalapenos", label: "Jalapeños", cents: 100 },
];
const MARGHERITA_ADDON_CAP_CENTS = 500; // pie maxes out at $30

const orderSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(7, "Please enter a phone number").max(30),
  pickup_time: z.string().min(1, "Choose a pickup time"),
  margherita_qty: z.number().int().min(0).max(20),
  bianca_qty: z.number().int().min(0).max(20),
  pasta_qty: z.number().int().min(0).max(20),
  calzone_qty: z.number().int().min(0).max(20),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

// Local pickup datetime for each slot (Sat Jun 6, 2026, America/Los_Angeles ≈ UTC-7 PDT).
// AM slots (12:00 AM, 12:30 AM) roll over to Jun 7.
function pickupSlotToDate(slot: string): Date | null {
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const isAm = /am/i.test(m[3]);
  if (/pm/i.test(m[3]) && h !== 12) h += 12;
  if (isAm && h === 12) h = 0;
  const day = isAm ? 7 : 6;
  return new Date(Date.UTC(2026, 5, day, h + 7, min, 0));
}

function PickupCountdown({ slot }: { slot: string }) {
  const target = useMemo(() => pickupSlotToDate(slot), [slot]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const diffMs = target.getTime() - now;
  const fireAt = new Date(target.getTime() - 10 * 60 * 1000); // chef fires ~10 min before
  const isPast = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const totalMin = Math.floor(absMs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  const seconds = Math.floor((absMs % 60000) / 1000);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  if (!days) parts.push(`${seconds}s`);
  const fireLabel = fireAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return (
    <div
      className="mt-3 border px-3 py-3 text-xs"
      style={{ borderColor: "#9c7a4a", color: "#e8d5b7", backgroundColor: "rgba(156,122,74,0.08)" }}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="tracking-[0.22em] opacity-70">
          {isPast ? "PICKUP TIME PASSED" : "READY BY"}
        </span>
        <span className="font-serif text-lg tabular-nums">
          {isPast ? `+${parts.join(" ")} ago` : parts.join(" ")}
        </span>
      </div>
      <p className="mt-2 opacity-80">
        🔥 Chef Moshe fires your pie around <strong>{fireLabel}</strong> so it lands hot
        at <strong>{slot}</strong>.
      </p>
    </div>
  );
}

type CouponState =
  | { kind: "idle" }
  | { kind: "valid"; discount: number; code: string }
  | { kind: "invalid"; message: string };

function MolinoPopUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState<string>("");
  const [margheritaQty, setMargheritaQty] = useState(0);
  const [margheritaAddons, setMargheritaAddons] = useState<string[]>([]);
  const [biancaQty, setBiancaQty] = useState(0);
  const [biancaMushrooms, setBiancaMushrooms] = useState(false);
  const [pastaQty, setPastaQty] = useState(0);
  const [pastaMushrooms, setPastaMushrooms] = useState(false);
  const [calzoneQty, setCalzoneQty] = useState(0);
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<CouponState>({ kind: "idle" });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const margheritaAddonsCents = useMemo(() => {
    const total = MARGHERITA_ADDONS.filter((a) => margheritaAddons.includes(a.id))
      .reduce((sum, a) => sum + a.cents, 0);
    return Math.min(total, MARGHERITA_ADDON_CAP_CENTS);
  }, [margheritaAddons]);
  const biancaAddonsCents = biancaMushrooms ? 200 : 0;
  const pastaAddonsCents = pastaMushrooms ? 300 : 0;

  const margheritaLineCents = margheritaQty * (PIZZA_BASE_CENTS + margheritaAddonsCents);
  const biancaLineCents = biancaQty * (PIZZA_BASE_CENTS + biancaAddonsCents);
  const pastaLineCents = pastaQty * (PASTA_BASE_CENTS + pastaAddonsCents);
  const calzoneLineCents = calzoneQty * CALZONE_BASE_CENTS;
  const subtotalCents = margheritaLineCents + biancaLineCents + pastaLineCents + calzoneLineCents;
  const discountPercent = couponState.kind === "valid" ? couponState.discount : 0;
  const discountCents = Math.round(subtotalCents * (discountPercent / 100));
  const totalCents = subtotalCents - discountCents;
  const totalItems = margheritaQty + biancaQty + pastaQty + calzoneQty;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // ignore
    }
  }

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
            ? "Code isn't valid for this pop-up."
            : reason === "exhausted"
              ? "This code has reached its usage limit."
              : "That code isn't valid.";
      setCouponState({ kind: "invalid", message });
      return;
    }
    setCouponState({ kind: "valid", discount: row.discount_percent, code });
  }

  function toggleMargheritaAddon(id: string) {
    setMargheritaAddons((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function buildOrderSummary() {
    const lines: string[] = [];
    if (margheritaQty > 0) {
      const adds = MARGHERITA_ADDONS.filter((a) => margheritaAddons.includes(a.id))
        .map((a) => a.label)
        .join(", ");
      lines.push(
        `${margheritaQty} × Margherita Pizza${adds ? ` (add-ons: ${adds})` : ""} — $${(margheritaLineCents / 100).toFixed(2)}`,
      );
    }
    if (biancaQty > 0) {
      lines.push(
        `${biancaQty} × La Bianca Pizza${biancaMushrooms ? " (add-on: Mushrooms)" : ""} — $${(biancaLineCents / 100).toFixed(2)}`,
      );
    }
    if (pastaQty > 0) {
      lines.push(
        `${pastaQty} × Fusilloni alla Vodka${pastaMushrooms ? " (add-on: Wild Mushrooms)" : ""} — $${(pastaLineCents / 100).toFixed(2)}`,
      );
    }
    if (calzoneQty > 0) {
      lines.push(
        `${calzoneQty} × Nutella Calzone — $${(calzoneLineCents / 100).toFixed(2)}`,
      );
    }
    lines.push(`Pickup: ${pickupTime}`);
    return lines.join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError("Please review and accept the order agreement to continue.");
      return;
    }
    if (totalItems === 0) {
      setError("Please add at least one item to your order.");
      return;
    }
    const parsed = orderSchema.safeParse({
      full_name: fullName,
      email,
      phone,
      pickup_time: pickupTime,
      margherita_qty: margheritaQty,
      bianca_qty: biancaQty,
      pasta_qty: pastaQty,
      calzone_qty: calzoneQty,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Please check the form.");
      return;
    }

    setSubmitting(true);
    try {
      const margAddonLabels = MARGHERITA_ADDONS.filter((a) =>
        margheritaAddons.includes(a.id),
      )
        .map((a) => a.label)
        .join(", ");
      const biancaAddonLabels = biancaMushrooms ? "Mushrooms" : "";
      const pastaAddonLabels = pastaMushrooms ? "Wild Mushrooms" : "";
      const orderSummary = buildOrderSummary();

      const bookingId = crypto.randomUUID();

      const { error: insErr } = await supabase.from("event_bookings").insert({
        id: bookingId,
        event_slug: EVENT_SLUG,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        dietary_notes: parsed.data.notes || null,
        guest_count: totalItems,
        price_cents: subtotalCents,
        amount_due_cents: totalCents,
        coupon_code: couponState.kind === "valid" ? couponState.code : null,
        payment_status: "pending",
        notes: orderSummary,
      });
      if (insErr) throw insErr;

      void logFormSubmission({
        source: "order_molino",
        name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        location: EVENT_SLUG,
        notes: orderSummary,
        payload: {
          pickup_time: pickupTime,
          margherita_qty: margheritaQty,
          margherita_addons: margAddonLabels,
          bianca_qty: biancaQty,
          bianca_addons: biancaAddonLabels,
          pasta_qty: pastaQty,
          pasta_addons: pastaAddonLabels,
          calzone_qty: calzoneQty,
          subtotal_cents: subtotalCents,
          discount_cents: discountCents,
          coupon_code: couponState.kind === "valid" ? couponState.code : null,
          total_cents: totalCents,
        },
      });

      notifyMolinoOrder({
        data: {
          bookingId,
          guestName: parsed.data.full_name,
          guestEmail: parsed.data.email,
          guestPhone: parsed.data.phone,
          pickupTime,
          margheritaQty,
          margheritaAddons: margAddonLabels || undefined,
          biancaQty,
          biancaAddons: biancaAddonLabels || undefined,
          pastaQty,
          pastaAddons: pastaAddonLabels || undefined,
          calzoneQty,
          notes: parsed.data.notes || undefined,
          amountDueCents: totalCents,
        },
      }).catch((e) => console.error("[molino] notify failed", e));

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
      <section
        className="min-h-screen px-6 py-24 text-center"
        style={{ backgroundColor: "#0d0d0d", color: "#e8d5b7" }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.32em] opacity-70">
            Order received
          </p>
          <h1 className="mt-4 font-serif text-5xl italic md:text-6xl">
            Grazie, {fullName.split(" ")[0]}.
          </h1>
          <p className="mt-6 leading-relaxed opacity-80">
            Your Molino pre-order is in. Chef Moshe will confirm pickup details at{" "}
            {email} shortly. Pickup window: <strong>{pickupTime}</strong> on Saturday,
            June 6, 2026.
          </p>
          <p className="mt-4 text-sm opacity-70">
            Total due at pickup: ${(totalCents / 100).toFixed(2)}
          </p>
          <Link
            to="/chefs/moshe-fhima"
            className="mt-10 inline-flex h-11 items-center border px-6 text-[11px] uppercase tracking-[0.24em] transition-colors hover:bg-[#e8d5b7] hover:text-[#0d0d0d]"
            style={{ borderColor: "#e8d5b7" }}
          >
            View Chef Moshe's profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div style={{ backgroundColor: "#0d0d0d", color: "#e8d5b7" }} className="min-h-screen">
      {/* Hero — flyer aesthetic */}
      <section className="px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <h1
            className="font-serif italic leading-none"
            style={{ fontSize: "clamp(72px, 18vw, 180px)" }}
          >
            molino
          </h1>
          <div className="mt-6 flex items-center justify-center gap-3 text-[11px] tracking-[0.32em] md:text-sm">
            <span className="h-px w-8" style={{ backgroundColor: "#9c7a4a" }} />
            <span>NEAPOLITAN PIZZA POP-UP</span>
            <span className="h-px w-8" style={{ backgroundColor: "#9c7a4a" }} />
          </div>

          <div
            className="mx-auto mt-10 max-w-md border px-6 py-5"
            style={{ borderColor: "#9c7a4a" }}
          >
            <p className="text-[13px] tracking-[0.28em] md:text-base">
              SATURDAY, JUNE 6TH
            </p>
            <p className="mt-2 text-xs tracking-[0.28em] opacity-80">
              · 9:25 PM — 12:30 AM ·
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#order"
              className="inline-flex h-12 items-center px-8 text-[11px] uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#e8d5b7", color: "#0d0d0d" }}
            >
              Pre-order your order
            </a>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex h-12 items-center border px-6 text-[11px] uppercase tracking-[0.32em] transition-colors hover:bg-[#e8d5b7] hover:text-[#0d0d0d]"
              style={{ borderColor: "#e8d5b7", color: "#e8d5b7" }}
              aria-label="Copy invite link"
            >
              {inviteCopied ? "✓ Invite link copied" : "Copy invite link"}
            </button>
          </div>
        </div>
      </section>

      {/* Menu — preview of the flyer */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-[11px] tracking-[0.42em]">· MENU ·</p>
          <div className="mt-12 space-y-12">
            <MenuItem
              numeral="1"
              title="MARGHERITA PIZZA"
              price="$25"
              note="+ Optional add-ons (max $30)"
              addons={[
                ["A. Wild Mushrooms", "$3"],
                ["B. Olives", "$2"],
                ["C. Shallots", "$1"],
                ["D. Jalapeños", "$1"],
              ]}
            />
            <div className="mx-auto h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />
            <MenuItem
              numeral="2"
              title="LA BIANCA PIZZA"
              price="$25"
              note="+ Optional add-on"
              addons={[["Wild Mushrooms", "$3"]]}
            />
            <div className="mx-auto h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />
            <MenuItem
              numeral="3"
              title="FUSILLONI ALLA VODKA"
              price="$25"
              note="Pasta — Organic, Di Gragnano IGP"
              addons={[["+ Add-on: Wild Mushrooms", "$3"]]}
            />
            <div className="mx-auto h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />
            <MenuItem
              numeral="4"
              title="NUTELLA CALZONE"
              price="$18"
              note="Dessert"
              addons={[]}
            />
          </div>
        </div>
      </section>

      {/* Order form */}
      <section id="order" className="scroll-mt-20 px-6 py-16 md:py-24" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-[11px] tracking-[0.42em]">· PLACE YOUR PRE-ORDER ·</p>
          <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed opacity-75">
            Limited quantities — pre-orders are fulfilled in the order received. Pick your
            pizzas, choose a pickup window, and Chef Moshe will confirm the pickup address by
            email.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-12 space-y-10 border p-6 md:p-10"
            style={{ borderColor: "#3a2f24", backgroundColor: "#111" }}
          >
            {/* Margherita */}
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-2xl tracking-wide">MARGHERITA</h3>
                <span className="text-sm opacity-70">$25 each</span>
              </div>
              <QtyStepper value={margheritaQty} onChange={setMargheritaQty} />
              {margheritaQty > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] tracking-[0.28em] opacity-70">
                    ADD-ONS (max $5 / pie)
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {MARGHERITA_ADDONS.map((a) => {
                      const checked = margheritaAddons.includes(a.id);
                      const wouldExceed =
                        !checked &&
                        MARGHERITA_ADDONS.filter((x) =>
                          [...margheritaAddons, a.id].includes(x.id),
                        ).reduce((s, x) => s + x.cents, 0) > MARGHERITA_ADDON_CAP_CENTS;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          disabled={wouldExceed}
                          onClick={() => toggleMargheritaAddon(a.id)}
                          className="flex items-center justify-between border px-3 py-2 text-left text-xs uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            borderColor: checked ? "#e8d5b7" : "#3a2f24",
                            backgroundColor: checked ? "#e8d5b7" : "transparent",
                            color: checked ? "#0d0d0d" : "#e8d5b7",
                          }}
                        >
                          <span>{a.label}</span>
                          <span>+${(a.cents / 100).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />

            {/* La Bianca */}
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-2xl tracking-wide">LA BIANCA</h3>
                <span className="text-sm opacity-70">$25 each</span>
              </div>
              <QtyStepper value={biancaQty} onChange={setBiancaQty} />
              {biancaQty > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] tracking-[0.28em] opacity-70">ADD-ON</p>
                  <button
                    type="button"
                    onClick={() => setBiancaMushrooms((v) => !v)}
                    className="mt-3 flex w-full items-center justify-between border px-3 py-2 text-left text-xs uppercase tracking-wider"
                    style={{
                      borderColor: biancaMushrooms ? "#e8d5b7" : "#3a2f24",
                      backgroundColor: biancaMushrooms ? "#e8d5b7" : "transparent",
                      color: biancaMushrooms ? "#0d0d0d" : "#e8d5b7",
                    }}
                  >
                    <span>Mushrooms</span>
                    <span>+$2</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />

            {/* Pasta */}
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-2xl tracking-wide">FUSILLONI ALLA VODKA</h3>
                <span className="text-sm opacity-70">$25 each</span>
              </div>
              <p className="mt-1 text-xs opacity-60">Organic, Di Gragnano IGP</p>
              <QtyStepper value={pastaQty} onChange={setPastaQty} />
              {pastaQty > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] tracking-[0.28em] opacity-70">ADD-ON</p>
                  <button
                    type="button"
                    onClick={() => setPastaMushrooms((v) => !v)}
                    className="mt-3 flex w-full items-center justify-between border px-3 py-2 text-left text-xs uppercase tracking-wider"
                    style={{
                      borderColor: pastaMushrooms ? "#e8d5b7" : "#3a2f24",
                      backgroundColor: pastaMushrooms ? "#e8d5b7" : "transparent",
                      color: pastaMushrooms ? "#0d0d0d" : "#e8d5b7",
                    }}
                  >
                    <span>Wild Mushrooms</span>
                    <span>+$3</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />

            {/* Nutella Calzone */}
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-2xl tracking-wide">NUTELLA CALZONE</h3>
                <span className="text-sm opacity-70">$18 each</span>
              </div>
              <p className="mt-1 text-xs opacity-60">Dessert</p>
              <QtyStepper value={calzoneQty} onChange={setCalzoneQty} />
            </div>

            <div className="h-px w-full opacity-30" style={{ backgroundColor: "#9c7a4a" }} />


            {/* Pickup time */}
            <div>
              <p className="text-[11px] tracking-[0.28em] opacity-70">PICKUP TIME *</p>
              <p className="mt-2 text-xs opacity-70">
                Pick the time you want to pick up — Chef Moshe will fire your pizza so
                it's pulled from the wood oven right before then, hot and ready when you
                arrive. Best eaten within 15 minutes.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {PICKUP_SLOTS.map((slot) => {
                  const active = pickupTime === slot.label;
                  const disabled = !!slot.soldOut;
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPickupTime(slot.label)}
                      className="relative h-11 border text-[11px] tracking-wider transition-colors disabled:cursor-not-allowed"
                      style={{
                        borderColor: active ? "#e8d5b7" : "#3a2f24",
                        backgroundColor: active ? "#e8d5b7" : "transparent",
                        color: disabled ? "#6b5a44" : active ? "#0d0d0d" : "#e8d5b7",
                        textDecoration: disabled ? "line-through" : "none",
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <span>{slot.label}</span>
                      {disabled && (
                        <span className="ml-2 text-[9px] tracking-[0.2em]">SOLD OUT</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {pickupTime && <PickupCountdown slot={pickupTime} />}
            </div>

            {/* Contact */}
            <div className="grid gap-4 md:grid-cols-2">
              <DarkField label="Full name" required value={fullName} onChange={setFullName} autoComplete="name" />
              <DarkField label="Email" type="email" required value={email} onChange={setEmail} autoComplete="email" />
              <DarkField label="Phone" type="tel" required value={phone} onChange={setPhone} autoComplete="tel" />
            </div>

            <div>
              <label className="text-[11px] tracking-[0.28em] opacity-70" htmlFor="notes">
                NOTES / ALLERGIES (OPTIONAL)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything the chef should know."
                className="mt-2 w-full border p-3 text-sm focus:outline-none"
                style={{
                  borderColor: "#3a2f24",
                  backgroundColor: "#0d0d0d",
                  color: "#e8d5b7",
                }}
              />
            </div>

            {/* Coupon */}
            <div>
              <label className="text-[11px] tracking-[0.28em] opacity-70" htmlFor="coupon">
                PROMO CODE (OPTIONAL)
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
                  className="h-11 flex-1 border px-3 text-sm uppercase tracking-widest focus:outline-none"
                  style={{
                    borderColor: "#3a2f24",
                    backgroundColor: "#0d0d0d",
                    color: "#e8d5b7",
                  }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="inline-flex h-11 items-center border px-5 text-[11px] uppercase tracking-[0.22em] transition-colors hover:bg-[#e8d5b7] hover:text-[#0d0d0d]"
                  style={{ borderColor: "#e8d5b7" }}
                >
                  Apply
                </button>
              </div>
              {couponState.kind === "valid" && (
                <p className="mt-2 text-xs" style={{ color: "#e8d5b7" }}>
                  ✓ {couponState.code} applied — {couponState.discount}% off.
                </p>
              )}
              {couponState.kind === "invalid" && (
                <p className="mt-2 text-xs" style={{ color: "#ff8a80" }}>
                  {couponState.message}
                </p>
              )}
            </div>

            {/* Totals */}
            <div className="border-t pt-5 text-sm" style={{ borderColor: "#3a2f24" }}>
              {margheritaQty > 0 && (
                <div className="flex justify-between py-1">
                  <span className="opacity-80">
                    {margheritaQty} × Margherita
                    {margheritaAddonsCents > 0 ? ` (+$${(margheritaAddonsCents / 100).toFixed(2)} ea)` : ""}
                  </span>
                  <span>${(margheritaLineCents / 100).toFixed(2)}</span>
                </div>
              )}
              {biancaQty > 0 && (
                <div className="flex justify-between py-1">
                  <span className="opacity-80">
                    {biancaQty} × La Bianca
                    {biancaAddonsCents > 0 ? ` (+$${(biancaAddonsCents / 100).toFixed(2)} ea)` : ""}
                  </span>
                  <span>${(biancaLineCents / 100).toFixed(2)}</span>
                </div>
              )}
              {couponState.kind === "valid" && discountCents > 0 && (
                <>
                  <div className="flex justify-between py-1 opacity-80">
                    <span>Subtotal</span>
                    <span>${(subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1" style={{ color: "#e8d5b7" }}>
                    <span>Promo {couponState.code} (−{couponState.discount}%)</span>
                    <span>−${(discountCents / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "#3a2f24" }}>
                <span className="text-[11px] tracking-[0.32em]">TOTAL</span>
                <span className="font-serif text-3xl">${(totalCents / 100).toFixed(2)}</span>
              </div>
              <p className="mt-2 text-[11px] opacity-60">Paid at pickup. Cash or card accepted.</p>
            </div>


            <div
              className="rounded-none border p-4"
              style={{ borderColor: "#3a2f24", backgroundColor: "#0d0d0d" }}
            >
              <AgreementGate
                title="Pop-up order agreement & disclosures"
                text={GUEST_DISCLOSURE}
                agreeLabel="I have read and agree to the pop-up order agreement, including consent to receive SMS pickup updates."
                checked={agreed}
                onCheckedChange={setAgreed}
              />
            </div>

            {error && (
              <p className="text-sm" role="alert" style={{ color: "#ff8a80" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !agreed || totalItems === 0}
              className="inline-flex h-12 w-full items-center justify-center px-6 text-[11px] uppercase tracking-[0.32em] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "#e8d5b7", color: "#0d0d0d" }}
            >
              {submitting
                ? "Submitting…"
                : totalItems === 0
                ? "Add an item to continue"
                : `Place pre-order · $${(totalCents / 100).toFixed(2)}`}
            </button>

            <p className="text-[11px] leading-relaxed opacity-60">
              By placing your pre-order, you agree to receive pickup details by email and SMS.
              Limited quantities — orders are fulfilled in the order received.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

function MenuItem({
  numeral,
  title,
  price,
  note,
  addons,
}: {
  numeral: string;
  title: string;
  price: string;
  note: string;
  addons: [string, string][];
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-sm"
        style={{ borderColor: "#9c7a4a" }}
      >
        {numeral}
      </div>
      <div className="mt-6 flex items-baseline justify-center gap-4">
        <h3 className="font-serif text-2xl tracking-wide md:text-3xl">{title}</h3>
        <span className="text-xl md:text-2xl">{price}</span>
      </div>
      <p className="mt-3 text-xs tracking-wider opacity-80">{note}</p>
      <ul className="mx-auto mt-4 max-w-xs space-y-1 text-sm">
        {addons.map(([label, p]) => (
          <li key={label} className="flex items-baseline justify-between">
            <span className="opacity-90">{label}</span>
            <span className="opacity-90">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-4 inline-flex items-center border" style={{ borderColor: "#3a2f24" }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-10 w-10 text-lg disabled:opacity-30"
        disabled={value === 0}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="h-10 w-12 border-x text-center leading-10" style={{ borderColor: "#3a2f24" }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        className="h-10 w-10 text-lg"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function DarkField({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-[11px] tracking-[0.28em] opacity-70">
        {label.toUpperCase()}
        {required && <span className="ml-1" style={{ color: "#ff8a80" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full border px-3 text-sm focus:outline-none"
        style={{
          borderColor: "#3a2f24",
          backgroundColor: "#0d0d0d",
          color: "#e8d5b7",
        }}
      />
    </div>
  );
}
