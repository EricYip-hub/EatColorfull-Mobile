import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Colorfull" },
      { name: "description", content: "How Colorfull curates communal dining experiences for guests and hosts." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const steps = [
    { n: "01", t: "Discover a table", b: "Browse upcoming dinners by archetype, neighborhood, and host. Each table is hand-curated." },
    { n: "02", t: "Apply to attend", b: "Tell us about yourself in three short questions. Applications stay warm and human." },
    { n: "03", t: "Get reviewed by the host", b: "Hosts review each guest to preserve the quality of the table. Most decisions arrive within 48 hours." },
    { n: "04", t: "Confirm your seat", b: "If approved, you receive payment instructions and the private address." },
    { n: "05", t: "Sit at the table", b: "Arrive a stranger. Share one menu, one room, one evening." },
  ];
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="eyebrow">How it works</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl md:text-6xl text-balance">
            A small, considered process for one shared table.
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground">
            <span className="brand-wordmark">Colorfull</span> is not a reservation app. It's an invitation. Here's how an evening
            comes together, from the first application to the last toast.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <ol className="space-y-12">
          {steps.map((s) => (
            <li key={s.n} className="grid grid-cols-[80px_1fr] gap-6 border-b border-border pb-12 last:border-0">
              <div className="font-serif text-4xl text-primary">{s.n}</div>
              <div>
                <h3 className="font-serif text-2xl">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="eyebrow">Frequently asked</p>
          <h2 className="mt-3 font-serif text-4xl">A few quiet answers.</h2>
          <dl className="mt-12 divide-y divide-border">
            {[
              ["Why do guests get reviewed?", "To preserve the quality of the table. Hosts open their homes; we honor that with a curated guest list."],
              ["When do I get the address?", "Once you're approved and your seat is confirmed, the exact private address is shared with you and the other approved guests."],
              ["What if I'm declined?", "You'll be invited to the waitlist for future tables that fit you better. Nothing is final."],
              ["Are hosts vetted?", "Yes. Every host is interviewed and approved. Hosts are responsible for complying with applicable local food, health, permitting, and safety requirements."],
            ].map(([q, a]) => (
              <div key={q} className="grid gap-4 py-6 md:grid-cols-[280px_1fr]">
                <dt className="font-serif text-xl">{q}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/discover" className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background">
              See upcoming tables
            </Link>
            <Link to="/host" className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.24em]">
              Apply to host
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
