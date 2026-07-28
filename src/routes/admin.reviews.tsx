import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HOSTS, TABLES } from "@/lib/tables-data";
import {
  BADGES,
  CRITERIA,
  REVIEWS,
  computeHostScore,
  type BadgeKey,
  type CriterionKey,
} from "@/lib/reviews-data";
import {
  listAdminReviews,
  listPublicReviews,
  markReviewReviewed,
} from "@/lib/reviews.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews & Table Scores — Colorfull Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReviews,
});

type AdminReviewRow = {
  id: string;
  table_id: string;
  host_id: string | null;
  created_at: string;
  food: number | null;
  ambience: number | null;
  host_energy: number | null;
  cleanliness: number | null;
  flow: number | null;
  would_return: number | null;
  public_note: string | null;
  private_note: string | null;
  flagged: boolean;
  admin_reviewed: boolean;
};

function rowRatings(r: AdminReviewRow): Record<CriterionKey, number | null> {
  return {
    food: r.food,
    ambience: r.ambience,
    hostEnergy: r.host_energy,
    cleanliness: r.cleanliness,
    flow: r.flow,
    wouldReturn: r.would_return,
  };
}

function AdminReviews() {
  const qc = useQueryClient();
  const { data: adminRows } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => listAdminReviews() as Promise<AdminReviewRow[]>,
  });
  const { data: publicRows } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: () => listPublicReviews(),
  });

  const [optimisticReviewed, setOptimisticReviewed] = useState<Record<string, boolean>>({});

  const hostScores = useMemo(() => {
    const external = (publicRows ?? []).map((r) => ({
      hostId: r.hostId,
      flagged: r.flagged,
      ratings: r.ratings,
    }));
    // Merge mock + real so the leaderboard isn't empty before any DB reviews exist.
    const mockExternal = REVIEWS.filter((r) => !r.flagged).map((r) => ({
      hostId: r.hostId,
      flagged: r.flagged,
      ratings: r.ratings as Record<CriterionKey, number | null>,
    }));
    const merged = [...mockExternal, ...external];
    return HOSTS.map((h) => ({ host: h, score: computeHostScore(h.id, merged) }));
  }, [publicRows]);

  const flaggedRows = (adminRows ?? []).filter((r) => r.flagged || r.private_note);

  const flagged = flaggedRows.map((r) => {
    const table = TABLES.find((t) => t.id === r.table_id);
    return {
      id: r.id,
      tableId: r.table_id,
      tableTitle: table?.title ?? r.table_id,
      hostId: r.host_id ?? "—",
      attendedOn: r.created_at.slice(0, 10),
      guestName: "Guest",
      privateNote: r.private_note ?? "",
      flagged: r.flagged,
      ratings: rowRatings(r),
      reviewed: optimisticReviewed[r.id] ?? r.admin_reviewed,
    };
  });

  const onMark = async (id: string, next: boolean) => {
    setOptimisticReviewed((s) => ({ ...s, [id]: next }));
    try {
      await markReviewReviewed({ data: { id, reviewed: next } });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err) {
      setOptimisticReviewed((s) => ({ ...s, [id]: !next }));
      toast.error(err instanceof Error ? err.message : "Could not update.");
    }
  };


  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="border-b border-border pb-6">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">Reviews & Table Scores</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Internal quality view. Sensitive guest feedback stays here and is never shown to hosts
          or on public profiles.
        </p>
      </div>

      {/* Sensitive queue */}
      <div className="mt-12">
        <h2 className="eyebrow">Private feedback queue</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {flagged.length} item{flagged.length === 1 ? "" : "s"} to review.
        </p>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {flagged.map((r) => {
            const isReviewed = r.reviewed;
            return (
              <li key={r.id} className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-serif text-lg">{r.tableTitle}</p>
                    {r.flagged && (
                      <span className="border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-destructive">
                        Flagged for follow-up
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {r.guestName} · {r.attendedOn} · host {r.hostId}
                  </p>
                  {r.privateNote && (
                    <p className="mt-3 text-sm leading-relaxed">"{r.privateNote}"</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {CRITERIA.map((c) => (
                      <span key={c.key}>{c.label.replace("The ", "")}: {r.ratings[c.key] ?? "—"}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 md:flex-col md:items-end">
                  <button
                    onClick={() => onMark(r.id, !isReviewed)}
                    className={`inline-flex h-9 items-center px-4 text-[11px] uppercase tracking-[0.22em] ${
                      isReviewed
                        ? "border border-border text-muted-foreground"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                  >
                    {isReviewed ? "Marked reviewed" : "Mark reviewed"}
                  </button>
                  <button className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]">
                    Contact guest
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Table scores leaderboard */}
      <div className="mt-16">
        <h2 className="eyebrow">Host Table Scores</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Internal score (0–100) — blend of ratings, repeat guests, reliability, and responsiveness.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-y border-border text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <th className="py-3 text-left font-normal">Host</th>
                <th className="py-3 text-left font-normal">Tier</th>
                <th className="py-3 text-left font-normal">Score</th>
                <th className="py-3 text-left font-normal">Reviews</th>
                <th className="py-3 text-left font-normal">Badges</th>
              </tr>
            </thead>
            <tbody>
              {hostScores
                .sort((a, b) => b.score.tableScore - a.score.tableScore)
                .map(({ host, score }) => (
                  <tr key={host.id} className="border-b border-border align-top">
                    <td className="py-4">
                      <p className="font-serif text-base">{host.name}</p>
                      <p className="text-xs text-muted-foreground">{host.neighborhood}</p>
                    </td>
                    <td className="py-4 text-[11px] uppercase tracking-[0.22em]">{score.tier}</td>
                    <td className="py-4 font-serif text-xl">{score.tableScore}</td>
                    <td className="py-4 text-xs text-muted-foreground">{score.reviewCount}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {score.badges.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {score.badges.map((b) => (
                          <span
                            key={b}
                            className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                          >
                            {BADGES[b as BadgeKey].label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border border-border bg-secondary/30 p-6">
            <p className="eyebrow">How the score is built</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>· 70% — average across the six guest dimensions</li>
              <li>· 15% — repeat guest rate</li>
              <li>· 10% — reliability (no cancellations)</li>
              <li>· 5% — host response time</li>
            </ul>
          </div>
          <div className="border border-border bg-secondary/30 p-6">
            <p className="eyebrow">What the tiers unlock</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>· Rising — up to 6 seats, standard placement</li>
              <li>· Trusted — up to 8 seats, verified badge eligible</li>
              <li>· Signature — up to 10 seats, priority placement</li>
              <li>· Founding — up to 12 seats, homepage feature rotation</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
