import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logFormSubmission } from "@/lib/log-form-submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AgreementGate } from "@/components/site/AgreementGate";
import { GUEST_AGREEMENT_TEXT, GUEST_AGREEMENT_TITLE } from "@/lib/legal-agreements";
import richieAsset from "@/assets/richie-million-jr.jpg.asset.json";
import steakHero from "@/assets/steak-hero.jpg";
import friesAsset from "@/assets/fries.jpg.asset.json";
import mashAsset from "@/assets/mash.jpg.asset.json";
import salmonAsset from "@/assets/salmon.jpg.asset.json";

const foodGallery = [
  { src: steakHero, label: "New York Steak", alt: "Seared New York strip steak with rosemary and sea salt" },
  { src: salmonAsset.url, label: "Honey Dijon Salmon", alt: "Honey dijon glazed salmon with asparagus and lemon" },
  { src: mashAsset.url, label: "Buttered Mashed Potatoes", alt: "Creamy mashed potatoes with butter and chives" },
  { src: friesAsset.url, label: "Hand-Cut Fries", alt: "Golden crispy french fries with sea salt and parsley" },
];

const CHEF_SLUG = "richie-million-jr";

export const Route = createFileRoute("/chefs/richie-million-jr")({
  head: () => ({
    meta: [
      { title: "A Night with Richie Million Jr. — Communal Dining | Colorfull" },
      {
        name: "description",
        content:
          "Chef Richie Million Jr. — Philly-born, LA-based celebrity chef. Join a Colorfull communal dining experience: New York Steak and Honey Dijon Salmon, Tuesday, June 2, 2026 in West Hollywood.",
      },
      { property: "og:title", content: "A Night with Richie Million Jr. — Colorfull" },
      {
        property: "og:description",
        content:
          "An intimate Colorfull communal dining experience with celebrity Chef Richie Million Jr. — Tuesday, June 2, 2026, West Hollywood.",
      },
      { property: "og:image", content: richieAsset.url },
      { name: "twitter:image", content: richieAsset.url },
    ],
  }),
  component: RichiePage,
});

const tonightMenu = [
  {
    name: "New York Steak",
    detail:
      "with Yukon Gold potatoes and brown sugar honey caramelized carrots",
  },
  {
    name: "Honey Dijon Salmon",
    detail: "with sweet potato purée and lemon butter asparagus",
  },
];

const availableServices = [
  "Private celebrity chef dinners",
  "Intimate communal dining experiences",
  "Custom multi-course tasting menus",
  "Talent and on-set hospitality",
  "Dinner party meal preparation",
  "Special occasion private dining",
  "Wellness and clean-eating menu coordination",
  "In-home chef experiences across Los Angeles",
];

// Match Moshe's palette
const BG = "#FBF7EE";
const INK = "#1F2A1B";
const FOREST = "#2F4A2B";
const FOREST_SOFT = "#3E5C3A";
const PANEL = "#F4EEDE";

// Dark Molino-style featured palette
const DARK_BG = "#0d0d0d";
const DARK_FG = "#e8d5b7";
const DARK_ACCENT = "#9c7a4a";

function RichiePage() {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [preselect, setPreselect] = useState<string>("");

  const scrollToForm = (type: string) => {
    setPreselect(type);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#FBF7EE] text-[#1F2A1B]">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
              Colorfull · Chef Profile
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-6xl">
              Richie Million Jr.
            </h1>
            <p className="mt-4 text-lg text-[#3E5C3A] md:text-xl">
              Celebrity Private Chef · Philly Born, LA Made
            </p>
            <blockquote className="mt-8 border-l-2 border-[#3E5C3A] pl-5 font-serif text-2xl italic text-[#1F2A1B]/80">
              “Life is a journey. Enjoy every day.”
            </blockquote>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-[#2F4A2B] text-white hover:bg-[#243B22]"
                onClick={() => scrollToForm("Communal dining experience")}
              >
                Reserve a Seat Tonight
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#2F4A2B] text-[#2F4A2B] hover:bg-[#2F4A2B] hover:text-white"
                onClick={() => scrollToForm("Private chef booking")}
              >
                Book Richie Private
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-[#2F4A2B]/15 shadow-xl">
              <img
                src={richieAsset.url}
                alt="Portrait of Chef Richie Million Jr., a Philly-born, LA-based celebrity private chef offering communal dining experiences through Colorfull."
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-full bg-[#2F4A2B] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#FBF7EE] md:block">
              Dinner tonight
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED — TONIGHT'S DINNER (dark Molino-style) */}
      <section className="border-y" style={{ backgroundColor: DARK_BG, color: DARK_FG, borderColor: `${DARK_ACCENT}55` }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] opacity-70">
              Tonight · Communal dining experience
            </p>
            <h2
              className="mt-4 font-serif italic leading-[0.95]"
              style={{ fontSize: "clamp(56px, 11vw, 110px)" }}
            >
              a night with richie
            </h2>
            <div className="mt-5 flex items-center gap-3 text-[11px] tracking-[0.32em]">
              <span className="h-px w-8" style={{ backgroundColor: DARK_ACCENT }} />
              <span>WEST HOLLYWOOD · TUE JUNE 2</span>
            </div>
            <p className="mt-6 max-w-lg leading-relaxed opacity-85">
              An intimate Colorfull communal dining experience with celebrity Chef
              Richie Million Jr. Clean, soulful plates and the kind of conversation
              you don't want to end. Seats fill fast — RSVP to lock your spot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => scrollToForm("Communal dining experience")}
                className="inline-flex h-12 items-center px-7 text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-90"
                style={{ backgroundColor: DARK_FG, color: DARK_BG }}
              >
                Pull up tonight
              </button>
              <button
                onClick={() => scrollToForm("Private chef booking")}
                className="inline-flex h-12 items-center border px-7 text-[11px] uppercase tracking-[0.28em] transition-colors hover:bg-[#e8d5b7] hover:text-[#0d0d0d]"
                style={{ borderColor: DARK_FG, color: DARK_FG }}
              >
                Book Richie private
              </button>
            </div>
          </div>

          <div className="border px-8 py-10 text-center" style={{ borderColor: DARK_ACCENT }}>
            <p className="text-[11px] tracking-[0.42em] opacity-80">· MENU ·</p>
            <div className="mt-8 space-y-6">
              {tonightMenu.map((item, idx) => (
                <div key={item.name}>
                  <p className="font-serif text-2xl tracking-wide">{item.name.toUpperCase()}</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm opacity-70">{item.detail}</p>
                  {idx < tonightMenu.length - 1 && (
                    <div className="mx-auto mt-6 h-px w-10 opacity-40" style={{ backgroundColor: DARK_ACCENT }} />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-10 text-[11px] tracking-[0.32em] opacity-80">
              · TUE · JUNE 2 · WEST HOLLYWOOD ·
            </p>
          </div>
        </div>
      </section>

      {/* FOOD GALLERY */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#FBF7EE]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
            A taste of the table
          </p>
          <h2 className="mt-2 font-serif text-4xl md:text-5xl">What Richie Cooks</h2>
          <p className="mt-4 max-w-2xl text-[15px] text-[#1F2A1B]/75">
            Classic American plates done right — clean, generous, and built to
            bring people together. No pretense. All flavor.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {foodGallery.map((item) => (
              <figure
                key={item.label}
                className="overflow-hidden rounded-2xl border border-[#2F4A2B]/15 bg-white"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="px-5 py-4 text-[11px] uppercase tracking-[0.28em] text-[#2F4A2B]">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* BIO */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-serif text-3xl md:text-4xl">About Chef Richie</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#1F2A1B]/85">
            Born and raised in Philadelphia, Richie Million Jr. landed in
            California in 2003 chasing an acting dream. The screen didn't stick
            — but the kitchen did. What started as hustle became craft. What
            started as craft became a calling.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-[#1F2A1B]/85">
            Today, Richie moves through Los Angeles as one of the most in-demand
            celebrity private chefs in the game — feeding icons in music, film,
            and sport from his own playbook. No culinary school. No shortcuts.
            Every dish was earned night after night, sharpening instinct over
            technique and letting the ingredients do the talking.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-[#1F2A1B]/85">
            His cooking is honest, generous, and built around the people at the
            table. With Colorfull, he opens that table to you — a soulful evening
            of clean, vibrant food and the kind of conversation you don't want to
            end.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-4xl md:text-5xl">How It Works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              "Reserve your seat at tonight's table or lock in a private booking with Chef Richie.",
              "Colorfull handles the details — headcount, dietary needs, and the private location.",
              "Richie builds a clean, soulful menu around the table using seasonal, intentional ingredients.",
              "Show up, unwind, and vibe through an intimate evening of great food and real conversation.",
            ].map((text, i) => (
              <div key={i} className="rounded-2xl border border-[#2F4A2B]/15 bg-white p-6">
                <p className="font-serif text-3xl text-[#2F4A2B]">Step {i + 1}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-[#1F2A1B]/85">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVAILABLE SERVICES */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-4xl md:text-5xl">Available Services</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {availableServices.map((s) => (
              <div
                key={s}
                className="flex items-start gap-3 rounded-xl border border-[#2F4A2B]/15 bg-white px-5 py-4"
              >
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2F4A2B]" />
                <span className="text-[15px]">{s}</span>
              </div>
            ))}
          </div>
      </section>

      {/* REQUEST FORM */}
      <section ref={formRef} className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
          Request a booking
        </p>
        <h2 className="mt-2 font-serif text-4xl md:text-5xl">Submit Your Request</h2>
        <p className="mt-4 text-[15px] text-[#1F2A1B]/75">
          Share a few details and the Colorfull team will coordinate next steps
          with Chef Richie Million Jr.
        </p>
        <div className="mt-10 rounded-2xl border border-[#2F4A2B]/15 bg-white p-6 md:p-10 shadow-sm">
          <RequestForm initialServiceType={preselect} />
        </div>
      </section>
    </div>
  );
}

function RequestForm({ initialServiceType }: { initialServiceType: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    requested_date: "",
    requested_time: "",
    guest_count: "",
    city_state: "",
    dining_setting: "Indoor",
    dietary_restrictions: "",
    food_allergies: "",
    preferred_menu_items: "",
    occasion_type: "",
    service_type: initialServiceType || "Communal dining experience",
    additional_notes: "",
  });

  useEffect(() => {
    if (initialServiceType) {
      setForm((f) => ({ ...f, service_type: initialServiceType }));
    }
  }, [initialServiceType]);

  const update = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in name, email, and phone.");
      return;
    }
    if (!agreed) {
      toast.error("Please review and agree to the Guest & Attendee Agreement.");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("chef_meal_prep_requests").insert({
      chef_slug: CHEF_SLUG,
      full_name: form.full_name.trim().slice(0, 200),
      email: form.email.trim().slice(0, 255),
      phone: form.phone.trim().slice(0, 50),
      requested_date: form.requested_date || null,
      requested_time: form.requested_time || null,
      guest_count: form.guest_count ? Number(form.guest_count) : null,
      city_state: form.city_state.trim() || null,
      dining_setting: form.dining_setting || null,
      dietary_restrictions: form.dietary_restrictions.trim() || null,
      food_allergies: form.food_allergies.trim() || null,
      preferred_menu_items: form.preferred_menu_items.trim() || null,
      occasion_type: form.occasion_type.trim() || null,
      service_type: form.service_type || null,
      additional_notes: form.additional_notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    void logFormSubmission({
      source: "meal_prep_request",
      name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.city_state.trim() || null,
      notes:
        [
          form.dietary_restrictions,
          form.food_allergies,
          form.additional_notes,
        ]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" · ") || null,
      payload: {
        chef_slug: CHEF_SLUG,
        requested_date: form.requested_date || null,
        requested_time: form.requested_time || null,
        guest_count: form.guest_count || null,
        dining_setting: form.dining_setting || null,
        service_type: form.service_type || null,
        occasion_type: form.occasion_type || null,
      },
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <h3 className="font-serif text-2xl" style={{ color: FOREST }}>
          You're on the list.
        </h3>
        <p
          className="mt-4 text-[15px] leading-relaxed"
          style={{ color: "rgba(26,42,31,0.85)" }}
        >
          The Colorfull team will reach out shortly to confirm details with
          Richie. Watch your inbox.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-5 md:grid-cols-2"
    >
      <Field label="Full name" required>
        <Input
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          required
          maxLength={200}
        />
      </Field>
      <Field label="Email" required>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          maxLength={255}
        />
      </Field>
      <Field label="Phone number" required>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
          maxLength={50}
        />
      </Field>
      <Field label="City and state">
        <Input
          value={form.city_state}
          onChange={(e) => update("city_state", e.target.value)}
          maxLength={200}
        />
      </Field>
      <Field label="Requested date">
        <Input
          type="date"
          value={form.requested_date}
          onChange={(e) => update("requested_date", e.target.value)}
        />
      </Field>
      <Field label="Requested time">
        <Input
          type="time"
          value={form.requested_time}
          onChange={(e) => update("requested_time", e.target.value)}
        />
      </Field>
      <Field label="Number of guests">
        <Input
          type="number"
          min={1}
          max={500}
          value={form.guest_count}
          onChange={(e) => update("guest_count", e.target.value)}
        />
      </Field>
      <Field label="Indoor or outdoor dining">
        <select
          value={form.dining_setting}
          onChange={(e) => update("dining_setting", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option>Indoor</option>
          <option>Outdoor</option>
          <option>Either</option>
        </select>
      </Field>
      <Field label="Service type">
        <select
          value={form.service_type}
          onChange={(e) => update("service_type", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option>Communal dining experience</option>
          <option>Private chef booking</option>
          <option>Special event / talent hospitality</option>
          <option>Both</option>
        </select>
      </Field>
      <Field label="Special occasion or event type">
        <Input
          value={form.occasion_type}
          onChange={(e) => update("occasion_type", e.target.value)}
          maxLength={200}
        />
      </Field>
      <Field label="Dietary restrictions" full>
        <Textarea
          rows={2}
          value={form.dietary_restrictions}
          onChange={(e) => update("dietary_restrictions", e.target.value)}
          maxLength={1000}
        />
      </Field>
      <Field label="Food allergies" full>
        <Textarea
          rows={2}
          value={form.food_allergies}
          onChange={(e) => update("food_allergies", e.target.value)}
          maxLength={1000}
        />
      </Field>
      <Field label="Preferred menu items" full>
        <Textarea
          rows={3}
          value={form.preferred_menu_items}
          onChange={(e) => update("preferred_menu_items", e.target.value)}
          maxLength={2000}
        />
      </Field>
      <Field label="Additional notes" full>
        <Textarea
          rows={3}
          value={form.additional_notes}
          onChange={(e) => update("additional_notes", e.target.value)}
          maxLength={2000}
        />
      </Field>
      <div className="md:col-span-2">
        <AgreementGate
          title={GUEST_AGREEMENT_TITLE}
          text={GUEST_AGREEMENT_TEXT}
          agreeLabel="I have read and agree to the Colorfull Guest & Attendee Agreement, including the assumption of risk, marketing and data-use consent, indemnification, content rights, non-circumvention, and binding arbitration."
          checked={agreed}
          onCheckedChange={setAgreed}
        />
      </div>
      <div className="md:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={submitting || !agreed}
          className="w-full text-white"
          style={{ backgroundColor: FOREST }}
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label
        className="text-[13px] font-medium"
        style={{ color: "rgba(26,42,31,0.8)" }}
      >
        {label}
        {required && <span style={{ color: FOREST }}> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
