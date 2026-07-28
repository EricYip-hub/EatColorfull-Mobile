import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  TASTEMAKERS,
  TASTEMAKER_STATUS_LABEL,
  type TastemakerStatus,
} from "@/lib/tastemakers-data";

export const Route = createFileRoute("/admin/tastemakers")({
  head: () => ({
    meta: [
      { title: "Tastemaker Management — Colorfull Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTastemakers,
});

const FILTERS: Array<TastemakerStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "featured",
  "host-ready",
  "collaboration-only",
  "inactive",
];

function AdminTastemakers() {
  const [filter, setFilter] = useState<TastemakerStatus | "all">("all");
  const [overrides, setOverrides] = useState<Record<string, TastemakerStatus>>({});
  const [featuredOverrides, setFeaturedOverrides] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    return TASTEMAKERS.map((t) => ({
      ...t,
      status: overrides[t.id] ?? t.status,
      featured: featuredOverrides[t.id] ?? t.featured,
    })).filter((t) => (filter === "all" ? true : t.status === filter));
  }, [filter, overrides, featuredOverrides]);

  const setStatus = (id: string, status: TastemakerStatus) =>
    setOverrides((o) => ({ ...o, [id]: status }));

  const toggleFeatured = (id: string, current: boolean) =>
    setFeaturedOverrides((o) => ({ ...o, [id]: !current }));

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Tastemaker Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review applications, approve creators, and curate the homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 rounded-full border px-4 text-[11px] uppercase tracking-[0.2em] ${
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground/70 hover:border-foreground"
              }`}
            >
              {f === "all" ? "All" : TASTEMAKER_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border">
        {items.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">
            No tastemakers in this status.
          </li>
        )}
        {items.map((t) => (
          <li key={t.id} className="grid gap-4 py-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex items-center gap-4">
              <img src={t.avatar} alt={`Portrait of ${t.name}`} className="h-14 w-14 rounded-full object-cover" />
              <div>
                <Link
                  to="/tastemakers/$tastemakerId"
                  params={{ tastemakerId: t.id }}
                  className="font-serif text-lg hover:underline"
                >
                  {t.name}
                </Link>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t.neighborhood} · {t.cuisineFocus.join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Applied {new Date(t.appliedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="text-sm text-foreground/80">
              <p className="line-clamp-2">{t.shortBio}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                <span className="rounded-full border border-border px-2 py-0.5">
                  {TASTEMAKER_STATUS_LABEL[t.status]}
                </span>
                {t.featured && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-background">
                    Featured
                  </span>
                )}
                {t.hostReady && (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    Host-ready
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {t.status === "pending" && (
                <>
                  <button
                    onClick={() => setStatus(t.id, "approved")}
                    className="h-9 bg-foreground px-4 text-[11px] uppercase tracking-[0.2em] text-background hover:bg-foreground/90"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(t.id, "inactive")}
                    className="h-9 border border-border px-4 text-[11px] uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    Reject
                  </button>
                </>
              )}
              {t.status !== "pending" && (
                <>
                  <select
                    value={t.status}
                    onChange={(e) => setStatus(t.id, e.target.value as TastemakerStatus)}
                    className="h-9 rounded border border-border bg-background px-2 text-xs"
                  >
                    {(
                      ["approved", "featured", "host-ready", "collaboration-only", "inactive"] as TastemakerStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {TASTEMAKER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleFeatured(t.id, t.featured)}
                    className={`h-9 px-4 text-[11px] uppercase tracking-[0.2em] ${
                      t.featured
                        ? "border border-foreground bg-foreground text-background"
                        : "border border-border hover:border-foreground"
                    }`}
                  >
                    {t.featured ? "Unfeature" : "Feature"}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Prototype · changes are not persisted yet
      </p>
    </section>
  );
}
