import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HOSTS, TABLES } from "@/lib/tables-data";
import { REVIEWS, computeHostScore, type CriterionKey } from "@/lib/reviews-data";
import { listPublicReviews } from "@/lib/reviews.functions";
import { HostBadges } from "@/components/site/HostBadges";
import hostPortrait from "@/assets/host-portrait.jpg";

export const Route = createFileRoute("/hosts")({
  head: () => ({
    meta: [
      { title: "Meet the Hosts — Colorfull" },
      { name: "description", content: "The chefs, creatives, and culture-keepers setting the tables." },
      { property: "og:title", content: "Meet the Hosts — Colorfull" },
      { property: "og:description", content: "Every Colorfull table is hosted by someone we know." },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: HostsPage,
});

function HostsPage() {
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
  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Meet the hosts</p>
        <h1 className="mt-4 font-serif text-5xl md:text-6xl">The people setting the table.</h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          Every <span className="brand-wordmark">Colorfull</span> table is hosted by someone we know personally. Chefs, artists,
          wellness leaders, culture-keepers. Each one vetted. Each one curating their own room.
        </p>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        {HOSTS.map((h) => {
          const table = TABLES.find((t) => t.hostId === h.id);
          const score = computeHostScore(h.id, merged);
          return (
            <article key={h.id} className="group flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={h.portrait ?? table?.image ?? hostPortrait}
                  alt={h.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                {score.tier !== "Rising" && (
                  <span className="absolute left-3 top-3 border border-background/40 bg-background/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] backdrop-blur">
                    {score.tier} Host
                  </span>
                )}
              </div>
              <div className="mt-5">
                <p className="eyebrow">{h.archetype}</p>
                <h2 className="mt-2 font-serif text-2xl">{h.name}</h2>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {h.neighborhood}
                </p>
                <HostBadges badges={score.badges} size="sm" className="mt-3" />
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {h.bio}
                </p>
                <p className="mt-4 font-serif italic text-foreground/80">"{h.philosophy}"</p>
                {table && (
                  <Link
                    to="/tables/$tableId"
                    params={{ tableId: table.id }}
                    className="mt-5 inline-block text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px]"
                  >
                    See their next table
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
