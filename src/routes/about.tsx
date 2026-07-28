import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Colorfull" },
      { name: "description", content: "Colorfull is a curated communal dining and hospitality platform." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="eyebrow">About</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl md:text-6xl text-balance">
            One shared table. A small cultural world.
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-6 py-20 text-lg leading-relaxed text-muted-foreground">
        <p>
          California just unlocked communal dining. <span className="brand-wordmark">Colorfull</span> curates the tables.
        </p>
        <p>
          We exist for the kind of evening that doesn't fit into a reservation app: a long
          table in a private home, eight to twelve guests, a host who has been thinking about
          this menu for weeks, and a conversation that lasts longer than the dessert.
        </p>
        <p>
          Our hosts are chefs, storytellers, cultural creators, home cooks, artists, wellness
          guides, and community builders. Our guests are reviewed to preserve the quality of
          the table.
        </p>
        <p>
          <span className="brand-wordmark">Colorfull</span> is built on three quiet promises: tables are curated, locations are private,
          and seats are limited. Where strangers become guests, and guests become community.
        </p>
        <div className="flex flex-wrap gap-4 pt-4">
          <Link to="/discover" className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background">
            Discover tables
          </Link>
          <Link to="/host" className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.24em]">
            Apply to host
          </Link>
        </div>
      </section>
    </>
  );
}
