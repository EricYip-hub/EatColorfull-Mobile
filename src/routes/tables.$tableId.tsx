import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TABLES, type Table } from "@/lib/tables-data";
import { REVIEWS, computeHostScore, type CriterionKey } from "@/lib/reviews-data";
import { listPublicReviews } from "@/lib/reviews.functions";
import { HostBadges } from "@/components/site/HostBadges";
import { RequestToJoinPanel } from "@/components/site/RequestToJoinPanel";

export const Route = createFileRoute("/tables/$tableId")({
  loader: ({ params }) => {
    const table = TABLES.find((t) => t.id === params.tableId);
    if (!table) throw notFound();
    return { table };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const { table } = loaderData;
    const origin = "https://eatcolorfull.com";
    const absoluteImage = /^https?:\/\//i.test(table.image)
      ? table.image
      : `${origin}${table.image.startsWith("/") ? "" : "/"}${table.image}`;
    const url = `${origin}/tables/${table.id}`;
    const title = `${table.title} — Colorfull`;
    return {
      meta: [
        { title },
        { name: "description", content: table.description },
        { property: "og:title", content: title },
        { property: "og:description", content: table.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: absoluteImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: table.description },
        { name: "twitter:image", content: absoluteImage },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TableDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-4xl">This table isn't available.</h1>
      <Link to="/discover" className="mt-6 inline-block text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px]">
        See other tables
      </Link>
    </div>
  ),
});

function TableDetail() {
  const { table } = Route.useLoaderData() as { table: Table };
  const { data: publicRows } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: () => listPublicReviews(),
  });
  const merged = [
    ...REVIEWS.filter((r) => !r.flagged).map((r) => ({
      hostId: r.hostId,
      flagged: r.flagged,
      ratings: r.ratings as Record<CriterionKey, number | null>,
    })),
    ...(publicRows ?? []).map((r) => ({
      hostId: r.hostId,
      flagged: r.flagged,
      ratings: r.ratings,
    })),
  ];
  const hostScore = computeHostScore(table.hostId, merged);
  return (
    <article>
      {/* Hero */}
      <header className="relative">
        <div className="relative h-[40vh] min-h-[260px] max-h-[320px] w-full overflow-hidden md:h-[52vh] md:min-h-[380px] md:max-h-[460px] lg:h-[58vh] lg:min-h-[460px] lg:max-h-[560px]">
          <img
            src={table.image}
            alt={table.title}
            style={table.focalPoint ? { objectPosition: table.focalPoint } : undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
        </div>
        <div className="mx-auto mt-0 max-w-5xl px-6">

          <div className="bg-background p-6 md:p-14">
            <h1 className="font-serif text-4xl md:text-6xl text-balance">{table.title}</h1>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <span>Hosted by {table.hostName}</span>
              <span>{table.neighborhood}</span>
              <span>{table.date} · {table.time}</span>
              <span>{table.seatsRemaining} of {table.seatsTotal} seats remaining</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {table.moodTags.map((m) => (
                <span key={m} className="border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {m}
                </span>
              ))}
            </div>
            {hostScore.badges.length > 0 && (
              <div className="mt-5 border-t border-border pt-5">
                <p className="eyebrow">Host signals</p>
                <HostBadges badges={hostScore.badges} className="mt-3" />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-16 px-6 py-20 md:grid-cols-[1fr_320px]">
        <div className="space-y-14">
          <section>
            <p className="eyebrow">The dinner</p>
            <p className="mt-4 font-serif text-2xl leading-snug text-balance">
              {table.description}
            </p>
          </section>

          <section>
            <p className="eyebrow">What to expect</p>
            <ul className="mt-5 space-y-3">
              {table.expect.map((e) => (
                <li key={e} className="flex gap-4 border-b border-border pb-3 text-sm">
                  <span className="font-serif text-muted-foreground">—</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="eyebrow">Menu preview</p>
            <ul className="mt-5 divide-y divide-border">
              {table.menu.map((m, i) => (
                <li key={m} className="flex items-baseline gap-4 py-3 text-sm">
                  <span className="font-serif text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="eyebrow">Guest vibe</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{table.guestVibe}</p>
            </div>
            <div>
              <p className="eyebrow">A note from the host</p>
              <p className="mt-3 font-serif text-lg italic leading-snug">"{table.hostNote}"</p>
            </div>
          </section>

          <section className="border border-border bg-secondary/30 p-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-border text-foreground" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="10" width="16" height="10" rx="1" />
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" />
                </svg>
              </div>
              <div className="text-sm leading-relaxed">
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Private address</p>
                <p className="mt-2 text-muted-foreground">
                  The exact address in <span className="text-foreground">{table.neighborhood}</span> is revealed
                  only after your application is approved and your seat is confirmed. Every guest is reviewed
                  to protect the host, the home, and the table.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside id="request-to-join" className="scroll-mt-24 md:sticky md:top-24 md:self-start">
          <RequestToJoinPanel table={table} />
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden sticky bottom-24 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-xl">${table.price}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {table.seatsRemaining} of {table.seatsTotal} seats
            </span>
          </div>
          <a
            href="#request-to-join"
            className="inline-flex h-11 flex-1 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background"
          >
            {table.seatsRemaining === 0 ? "Join the waitlist" : "Request to join"}
          </a>
        </div>
      </div>
    </article>
  );
}
