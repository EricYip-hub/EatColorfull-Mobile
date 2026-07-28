import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  getChefProfileByTastemakerId,
  listActiveListingsForChef,
  type ChefListing,
  type ChefProfile,
} from "@/lib/chef-kitchen";
import { CheckoutDialog } from "@/components/chef/CheckoutDialog";
import { ListingPhotoCarousel } from "@/components/chef/ListingPhotoCarousel";



const CHEF_SLUG = "moshe-fhima";

export const Route = createFileRoute("/chefs/moshe-fhima")({
  head: () => ({
    meta: [
      { title: "Chef Moshe Fhima — Italian & French Meal Preparation | Colorfull" },
      {
        name: "description",
        content:
          "Chef Moshe Fhima offers curated Italian and French inspired meal preparation, private dining, and communal dining experiences through Colorfull. Request a meal prep package or schedule a hosted dinner today.",
      },
      { property: "og:title", content: "Chef Moshe Fhima — Italian & French Meal Preparation" },
      {
        property: "og:description",
        content:
          "Curated meal preparation, private dining, and communal dining experiences with Chef Moshe Fhima — book through Colorfull.",
      },
      { property: "og:image", content: "https://eatcolorfull.com/moshe-fhima.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/moshe-fhima.jpg" },
    ],
  }),
  component: MoshePage,
});

type ServiceInfo = {
  first_use_date: string | null;
  first_interstate_use_date: string | null;
};

const menu = {
  "Bread and Starters": [
    { name: "48-hour naturally leavened focaccia" },
    { name: "Burrata with shaved Périgord truffles" },
    {
      name: "Sea bream crudo",
      detail:
        "Shiso, tangerine, blood orange, fennel fronds, chive oil, extra virgin olive oil",
    },
    {
      name: "Bluefin tuna akami crudo",
      detail:
        "Watermelon radish, apple, kiwi garnish, grapefruit, extra virgin olive oil",
    },
    {
      name: "Brown butter Caesar salad",
      detail: "Thyme and garlic roasted breadcrumbs",
    },
    {
      name: "Cantabrian anchoas",
      detail: "Meyer lemon zest, garlic, extra virgin olive oil",
    },
  ],
  Pesce: [
    {
      name: "4 lb Mediterranean branzino",
      detail:
        "Parsley, shallot, lemon, and thyme, finished with charred baby artichokes and soft herb chimichurri",
    },
    {
      name: "Wild bluefin tuna steak",
      detail: "Harissa salsa with capers and taggiasca olives, arugula",
    },
  ],
  Pasta: [
    { name: "Mezzi paccheri alla puttanesca" },
    { name: "Spaghettoni alla Nerano" },
  ],
  Pizza: [{ name: "72-hour Neapolitan pizza" }],
  Dessert: [{ name: "Tiramisu" }],
};

const availableServices = [
  "Meal preparation services",
  "Private chef meal preparation",
  "Communal dining experience planning",
  "Custom menu coordination",
  "Dinner party meal preparation",
  "Special occasion meal preparation",
  "Ingredient-focused menu curation",
  "Italian and French inspired private dining",
];

function MoshePage() {
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [preselect, setPreselect] = useState<string>("");

  useEffect(() => {
    supabase
      .from("chef_service_info")
      .select("first_use_date, first_interstate_use_date")
      .eq("chef_slug", CHEF_SLUG)
      .maybeSingle()
      .then(({ data }) => setServiceInfo(data ?? { first_use_date: null, first_interstate_use_date: null }));
  }, []);

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
              Moshe Fhima
            </h1>
            <p className="mt-4 text-lg text-[#3E5C3A] md:text-xl">
              Italian and French Inspired Meal Preparation Experiences
            </p>
            <blockquote className="mt-8 border-l-2 border-[#3E5C3A] pl-5 font-serif text-2xl italic text-[#1F2A1B]/80">
              “Food is a universal language.”
            </blockquote>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-[#2F4A2B] text-white hover:bg-[#243B22]"
                onClick={() => scrollToForm("Meal prep package")}
              >
                Request Chef Experience
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#2F4A2B] text-[#2F4A2B] hover:bg-[#2F4A2B] hover:text-white"
                onClick={() => scrollToForm("Communal dining experience")}
              >
                Schedule a Communal Dining Experience
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-[#2F4A2B]/15 shadow-xl">
              <img
                src="/moshe-fhima.jpg"
                alt="Portrait of Chef Moshe Fhima, an experienced Italian and French cuisine chef offering curated meal preparation and private dining experiences through Colorfull."
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-full bg-[#2F4A2B] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#FBF7EE] md:block">
              Actively booking
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED — VINTAGE 1986 (Mon, June 8) */}
      <section className="border-y" style={{ backgroundColor: "#f4ecd8", color: "#1a1a1a", borderColor: "#a72525" }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "#a72525" }}>
              Monday, June 8 · invite only
            </p>
            <h2
              className="mt-4 font-serif italic leading-[0.95]"
              style={{ color: "#a72525", fontSize: "clamp(56px, 11vw, 120px)" }}
            >
              vintage 1986
            </h2>
            <p className="mt-4 font-serif italic text-2xl">
              curated menu by <span style={{ color: "#a72525" }}>molino</span>
            </p>
            <p className="mt-6 max-w-lg leading-relaxed">
              A curated Italian dinner by Chef Moshe celebrating 40.
              Mon, June 8 · 8 PM drinks & d'hordeuvres · 9 PM dinner.
              RSVP with your invite code — address shared after confirmation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/vintage-1986"
                className="inline-flex h-12 items-center px-7 text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#a72525", color: "#f4ecd8" }}
              >
                RSVP now
              </Link>
              <Link
                to="/vintage-1986"
                hash="rsvp"
                className="inline-flex h-12 items-center border px-7 text-[11px] uppercase tracking-[0.28em] transition-colors hover:bg-[#a72525] hover:text-[#f4ecd8]"
                style={{ borderColor: "#a72525", color: "#a72525" }}
              >
                View invite
              </Link>
            </div>
          </div>

          <div className="border-2 px-8 py-10 text-center" style={{ borderColor: "#a72525" }}>
            <p className="text-[11px] tracking-[0.42em]" style={{ color: "#a72525" }}>· CELEBRATING 40 ·</p>
            <p className="mt-6 text-lg tracking-widest">monday · 06.08.26</p>
            <p className="mt-1 font-serif italic" style={{ color: "#a72525" }}>starts at 8 pm</p>
            <div className="mx-auto my-5 h-px w-10" style={{ backgroundColor: "#a72525", opacity: 0.4 }} />
            <p className="text-sm">8:00 pm · <em>drinks &amp; d'hordeuvres</em></p>
            <p className="text-sm">9:00 pm · <em>curated italian dinner</em></p>
            <div className="mx-auto my-5 h-px w-10" style={{ backgroundColor: "#a72525", opacity: 0.4 }} />
            <p className="font-serif italic text-sm" style={{ color: "#a72525" }}>
              address provided after confirmation
            </p>
          </div>
        </div>
      </section>


      {/* ORDER NOW — pay-now listings */}
      <MosheOrderNow />

      {/* BIO */}

      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-serif text-3xl md:text-4xl">About Chef Moshe</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#1F2A1B]/85">
            Moshe Fhima is an experienced chef with over 10 years of restaurant
            experience specializing in Italian and French cuisine. Growing up in
            Paris, Moshe learned many of his family's recipes from his mother,
            who passed down traditions from her grandmother. His cooking is
            rooted in heritage, technique, and the careful selection of
            beautiful ingredients. Moshe has a special touch for bringing the
            finest ingredients together with warmth, creativity, and precision.
            His mission is simple: to make you smile with every bite.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-[#1F2A1B]/85">
            Moshe offers curated meal preparation services for private dining,
            communal dining experiences, intimate gatherings, hosted dinners,
            and special occasions. Guests may request a custom meal preparation
            package, coordinate menu preferences, schedule a date, and submit
            details through Colorfull.
          </p>
        </div>
      </section>

      {/* ACTIVE MENU */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
              Now booking
            </p>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl">
              Active Meal Preparation Menu
            </h2>
          </div>
          <span className="hidden rounded-full border border-[#2F4A2B]/30 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#2F4A2B] md:inline-block">
            Available for booking
          </span>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {Object.entries(menu).map(([section, items]) => (
            <div
              key={section}
              className="rounded-2xl border border-[#2F4A2B]/15 bg-white p-8 shadow-sm"
            >
              <h3 className="font-serif text-2xl text-[#2F4A2B]">{section}</h3>
              <ul className="mt-6 space-y-5">
                {items.map((item) => (
                  <li key={item.name}>
                    <p className="font-medium">{item.name}</p>
                    {"detail" in item && item.detail && (
                      <p className="mt-1 text-sm italic text-[#1F2A1B]/65">
                        {item.detail}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-4xl md:text-5xl">How It Works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              "Browse Moshe's active meal preparation menu.",
              "Submit a meal prep or communal dining request through Colorfull.",
              "Colorfull helps coordinate the date, time, guest count, menu preferences, and special requests.",
              "Moshe prepares a curated meal experience using selected ingredients and his Italian and French culinary background.",
            ].map((text, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#2F4A2B]/15 bg-white p-6"
              >
                <p className="font-serif text-3xl text-[#2F4A2B]">
                  Step {i + 1}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-[#1F2A1B]/85">
                  {text}
                </p>
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

      {/* AVAILABILITY */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-serif text-3xl md:text-4xl">Service Availability</h2>
          <p className="mt-5 text-lg leading-relaxed text-[#1F2A1B]/85">
            Moshe's meal preparation services are currently available by
            request through Colorfull. Availability depends on requested date,
            guest count, menu selection, chef schedule, and location. Guests
            may submit a request through this page to begin scheduling and
            coordination.
          </p>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section ref={formRef} className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
          Request a booking
        </p>
        <h2 className="mt-2 font-serif text-4xl md:text-5xl">
          Submit Your Request
        </h2>
        <p className="mt-4 text-[15px] text-[#1F2A1B]/75">
          Share a few details and the Colorfull team will coordinate next steps
          with Chef Moshe Fhima.
        </p>
        <div className="mt-10 rounded-2xl border border-[#2F4A2B]/15 bg-white p-6 md:p-10 shadow-sm">
          <RequestForm initialServiceType={preselect} />
        </div>
      </section>

      {/* FIRST USE INFO */}
      <section className="border-t border-[#2F4A2B]/10 bg-[#F4EEDE]">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h2 className="font-serif text-2xl md:text-3xl">First Use Information</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[#1F2A1B]/85">
            For trademark and service verification purposes, Colorfull began
            offering and promoting these services on:{" "}
            <strong>
              {serviceInfo?.first_use_date
                ? new Date(serviceInfo.first_use_date).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "long", day: "numeric" },
                  )
                : "[insert first date of use]"}
            </strong>
            .
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#1F2A1B]/85">
            Colorfull began offering or promoting these services to customers
            outside California on:{" "}
            <strong>
              {serviceInfo?.first_interstate_use_date
                ? new Date(
                    serviceInfo.first_interstate_use_date,
                  ).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "[insert first interstate use date, if applicable]"}
            </strong>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function MosheOrderNow() {
  const [chef, setChef] = useState<ChefProfile | null>(null);
  const [items, setItems] = useState<ChefListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListing, setActiveListing] = useState<
    (ChefListing & { chef: ChefProfile }) | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getChefProfileByTastemakerId(CHEF_SLUG);
      if (!c) {
        if (!cancelled) setLoading(false);
        return;
      }
      const list = await listActiveListingsForChef(c.id);
      if (cancelled) return;
      setChef(c);
      setItems(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !chef || items.length === 0) return null;

  return (
    <section className="border-t border-[#2F4A2B]/10 bg-[#FBF7EE]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#3E5C3A]">
              Order now · Pay to reserve
            </p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Pre-order from Chef Moshe
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#1F2A1B]/75">
              Secure your spot with a card. All food is purchased and curated
              with the intention you will show up — no refunds.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <div
              key={l.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#2F4A2B]/15 bg-white shadow-sm"
            >
              <ListingPhotoCarousel
                photos={l.photos}
                alt={l.title}
                fallback={
                  <div className="flex h-full w-full items-center justify-center font-serif text-2xl italic text-[#2F4A2B]/50">
                    molino
                  </div>
                }
              />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#3E5C3A]">
                  Molino pop-up
                </p>
                <h3 className="font-serif text-xl leading-tight">{l.title}</h3>
                {l.description && (
                  <p className="text-sm leading-relaxed text-[#1F2A1B]/75">
                    {l.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2">
                  {l.price_cents != null && (
                    <p className="font-serif text-xl">
                      ${(l.price_cents / 100).toFixed(0)}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="bg-[#2F4A2B] text-white hover:bg-[#243B22]"
                    onClick={() => setActiveListing({ ...l, chef })}
                  >
                    Pay & reserve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeListing && (
        <CheckoutDialog
          open={!!activeListing}
          onOpenChange={(o) => !o && setActiveListing(null)}
          listing={activeListing}
        />
      )}
    </section>
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
    service_type: initialServiceType || "Meal prep",
    additional_notes: "",
  });

  useEffect(() => {
    if (initialServiceType) {
      setForm((f) => ({ ...f, service_type: initialServiceType }));
    }
  }, [initialServiceType]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      notes: [form.dietary_restrictions, form.food_allergies, form.additional_notes]
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
        <h3 className="font-serif text-2xl text-[#2F4A2B]">Thank you.</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[#1F2A1B]/85">
          Your meal preparation request has been received. The Colorfull team
          will review your request and coordinate next steps with Chef Moshe
          Fhima.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Full name" required>
        <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required maxLength={200} />
      </Field>
      <Field label="Email" required>
        <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required maxLength={255} />
      </Field>
      <Field label="Phone number" required>
        <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required maxLength={50} />
      </Field>
      <Field label="City and state">
        <Input value={form.city_state} onChange={(e) => update("city_state", e.target.value)} maxLength={200} />
      </Field>
      <Field label="Requested date">
        <Input type="date" value={form.requested_date} onChange={(e) => update("requested_date", e.target.value)} />
      </Field>
      <Field label="Requested time">
        <Input type="time" value={form.requested_time} onChange={(e) => update("requested_time", e.target.value)} />
      </Field>
      <Field label="Number of guests">
        <Input type="number" min={1} max={500} value={form.guest_count} onChange={(e) => update("guest_count", e.target.value)} />
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
          <option>Chef-prepared meal prep</option>
          <option>Hosted communal dining experience</option>
          <option>Both</option>
        </select>
      </Field>
      <Field label="Special occasion or event type">
        <Input value={form.occasion_type} onChange={(e) => update("occasion_type", e.target.value)} maxLength={200} />
      </Field>
      <Field label="Dietary restrictions" full>
        <Textarea rows={2} value={form.dietary_restrictions} onChange={(e) => update("dietary_restrictions", e.target.value)} maxLength={1000} />
      </Field>
      <Field label="Food allergies" full>
        <Textarea rows={2} value={form.food_allergies} onChange={(e) => update("food_allergies", e.target.value)} maxLength={1000} />
      </Field>
      <Field label="Preferred menu items" full>
        <Textarea rows={3} value={form.preferred_menu_items} onChange={(e) => update("preferred_menu_items", e.target.value)} maxLength={2000} />
      </Field>
      <Field label="Additional notes" full>
        <Textarea rows={3} value={form.additional_notes} onChange={(e) => update("additional_notes", e.target.value)} maxLength={2000} />
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
          className="w-full bg-[#2F4A2B] text-white hover:bg-[#243B22]"
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
      <Label className="text-[13px] font-medium text-[#1F2A1B]/80">
        {label}
        {required && <span className="text-[#2F4A2B]"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
