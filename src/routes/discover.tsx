import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { TABLES, ARCHETYPES } from "@/lib/tables-data";
import { TableCard } from "@/components/site/TableCard";
import { ScrollHint } from "@/components/site/ScrollHint";

const sortEnum = z.enum(["soonest", "fewest-seats", "price-low", "price-high"]);
const seatsEnum = z.enum(["All", "any", "few", "open"]);

/** Set of valid ISO YYYY-MM keys present in the tables dataset. */
const VALID_MONTH_KEYS: ReadonlySet<string> = new Set(
  TABLES.map((t) => {
    const dt = new Date(t.startsAt);
    if (isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  }).filter((k): k is string => k !== null),
);

const monthSchema = z
  .string()
  .refine((v) => v === "All" || VALID_MONTH_KEYS.has(v), {
    message: "Invalid month key",
  });

const discoverSearchSchema = z.object({
  archetype: fallback(z.string(), "All").default("All"),
  neighborhood: fallback(z.string(), "All").default("All"),
  seats: fallback(seatsEnum, "All").default("All"),
  month: fallback(monthSchema, "All").default("All"),
  sort: fallback(sortEnum, "soonest").default("soonest"),
});


export const Route = createFileRoute("/discover")({
  validateSearch: zodValidator(discoverSearchSchema),
  head: () => ({
    meta: [
      { title: "Discover Tables — Colorfull" },
      { name: "description", content: "Browse curated communal dinners by archetype, neighborhood, and host." },
    ],
  }),
  component: Discover,
});

type Sort = z.infer<typeof sortEnum>;
type SeatsFilter = z.infer<typeof seatsEnum>;

function tableDate(t: { startsAt: string }): Date | null {
  const dt = new Date(t.startsAt);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Stable ISO month key derived from startsAt, e.g. "2026-06". */
function monthKey(t: { startsAt: string }): string | null {
  const dt = tableDate(t);
  if (!dt) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/** Human label for a "YYYY-MM" key, e.g. "June 2026". Uses the user's locale. */
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleString(navigator.language, {
    month: "long",
    year: "numeric",
  });
}

function Discover() {
  const navigate = useNavigate({ from: "/discover" });
  const { archetype, neighborhood, seats, month, sort } = Route.useSearch();

  const neighborhoods = useMemo(
    () => [
      "All",
      "Arts District",
      "Downtown",
      "Hollywood Hills",
      "Malibu",
      "Mid City",
      "Silver Lake",
      "Venice",
      "West Hollywood",
    ],
    [],
  );

  const { months, monthCounts } = useMemo(() => {
    const keys = new Set<string>();
    const counts = new Map<string, number>();
    counts.set("All", TABLES.length);
    for (const t of TABLES) {
      const k = monthKey(t);
      if (k) {
        keys.add(k);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    // Sort chronologically by ISO YYYY-MM so UI order is stable across locales
    const sorted = Array.from(keys).sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return ay !== by ? ay - by : am - bm;
    });
    return { months: ["All", ...sorted], monthCounts: counts };
  }, []);

  const search = Route.useSearch();
  const updateSearch = (patch: Partial<z.infer<typeof discoverSearchSchema>>) => {
    navigate({ search: { ...search, ...patch } });
  };

  const filtered = useMemo(() => {
    let out = TABLES.slice();
    if (archetype !== "All") out = out.filter((t) => t.archetype === archetype);
    if (neighborhood !== "All") out = out.filter((t) => t.neighborhood === neighborhood);
    if (seats === "any") out = out.filter((t) => t.seatsRemaining > 0);
    if (seats === "few") out = out.filter((t) => t.seatsRemaining > 0 && t.seatsRemaining <= 2);
    if (seats === "open") out = out.filter((t) => t.seatsRemaining >= 3);
    if (month !== "All") {
      out = out.filter((t) => monthKey(t) === month);
    }
    switch (sort) {
      case "fewest-seats":
        out.sort((a, b) => a.seatsRemaining - b.seatsRemaining);
        break;
      case "price-low":
        out.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        out.sort((a, b) => b.price - a.price);
        break;
      default:
        out.sort((a, b) => {
          const da = tableDate(a)?.getTime() ?? Infinity;
          const db = tableDate(b)?.getTime() ?? Infinity;
          return da - db;
        });
        break;
    }
    return out;
  }, [archetype, neighborhood, seats, month, sort]);

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-5 md:py-8">
          <p className="eyebrow">Discover tables</p>
          <h1 className="mt-1.5 max-w-4xl font-serif text-2xl md:text-4xl text-balance leading-tight">
            Curated tables. Private locations. Limited seats.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Browse dinners by archetype. Every seat reviewed. Addresses unlock after approval.
          </p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[60px] z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-6 py-4 space-y-3">
          <div className="-mx-6 overflow-x-auto px-6">
            <div className="flex min-w-max gap-2">
              {(["All", ...ARCHETYPES] as string[]).map((a) => (
                <Link
                  key={a}
                  to="/discover"
                  search={{ ...search, archetype: a }}
                  className={`whitespace-nowrap border px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                    archetype === a
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {a}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Place</span>
            <div className="-mx-6 flex-1 overflow-x-auto px-6">
              <div className="flex min-w-max gap-2">
                {neighborhoods.map((n) => (
                  <Link
                    key={n}
                    to="/discover"
                    search={{ ...search, neighborhood: n }}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition-colors ${
                      neighborhood === n
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {n}
                  </Link>
                ))}
              </div>
            </div>
            <select
              value={sort}
              onChange={(e) => updateSearch({ sort: e.target.value as Sort })}
              className="hidden md:block border border-border bg-background px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground focus:border-foreground focus:outline-none"
            >
              <option value="soonest">Soonest</option>
              <option value="fewest-seats">Fewest seats left</option>
              <option value="price-low">Price · low to high</option>
              <option value="price-high">Price · high to low</option>
            </select>
          </div>

          {/* Seats + date filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Seats</span>
            {([
              ["All", "All"],
              ["any", "Any open"],
              ["few", "1–2 left"],
              ["open", "3+ open"],
            ] as [SeatsFilter, string][]).map(([val, label]) => (
              <Link
                key={val}
                to="/discover"
                search={{ ...search, seats: val }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition-colors ${
                  seats === val
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
            <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">When</span>
            <div className="-mx-6 flex-1 overflow-x-auto px-6">
              <div className="flex min-w-max gap-2">
                {months.map((m) => (
                  <Link
                    key={m}
                    to="/discover"
                    search={{ ...search, month: m }}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition-colors flex items-center gap-1.5 ${
                      month === m
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "All" ? "All" : monthLabel(m)}
                    <span
                      className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-medium leading-none ${
                        month === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {monthCounts.get(m) ?? 0}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between border-b border-border pb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>
            {filtered.length} {filtered.length === 1 ? "table" : "tables"}
            {archetype !== "All" && <> · {archetype}</>}
            {neighborhood !== "All" && <> · {neighborhood}</>}
            {seats !== "All" && <> · seats: {seats}</>}
            {month !== "All" && <> · {monthLabel(month)}</>}
          </span>
          {(archetype !== "All" || neighborhood !== "All" || seats !== "All" || month !== "All") && (
            <button
              onClick={() =>
                navigate({
                  search: {
                    archetype: "All",
                    neighborhood: "All",
                    seats: "All",
                    month: "All",
                    sort,
                  },
                })
              }
              className="underline underline-offset-[6px] hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mx-auto h-px w-16 bg-border" />
            <p className="mt-8 font-serif text-2xl md:text-3xl text-balance leading-tight">
              Nothing matches these filters.
            </p>
            <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
              Great tables are rare. Try loosening your criteria to see what is available.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {seats !== "All" && (
                <button
                  onClick={() => updateSearch({ seats: "All" })}
                  className="group inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <span>Broaden seats</span>
                  <span className="text-[10px] text-border group-hover:text-foreground transition-colors">→</span>
                </button>
              )}
              {month !== "All" && (
                <button
                  onClick={() => updateSearch({ month: "All" })}
                  className="group inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <span>Any month</span>
                  <span className="text-[10px] text-border group-hover:text-foreground transition-colors">→</span>
                </button>
              )}
              {neighborhood !== "All" && (
                <button
                  onClick={() => updateSearch({ neighborhood: "All" })}
                  className="group inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <span>All neighborhoods</span>
                  <span className="text-[10px] text-border group-hover:text-foreground transition-colors">→</span>
                </button>
              )}
              {archetype !== "All" && (
                <button
                  onClick={() => updateSearch({ archetype: "All" })}
                  className="group inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <span>Any archetype</span>
                  <span className="text-[10px] text-border group-hover:text-foreground transition-colors">→</span>
                </button>
              )}
            </div>

            <Link
              to="/apply"
              search={{ intent: "attend" }}
              className="mt-8 inline-flex h-12 items-center justify-center bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
            >
              Apply to Attend
            </Link>
            <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              No tables open? Apply to attend future tables and we'll match you when a seat opens.
            </p>

            <button
              onClick={() =>
                navigate({
                  search: {
                    archetype: "All",
                    neighborhood: "All",
                    seats: "All",
                    month: "All",
                    sort,
                  },
                })
              }
              className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline underline-offset-[6px] hover:text-foreground"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <ul className="-mx-6 mt-8 flex snap-x items-stretch gap-3 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-4">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="snap-start shrink-0 basis-[62%] sm:basis-[40%] md:basis-[28%] lg:basis-[22%] flex"
                >
                  <TableCard table={t} />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <ScrollHint direction="left" />
              <ScrollHint direction="right" />
            </div>
          </>
        )}
      </section>
    </>
  );
}
