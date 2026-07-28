import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TABLES } from "@/lib/tables-data";
import { CRITERIA, type CriterionKey } from "@/lib/reviews-data";
import { submitReview, hasReviewedTable } from "@/lib/reviews.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/review/$tableId")({
  head: () => ({
    meta: [{ title: `Share your night — Colorfull` }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ params }) => {
    const table = TABLES.find((t) => t.id === params.tableId);
    if (!table) throw notFound();
    return { table };
  },
  component: ReviewPage,
});

function ReviewPage() {
  const { table } = Route.useLoaderData() as { table: (typeof TABLES)[number] };
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    food: 0, ambience: 0, hostEnergy: 0, cleanliness: 0, flow: 0, wouldReturn: 0,
  });
  const [publicNote, setPublicNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: existing, isLoading: checking } = useQuery({
    queryKey: ["has-reviewed", table.id],
    queryFn: () => hasReviewedTable({ data: { tableId: table.id } }),
    staleTime: 30_000,
  });

  const complete = Object.values(ratings).every((n) => n > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    try {
      await submitReview({
        data: {
          tableId: table.id,
          hostId: table.hostId,
          ratings,
          publicNote,
          privateNote,
          flagged,
        },
      });
      setSubmitted(true);
      toast.success("Thank you. Your reflection helps us protect the table.");
      setTimeout(() => navigate({ to: "/dashboard" }), 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your reflection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted || existing?.reviewed) {
    const dateLine = existing?.submittedAt
      ? new Date(existing.submittedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
      : null;
    return (
      <section className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="eyebrow">{submitted ? "Received" : "Already shared"}</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          {submitted ? "Thank you for sitting with us." : "You've already reflected on this table."}
        </h1>
        <p className="mt-5 text-muted-foreground">
          {submitted
            ? "Your reflection stays private to Colorfull. Public notes — if you left one — appear softly on the host's profile after light editing for tone."
            : `We received your reflection${dateLine ? ` on ${dateLine}` : ""}. Each guest may share one reflection per table so every voice carries equal weight.`}
        </p>
        {!submitted && (
          <div className="mt-8">
            <Link to="/dashboard" className="text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px]">
              Back to dashboard
            </Link>
          </div>
        )}
      </section>
    );
  }

  if (checking) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-32 text-center text-sm text-muted-foreground">
        Loading…
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <p className="eyebrow">Post-dinner reflection</p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl text-balance">How was the night?</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        You attended <span className="text-foreground">{table.title}</span> with {table.hostName} on{" "}
        {table.date}. This isn't a public rating. It's a private letter to Colorfull that helps us
        protect the quality of every room.
      </p>

      <form onSubmit={submit} className="mt-12 space-y-10">
        {CRITERIA.map((c) => (
          <div key={c.key} className="border-b border-border pb-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-serif text-xl">{c.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.helper}</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {ratings[c.key] || "—"}/5
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = ratings[c.key] >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${c.label}: ${n} of 5`}
                    onClick={() => setRatings((r) => ({ ...r, [c.key]: n }))}
                    className={`h-11 flex-1 border text-[11px] uppercase tracking-[0.2em] transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <label htmlFor="public" className="font-serif text-xl">A line we may share</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. If kind and specific, we may quote you (with first name) on the host's profile.
          </p>
          <textarea
            id="public"
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            maxLength={240}
            rows={3}
            placeholder="The lamb. The light. The strangers who became something."
            className="mt-3 w-full border border-border bg-transparent p-3 text-sm focus:border-foreground focus:outline-none"
          />
        </div>

        <div className="border border-border bg-secondary/30 p-5">
          <label htmlFor="private" className="font-serif text-xl">For Colorfull only</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Private. Never shared with the host or shown publicly. Tell us anything that would help
            us protect the next guest at this table.
          </p>
          <textarea
            id="private"
            value={privateNote}
            onChange={(e) => setPrivateNote(e.target.value)}
            maxLength={1200}
            rows={4}
            placeholder="Anything you'd like us to know — safety, sensitivity, a concern, something we should follow up on."
            className="mt-3 w-full border border-border bg-background p-3 text-sm focus:border-foreground focus:outline-none"
          />
          <label className="mt-3 flex items-start gap-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={flagged}
              onChange={(e) => setFlagged(e.target.checked)}
              className="mt-0.5"
            />
            <span>Flag this for a Colorfull team member to follow up with me directly.</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/dashboard" className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]">
            Not now
          </Link>
          <button
            type="submit"
            disabled={!complete || submitting}
            className="inline-flex h-12 items-center justify-center bg-foreground px-8 text-[11px] uppercase tracking-[0.24em] text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send reflection"}
          </button>
        </div>
      </form>
    </section>
  );
}
