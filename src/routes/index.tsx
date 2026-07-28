import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-table.jpg";
import plantForwardImg from "@/assets/plant-forward-table.jpg";
import shabbatImg from "@/assets/table-shabbat.jpg";
import sacredImg from "@/assets/table-sacred.jpg";
import hostPortrait from "@/assets/host-portrait.jpg";
import steakHero from "@/assets/steak-hero.jpg";
import richieHero from "@/assets/richie-hero.jpg.asset.json";

import { TABLES, ARCHETYPES, HOSTS, TESTIMONIALS } from "@/lib/tables-data";
import { FEATURED_TASTEMAKERS } from "@/lib/tastemakers-data";
import { EventCard } from "@/components/site/EventCard";
import { ScrollHint } from "@/components/site/ScrollHint";
import { EVENT_END } from "@/lib/event-status";



const ARCHETYPE_IMAGES: Record<string, string> = {
  "Heritage Table": "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=70",
  "Mediterranean Table": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=70",
  "Sacred Table": sacredImg,
  "Plant Forward Table": plantForwardImg,
  "Longevity Table": "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=70",
  "Fire Table": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70",
  "Sensory Table": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=70",
  "Biohacker Table": "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=800&q=70",
  "Creator Table": "https://images.unsplash.com/photo-1529543544282-ea669407fca3?auto=format&fit=crop&w=800&q=70",
  "Music Table": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=70",
  "Shabbat Table": shabbatImg,
  "Founding Salon": "https://images.unsplash.com/photo-1530062845289-9109b2c9c868?auto=format&fit=crop&w=800&q=70",
};

// Focal points for archetype thumbnails — keeps key subjects (e.g. the fork
// in Plant Forward Table) in frame when the slot crops away from 1:1.
const ARCHETYPE_FOCAL: Record<string, string> = {
  "Plant Forward Table": "30% center",
};


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Colorfull — One shared table" },
      { name: "description", content: "California just unlocked communal dining. Colorfull curates the tables. Apply to attend." },
      { property: "og:title", content: "Colorfull — One shared table" },
      { property: "og:description", content: "California just unlocked communal dining. Colorfull curates the tables. Apply to attend." },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[52vh] min-h-[380px] w-full overflow-hidden md:h-[64vh] md:min-h-[520px]">
          <img
            src={heroImg}
            alt="A candlelit communal dinner table"
            width={1920}
            height={1280}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />
          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-8 text-cream md:pb-14">
            <div className="anim-fade-up flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em]"
                style={{
                  borderColor: "color-mix(in oklab, var(--cream) 60%, transparent)",
                  color: "var(--cream)",
                  backgroundColor: "color-mix(in oklab, var(--cream) 10%, transparent)",
                }}
              >
                <span
                  className="relative inline-flex h-1.5 w-1.5"
                  aria-hidden
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Now live · First dinner seated
              </span>
              <p className="eyebrow" style={{ color: "var(--cream)" }}>
                Curated communal dining · California
              </p>
            </div>
            <h1 className="anim-fade-up anim-delay-1 mt-3 max-w-3xl font-serif text-[1.75rem] leading-[1.08] text-balance md:text-5xl lg:text-6xl" style={{ color: "var(--cream)" }}>
              California just unlocked communal dining.
            </h1>
            <p className="anim-fade-up anim-delay-2 mt-3 max-w-md text-[13px] leading-relaxed md:text-base" style={{ color: "color-mix(in oklab, var(--cream) 80%, transparent)" }}>
              Intimate, hosted dinners in private spaces — curated around culture, conversation, and community.
            </p>
            <div className="anim-fade-up anim-delay-3 mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Link
                to="/discover"
                className="inline-flex h-11 items-center justify-center bg-cream px-7 text-[11px] uppercase tracking-[0.24em] text-ink transition-colors hover:bg-cream/90"
                style={{ backgroundColor: "var(--cream)", color: "var(--ink)" }}
              >
                Apply to Attend
              </Link>
              <Link
                to="/host"
                className="inline-flex h-11 items-center justify-center border border-cream/70 px-7 text-[11px] uppercase tracking-[0.24em] transition-colors hover:bg-cream hover:text-ink"
                style={{ color: "var(--cream)", borderColor: "color-mix(in oklab, var(--cream) 70%, transparent)" }}
              >
                Apply to Host
              </Link>
            </div>
            <p
              className="anim-fade-up anim-delay-3 mt-5 max-w-2xl text-[11px] leading-relaxed"
              style={{ color: "color-mix(in oklab, var(--cream) 70%, transparent)" }}
            >
              Experiences are hosted by independent hosts, chefs, caterers, permitted home kitchen
              operators, licensed venues, or other legally authorized providers. Each host or
              provider is responsible for all required food, health, safety, zoning, business,
              alcohol, tax, and insurance compliance.
            </p>
          </div>
        </div>
      </section>

      {/* Discover callout */}
      <section className="mx-auto max-w-6xl px-6 py-6 md:py-10">
        <div className="rounded-2xl border border-border bg-card p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <p className="eyebrow text-muted-foreground">New — browse by month</p>
            <h2 className="mt-2 font-serif text-xl md:text-2xl">
              Find tables that match your schedule.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Filter upcoming dinners by month, explore curated tables by theme, and apply to attend the ones that speak to you.
            </p>
          </div>
          <Link
            to="/discover"
            className="mt-5 inline-flex h-11 items-center justify-center bg-primary px-7 text-[11px] uppercase tracking-[0.24em] text-primary-foreground transition-colors hover:bg-primary/90 md:mt-0"
          >
            Discover tables
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="grid gap-x-12 gap-y-6 md:grid-cols-3 md:gap-y-10">
          {[
            { k: "Curated", t: "Tables, not transactions", b: "Every dinner is hand-selected. Hosts and guests go through an application-based review process.", note: "Application review does not constitute a background check, safety certification, legal approval, permit verification, or insurance guarantee unless expressly stated in writing." },
            { k: "Private", t: "Locations revealed after approval", b: "We share the neighborhood up front. The exact address arrives once you're in." },
            { k: "Limited", t: "Eight to twelve seats", b: "Small enough for real conversation. Large enough to meet someone new." },
          ].map((c) => (
            <div key={c.k}>
              <p className="eyebrow">{c.k}</p>
              <h3 className="mt-2 font-serif text-lg leading-snug md:text-2xl md:mt-4">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:mt-3">{c.b}</p>
              {c.note && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{c.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Archetype carousel */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-4 md:pt-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Browse tables</p>
              <h2 className="mt-2 font-serif text-2xl md:text-3xl">By feeling.</h2>
            </div>
            <Link to="/discover" className="hidden text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px] md:inline">
              See all
            </Link>
          </div>
        </div>
        <div className="pb-12 md:pb-16">
          <ul className="flex snap-x gap-3 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ARCHETYPES.map((a) => {
              const img = ARCHETYPE_IMAGES[a] ?? TABLES.find((x) => x.archetype === a)?.image;
              return (
                <li key={a} className="snap-start shrink-0 basis-[32%] sm:basis-[24%] md:basis-[18%] lg:basis-[14%]">
                  <div className="block">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      {img ? (
                        <img
                          src={img}
                          alt={a}
                          loading="lazy"
                          style={ARCHETYPE_FOCAL[a] ? { objectPosition: ARCHETYPE_FOCAL[a] } : undefined}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          aria-label={a}
                          role="img"
                          className="absolute inset-0 flex items-center justify-center bg-muted text-center font-serif text-xs text-muted-foreground"
                        >
                          {a}
                        </div>
                      )}
                    </div>
                    <p className="mt-3 font-serif text-[15px] leading-tight md:text-base">{a}</p>
                  </div>
                </li>

              );
            })}
          </ul>
          <div className="flex items-center justify-between px-6">
            <ScrollHint direction="left" className="!mr-0 !pl-0" />
            <ScrollHint direction="right" className="!ml-0 !pr-0" />
          </div>
        </div>
      </section>

      {/* Featured tables carousel */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-4 md:pt-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">This season's tables</p>
              <h2 className="mt-2 font-serif text-2xl md:text-3xl">Where strangers become guests.</h2>
            </div>
            <Link to="/discover" className="hidden text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px] md:inline">
              All tables
            </Link>
          </div>
        </div>
        <div className="pb-14 md:pb-16">
          <ul className="flex snap-x gap-3 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABLES.map((t) => (
              <li key={t.id} className="snap-start shrink-0 basis-[70%] sm:basis-[44%] md:basis-[32%] lg:basis-[24%]">
                <Link to="/tables/$tableId" params={{ tableId: t.id }} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                    <img
                      src={t.image}
                      alt={t.title}
                      loading="lazy"
                      style={t.focalPoint ? { objectPosition: t.focalPoint } : undefined}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t.neighborhood}</p>
                    <p className="mt-1 font-serif text-base leading-tight">{t.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.date} · ${t.price}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-6">
            <ScrollHint direction="left" className="!mr-0 !pl-0" />
            <ScrollHint direction="right" className="!ml-0 !pr-0" />
          </div>
        </div>
      </section>

      {/* Meet the hosts */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Meet the hosts</p>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl">The people setting the table.</h2>
            </div>
            <Link to="/hosts" className="hidden text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px] md:inline">
              All hosts
            </Link>
          </div>
          <div className="mt-14 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {HOSTS.slice(0, 4).map((h) => (
              <article key={h.id} className="group flex flex-col">
                <div className="aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={h.portrait ?? hostPortrait}
                    alt={`Portrait of ${h.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4">
                  <p className="eyebrow">{h.archetype}</p>
                  <h3 className="mt-2 font-serif text-xl">{h.name}</h3>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{h.neighborhood}</p>
                  <p className="mt-3 font-serif italic text-sm text-foreground/75 line-clamp-2">"{h.philosophy}"</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="border-t border-border bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Upcoming events</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl md:text-5xl text-balance">
                Reserve your seat at the next table.
              </h2>
            </div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <EventCard
              to="/molino-pizza-pop-up"
              endsAt={EVENT_END.molinoSaturdayJune6}
              imageSrc="/__l5e/assets-v1/0d696a9a-4ee6-4e95-ba5b-e001c9e93c5f/moshe-margherita.jpg"
              imageAlt="Wood-fired Neapolitan margherita pizza from Chef Moshe Fhima's Molino pop-up"
              dateLabel="Sat · June 6 · 9:25 PM — 12:30 AM"
              title="Molino · Saturday Night Pizza Pop-Up"
              description="Chef Moshe Fhima returns for one Saturday night. Margherita, La Bianca, Fusilloni alla Vodka and the new Nutella Calzone. Pay by card to reserve — limited quantities."
              endedDescription="Saturday's pop-up has ended. Stay tuned for the next Molino night."
              ctaLabel="Pre-order pizza →"
            />
            <EventCard
              to="/chefs/moshe-fhima"
              endsAt={EVENT_END.molinoWednesdayJune3}
              imageSrc="/__l5e/assets-v1/0d696a9a-4ee6-4e95-ba5b-e001c9e93c5f/moshe-margherita.jpg"
              imageAlt="Molino Wednesday pop-up"
              dateLabel="Wed · June 3 · 12:30 — 4:30 PM"
              title="Molino · Wednesday Pop-Up"
              description="A one-day, wood-fired pizza pop-up by Chef Moshe Fhima."
              endedDescription="This pop-up has ended. Catch the next Molino on Saturday night."
              ctaLabel="See chef →"
            />

            <EventCard
              to="/chefs/richie-million-jr"
              endsAt={EVENT_END.richieTuesdayJune2}
              imageSrc={richieHero.url}
              imageAlt="Seared New York strip steak from a Colorfull communal dinner with Chef Richie Million Jr."
              dateLabel="Tue · June 2 · West Hollywood"
              title="A Night with Richie Million Jr."
              description="A communal dining experience with celebrity Chef Richie Million Jr. New York Steak and Honey Dijon Salmon, family-style. Limited seats — RSVP to lock yours in."
              endedDescription="This dinner has ended. New Richie nights coming soon."
              ctaLabel="RSVP for dinner →"
              tone="dark"
              onImageError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/og-image.jpg";
              }}
            />


            <Link
              to="/tastemakers"
              className="group flex flex-col items-start justify-center gap-4 rounded-2xl border border-dashed border-border bg-background p-8 text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              <p className="eyebrow">More tables coming soon</p>
              <p className="font-serif text-2xl text-foreground">
                Browse all tastemakers & request a seat.
              </p>
              <span className="inline-flex h-10 items-center border border-border px-5 text-[11px] uppercase tracking-[0.22em] group-hover:border-foreground">
                Explore tastemakers →
              </span>
            </Link>

          </div>
        </div>
      </section>

      {/* Featured Tastemakers */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Featured tastemakers</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl md:text-5xl text-balance">
                From content to community.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                A curated circle of chefs and creators turning their food world into real tables,
                meal plans, and gatherings.
              </p>
            </div>
            <Link
              to="/tastemakers"
              className="hidden text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px] md:inline"
            >
              All tastemakers
            </Link>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TASTEMAKERS.slice(0, 3).map((t) => (
              <li key={t.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-secondary/30">
                <Link
                  to="/tastemakers/$tastemakerId"
                  params={{ tastemakerId: t.id }}
                  className="relative block aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={t.cover}
                    alt={t.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={`Portrait of ${t.name}`} className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <h3 className="font-serif text-lg leading-tight">{t.name}</h3>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {t.neighborhood} · {t.cuisineFocus[0]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 font-serif italic text-sm text-foreground/75 line-clamp-2">
                    "{t.philosophy}"
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      to="/tastemakers/$tastemakerId"
                      params={{ tastemakerId: t.id }}
                      className="inline-flex h-9 items-center bg-foreground px-4 text-[10.5px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
                    >
                      View profile
                    </Link>
                    <Link
                      to="/apply"
                      search={{ intent: "attend" }}
                      className="inline-flex h-9 items-center border border-border px-4 text-[10.5px] uppercase tracking-[0.22em] hover:border-foreground"
                    >
                      Request a table
                    </Link>
                    <Link
                      to="/apply"
                      search={{ intent: "attend" }}
                      className="inline-flex h-9 items-center border border-border px-4 text-[10.5px] uppercase tracking-[0.22em] hover:border-foreground"
                    >
                      Meal plan
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex justify-center md:hidden">
            <Link
              to="/tastemakers"
              className="text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px]"
            >
              All tastemakers
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="eyebrow">From the table</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl md:text-5xl">What guests carry home.</h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="border-t border-border pt-6">
              <blockquote className="font-serif text-xl leading-snug text-balance">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {t.name} · <span className="normal-case tracking-normal">{t.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="eyebrow" style={{ color: "color-mix(in oklab, var(--primary-foreground) 80%, transparent)" }}>
            How it works
          </p>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl md:text-5xl">
            A small, considered process.
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              { n: "01", t: "Apply to attend", b: "Tell us a little about yourself and which kind of table you're drawn to." },
              { n: "02", t: "Get approved", b: "Hosts review each guest. Approval unlocks payment and the private address." },
              { n: "03", t: "Sit at the table", b: "Arrive a stranger. Leave with a community." },
            ].map((s) => (
              <li key={s.n}>
                <div className="font-serif text-3xl opacity-80">{s.n}</div>
                <h3 className="mt-3 font-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed opacity-80">{s.b}</p>
              </li>
            ))}
          </ol>
          <Link
            to="/how-it-works"
            className="mt-12 inline-flex h-11 items-center border border-primary-foreground/60 px-6 text-[11px] uppercase tracking-[0.24em] hover:bg-primary-foreground hover:text-primary"
          >
            Read more
          </Link>
        </div>
      </section>

      {/* Founding salon */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow">An invitation</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">The Founding Salon.</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              An intimate first table for the <span className="brand-wordmark">Colorfull</span> community. A curated evening of food,
              conversation, culture, and connection. Limited seats. Private location revealed
              after approval.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/founding-salon"
                className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
              >
                Apply to Attend
              </Link>
            </div>
          </div>
          <div className="aspect-[4/5] overflow-hidden bg-muted">
            <img src={TABLES[5].image} alt="Founding Salon" loading="lazy" style={TABLES[5].focalPoint ? { objectPosition: TABLES[5].focalPoint } : undefined} className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="eyebrow">Join the waitlist</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">
            Be invited to the next table.
          </h2>
          <p className="mt-4 text-muted-foreground">
            New tables open each week. Leave your email and we'll let you know when seats are available in your city.
          </p>
          <form
            className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); alert("You're on the list."); }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="h-12 flex-1 border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Request access
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
