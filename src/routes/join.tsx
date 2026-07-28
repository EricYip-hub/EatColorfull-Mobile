import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-table.jpg";
import hostImg from "@/assets/host-portrait.jpg";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Colorfull — Apply to Attend or Host" },
      {
        name: "description",
        content:
          "Two ways into Colorfull: apply for a seat at a curated communal dinner, or apply to host a table of your own.",
      },
      { property: "og:title", content: "Join Colorfull — Apply to Attend or Host" },
      {
        property: "og:description",
        content:
          "Apply for a seat at a curated communal dinner, or apply to host a table of your own.",
      },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Join the table</p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] md:text-6xl text-balance">
          Two ways in.
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed md:text-lg">
          Come as a guest at a curated communal dinner, or set the table yourself as a{" "}
          <span className="brand-wordmark">Colorfull</span> host.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
        {/* Apply to Attend */}
        <article className="group flex flex-col border border-border bg-background">
          <Link to="/apply" search={{ intent: "attend" }} className="relative block aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={heroImg}
              alt="A candlelit communal dinner"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </Link>
          <div className="flex flex-1 flex-col p-7">
            <p className="eyebrow">For guests</p>
            <h2 className="mt-3 font-serif text-2xl md:text-3xl">Apply to attend.</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Tell us a little about yourself and the kind of table that calls you. Hosts review
              each guest. Approval unlocks payment and the private address.
            </p>
            <Link
              to="/apply"
              search={{ intent: "attend" }}
              className="mt-6 inline-flex h-12 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to attend
            </Link>
            <Link
              to="/discover"
              className="mt-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
            >
              Browse tables first
            </Link>
          </div>
        </article>

        {/* Apply to Host */}
        <article className="group flex flex-col border border-border bg-secondary/40">
          <Link to="/apply" search={{ intent: "host" }} className="relative block aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={hostImg}
              alt="A Colorfull host"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </Link>
          <div className="flex flex-1 flex-col p-7">
            <p className="eyebrow">For hosts</p>
            <h2 className="mt-3 font-serif text-2xl md:text-3xl">Apply to host.</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Chefs, storytellers, home cooks, and cultural creators welcome. We're a small,
              curated community of hosts who treat hospitality as a craft.
            </p>
            <Link
              to="/apply"
              search={{ intent: "host" }}
              className="mt-6 inline-flex h-12 items-center justify-center border border-foreground bg-background px-6 text-[11px] uppercase tracking-[0.24em] text-foreground hover:bg-foreground hover:text-background"
            >
              Apply to host
            </Link>
            <Link
              to="/how-it-works"
              className="mt-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
            >
              How hosting works
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
