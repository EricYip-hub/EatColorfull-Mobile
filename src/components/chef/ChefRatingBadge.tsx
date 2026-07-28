import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getChefRatingSummary } from "@/lib/chef-ratings.functions";

export function ChefRatingBadge({ chefId }: { chefId: string }) {
  const { data } = useQuery({
    queryKey: ["chef-rating-summary", chefId],
    queryFn: () => getChefRatingSummary({ data: { chefId } }),
  });

  if (!data || data.count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <Star className="h-3.5 w-3.5" />
        No ratings yet
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <Star className="h-4 w-4 fill-current text-amber-500" />
      <span className="font-medium">{data.average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({data.count} {data.count === 1 ? "rating" : "ratings"})
      </span>
    </span>
  );
}
