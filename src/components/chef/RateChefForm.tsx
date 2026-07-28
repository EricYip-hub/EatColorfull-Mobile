import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { submitChefRating, getMyRatingForOrder } from "@/lib/chef-ratings.functions";

type Props = {
  orderId: string;
  orderStatus: string;
};

export function RateChefForm({ orderId, orderStatus }: Props) {
  const submit = useServerFn(submitChefRating);
  const fetchMine = useServerFn(getMyRatingForOrder);

  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<{ stars: number; comment: string } | null>(null);

  useEffect(() => {
    if (orderStatus !== "fulfilled") return;
    fetchMine({ data: { orderId } })
      .then((row) => {
        if (row) {
          setExisting(row);
          setStars(row.stars);
          setComment(row.comment ?? "");
        }
      })
      .catch(() => {});
  }, [orderId, orderStatus, fetchMine]);

  if (orderStatus !== "fulfilled") {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Rate this chef
        </p>
        <p className="mt-2 text-sm text-foreground/70">
          You'll be able to leave a star rating once the chef marks your order as fulfilled.
        </p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars < 1) {
      toast.error("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: { orderId, stars, comment: comment.trim() } });
      toast.success(existing ? "Rating updated. Thanks!" : "Thanks for rating your chef!");
      setExisting({ stars, comment: comment.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-border p-6">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {existing ? "Your rating" : "Rate this chef"}
      </p>
      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || stars) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-1"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  active ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder="Optional: a quick note about your experience"
        rows={3}
        className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{comment.length}/500</span>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-[12px] uppercase tracking-[0.22em] text-background hover:bg-foreground/85 disabled:opacity-50"
        >
          {submitting ? "Saving…" : existing ? "Update rating" : "Submit rating"}
        </button>
      </div>
    </form>
  );
}
