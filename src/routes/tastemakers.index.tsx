import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TASTEMAKERS } from "@/lib/tastemakers-data";

export const Route = createFileRoute("/tastemakers/")({
  head: () => ({
    meta: [
      { title: "Tastemakers — Colorfull" },
      {
        name: "description",
        content:
          "Curated chefs, cultural hosts, and food creators turning their content into real-world tables.",
      },
      { property: "og:title", content: "Tastemakers — Colorfull" },
      {
        property: "og:description",
        content:
          "From content to community. Curated food creators hosting Colorfull tables and meal plans.",
      },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: TastemakersIndex,
});

const CUISINES = Array.from(
  new Set(TASTEMAKERS.flatMap((t) => t.cuisineFocus)),
).sort();

function TastemakersIndex() {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [hostOnly, setHostOnly] = useState(false);

  const list = useMemo(() => {
    return TASTEMAKERS.filter((t) => t.status !== "inactive" && t.status !== "pending")
      .filter((t) => !cuisine || t.cuisineFocus.includes(cuisine))
      .filter((t) => !hostOnly || t.hostReady);
  }, [cuisine, hostOnly]);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <p className="eyebrow">Tastemakers</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] md:text-6xl text-balance">
            Turn your food content into a table.
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground leading-relaxed md:text-lg">
            <span className="brand-wordmark">Colorfull</span> helps a small, curated group of
            chefs, cultural hosts, and creators bring their food world offline — through tables,
            meal plans, and collaborations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/tastemakers/apply"
              className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply as a tastemaker
            </Link>
            <Link
              to="/discover"
              className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-foreground hover:bg-foreground hover:text-background"
            >
              Browse tables
            </Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCuisine(null)}
              className={`h-8 rounded-full border px-4 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                cuisine === null
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground/70 hover:border-foreground"
              }`}
            >
              All cuisines
            </button>
            {CUISINES.map((c) => (
              <button
                key={c}
                onClick={() => setCuisine(c)}
                className={`h-8 rounded-full border px-4 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                  cuisine === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground/70 hover:border-foreground"
                }`}
              >
                {c}
              </button>
            ))}
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/70">
              <input
                type="checkbox"
                checked={hostOnly}
                onChange={(e) => setHostOnly(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Host-ready only
            </label>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {list.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No tastemakers match these filters yet.
          </p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  to="/tastemakers/$tastemakerId"
                  params={{ tastemakerId: t.id }}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={t.cover}
                      alt={t.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    {t.status === "featured" && (
                      <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-foreground">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={`Portrait of ${t.name}`}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg leading-tight">{t.name}</h3>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {t.neighborhood} · {t.cuisineFocus[0]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 font-serif italic text-sm text-foreground/75 line-clamp-2">
                    "{t.philosophy}"
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
