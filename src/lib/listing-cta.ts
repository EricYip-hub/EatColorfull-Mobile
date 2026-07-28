import type { ChefListingKind } from "@/lib/chef-kitchen";

/** Centralized call-to-action copy for each listing kind. */
export const LISTING_CTA: Record<
  ChefListingKind,
  { primary: string; share: string; verb: string }
> = {
  meal_prep: {
    primary: "Shop This Meal Plan",
    share: "Order on Colorfull",
    verb: "Order",
  },
  hosted_table: {
    primary: "Request a Seat",
    share: "Request a Seat",
    verb: "Request",
  },
  private_dining: {
    primary: "Apply to Host",
    share: "Apply to Host",
    verb: "Apply",
  },
  product: {
    primary: "Order This Dish",
    share: "Order on Colorfull",
    verb: "Order",
  },
  merch: {
    primary: "Shop on Colorfull",
    share: "Shop on Colorfull",
    verb: "Shop",
  },
};

/**
 * Resolve the share-card CTA based on listing kind + details.
 * Founding-salon / salon-style hosted tables use "Apply to Attend"
 * to match the founding-salon flow copy.
 */
export function resolveShareCta(
  kind: ChefListingKind,
  details?: { archetype?: string | null; table_archetype?: string | null } | null,
): string {
  if (kind === "hosted_table") {
    const arche = (
      details?.archetype ??
      details?.table_archetype ??
      ""
    ).toLowerCase();
    if (arche.includes("salon") || arche.includes("founding")) {
      return "Apply to Attend";
    }
    return "Request a Seat";
  }
  if (kind === "private_dining") return "Apply to Host";
  return LISTING_CTA[kind].share;
}
