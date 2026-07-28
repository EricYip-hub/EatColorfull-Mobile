import { createFileRoute, Link } from "@tanstack/react-router";
import { TABLES } from "@/lib/tables-data";

export const Route = createFileRoute("/founding-salon")({
  head: () => ({
    meta: [
      { title: "The Founding Salon — Colorfull" },
      { name: "description", content: "An intimate first table for the Colorfull community." },
      { property: "og:image", content: TABLES[5].image },
    ],
  }),
  component: FoundingSalon,
});

function FoundingSalon() {
  const t = TABLES.find((x) => x.id === "founding-salon")!;
  return (
    <>
      <section className="relative">
        <div className="relative h-[72vh] min-h-[520px] overflow-hidden">
          <img src={t.image} alt="The Founding Salon" style={t.focalPoint ? { objectPosition: t.focalPoint } : undefined} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
          <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-16">
            <p className="eyebrow" style={{ color: "color-mix(in oklab, var(--cream) 80%, transparent)" }}>
              An invitation
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl md:text-7xl text-balance" style={{ color: "var(--cream)" }}>
              The Founding Salon.
            </h1>
            <p className="mt-5 max-w-xl text-cream/80" style={{ color: "color-mix(in oklab, var(--cream) 85%, transparent)" }}>
              An intimate first table for the <span className="brand-wordmark">Colorfull</span> community. A curated evening of food,
              conversation, culture, and connection.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-16 px-6 py-20 md:grid-cols-[1fr_320px]">
        <div className="space-y-12">
          <div className="grid grid-cols-2 gap-6 border-y border-border py-8 text-sm md:grid-cols-4">
            <Detail k="When" v={`${t.date} · ${t.time}`} />
            <Detail k="Where" v={t.neighborhood} />
            <Detail k="Seats" v={`${t.seatsRemaining} of ${t.seatsTotal}`} />
            <Detail k="Table fee" v={`$${t.price}`} />
          </div>

          <div>
            <p className="eyebrow">The evening</p>
            <p className="mt-4 font-serif text-2xl leading-snug">
              A founding table, gathered to set the tone for the community to come. Limited seats.
              Curated guest list. Conditional approval until minimum seats are reached.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              "Limited to 12 seats",
              "Curated guest list reviewed individually",
              "$150 early founding-table pricing",
              "Conditional approval until minimum seats are reached",
              "Private location revealed only to approved guests",
            ].map((b) => (
              <li key={b} className="flex gap-4 border-b border-border pb-3 text-sm">
                <span className="font-serif text-muted-foreground">—</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="border border-border bg-secondary/40 p-7">
            <p className="eyebrow">Founding table</p>
            <div className="mt-3 font-serif text-3xl">${t.price}</div>
            <Link
              to="/apply"
              search={{ table: t.id }}
              className="mt-6 inline-flex h-12 w-full items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to Attend
            </Link>
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              You'll be charged only after approval and once the minimum table is confirmed.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className="mt-2 font-serif text-lg">{v}</div>
    </div>
  );
}
