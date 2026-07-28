import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  listFavorites,
  listMyOrders,
  toggleFavorite,
  LISTING_KIND_LABEL,
  type ChefListing,
  type ChefProfile,
} from "@/lib/chef-kitchen";
import { TASTEMAKERS } from "@/lib/tastemakers-data";
import { CheckoutDialog } from "@/components/chef/CheckoutDialog";
import { toast } from "sonner";

// Resolve a chef's face/name from the static tastemakers dataset by tastemaker slug.
// chef_profiles.tastemaker_id can be a slug (e.g. "moshe-fhima") — try exact match,
// then fuzzy (drop dashes) so minor slug typos still work.
function tastemakerFor(chef: ChefProfile | null) {
  if (!chef?.tastemaker_id) return null;
  const key = chef.tastemaker_id.toLowerCase();
  const stripped = key.replace(/-/g, "");
  return (
    TASTEMAKERS.find((t) => t.id.toLowerCase() === key) ??
    TASTEMAKERS.find((t) => t.id.toLowerCase().replace(/-/g, "") === stripped) ??
    null
  );
}

function chefDisplayName(chef: ChefProfile | null) {
  const bio = chef?.extended_bio?.replace(/\\n/g, "\n") ?? "";
  const firstLine = bio.split("\n")[0]?.trim();
  return firstLine || tastemakerFor(chef)?.name || "Colorfull chef";
}

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Your favorites — Colorfull" },
      {
        name: "description",
        content:
          "Re-order from chefs you love and rebook past meal prep packages in one tap.",
      },
    ],
  }),
});

type FavoriteRow = {
  chef_id: string;
  chef: ChefProfile | null;
  listings: ChefListing[];
};

type PastOrder = {
  id: string;
  listing_id: string;
  quantity: number;
  total_cents: number;
  status: string;
  fulfillment: string;
  created_at: string;
  listing: (ChefListing & { chef?: ChefProfile }) | null;
};

function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutListing, setCheckoutListing] = useState<
    (ChefListing & { chef: ChefProfile }) | null
  >(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [favs, orders] = await Promise.all([
      listFavorites(user.id),
      listMyOrders(user.id),
    ]);

    // Hydrate active listings per favorited chef
    const chefIds = (favs as any[]).map((f) => f.chef_id);
    let listingsByChef: Record<string, ChefListing[]> = {};
    if (chefIds.length) {
      const { data } = await supabase
        .from("chef_listings")
        .select("*")
        .in("chef_id", chefIds)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      for (const l of (data ?? []) as ChefListing[]) {
        (listingsByChef[l.chef_id] ??= []).push(l);
      }
    }
    setFavorites(
      (favs as any[]).map((f) => ({
        chef_id: f.chef_id,
        chef: f.chef as ChefProfile | null,
        listings: listingsByChef[f.chef_id] ?? [],
      })),
    );
    setPastOrders(orders as unknown as PastOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleUnfavorite(chefId: string) {
    if (!user) return;
    await toggleFavorite(user.id, chefId);
    toast.success("Removed from favorites");
    setFavorites((prev) => prev.filter((f) => f.chef_id !== chefId));
  }

  if (loading)
    return (
      <div className="mx-auto max-w-5xl px-6 py-32 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Your kitchen
      </p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl">Favorites & reorders</h1>
      <p className="mt-3 max-w-2xl text-foreground/70">
        Re-book the chefs and meal prep packages you love. One tap to reorder
        — the chef confirms and gets back to you with timing.
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Chefs</h2>
        {favorites.length === 0 ? (
          <EmptyState
            title="No favorite chefs yet"
            body="Tap the heart on any chef profile to save them here."
            cta={{ label: "Browse chefs", to: "/meal-prep" }}
          />
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((f) => {
              const tm = tastemakerFor(f.chef);
              const name = chefDisplayName(f.chef);
              return (
                <div
                  key={f.chef_id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <Link
                    to="/chefs/$chefId"
                    params={{ chefId: f.chef_id }}
                    className="block"
                  >
                    <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                      {tm?.avatar ? (
                        <img
                          src={tm.avatar}
                          alt={`Portrait of ${name}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-muted-foreground">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-serif text-lg leading-tight">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {f.chef?.service_area ?? "Local kitchen"} · {f.listings.length} active
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleUnfavorite(f.chef_id)}
                    aria-label="Remove from favorites"
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background"
                  >
                    <Heart className="h-4 w-4 fill-current text-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-2xl">Meals</h2>
        {pastOrders.length === 0 ? (
          <EmptyState
            title="No past orders"
            body="Once you order from a chef, it'll show up here for a one-tap reorder."
            cta={{ label: "Browse meal prep", to: "/meal-prep" }}
          />
        ) : (
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border">
            {pastOrders.map((o) => {
              const mealProfileParam = o.listing?.slug ?? o.listing_id;
              return (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-serif text-lg truncate">
                    {o.listing?.title ?? "Listing"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.listing?.kind
                      ? LISTING_KIND_LABEL[
                          o.listing.kind as keyof typeof LISTING_KIND_LABEL
                        ]
                      : ""}{" "}
                    · qty {o.quantity} · ${(o.total_cents / 100).toFixed(2)} ·{" "}
                    <span className="capitalize">{o.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {mealProfileParam ? (
                    <Link
                      to="/listings/$slug"
                      params={{ slug: mealProfileParam }}
                      className="inline-flex h-9 items-center rounded-md border border-input px-3 text-[11px] uppercase tracking-[0.22em] hover:bg-accent"
                    >
                      View meal
                    </Link>
                  ) : (
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: o.id }}
                      search={{}}
                      className="inline-flex h-9 items-center rounded-md border border-input px-3 text-[11px] uppercase tracking-[0.22em] hover:bg-accent"
                    >
                      Details
                    </Link>
                  )}
                  {o.listing && o.listing.status === "active" && (
                    <button
                      onClick={() =>
                        setCheckoutListing(
                          o.listing as ChefListing & { chef: ChefProfile },
                        )
                      }
                      disabled={!o.listing.chef_id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/85 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reorder
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {checkoutListing && (
        <CheckoutDialog
          open={!!checkoutListing}
          onOpenChange={(o) => !o && setCheckoutListing(null)}
          listing={checkoutListing}
        />
      )}
    </div>
  );
}

function ListingCard({
  listing,
  chef,
  onReorder,
}: {
  listing: ChefListing;
  chef: ChefProfile;
  onReorder: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {listing.photos?.[0] ? (
        <img
          src={listing.photos[0]}
          alt={listing.title}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs uppercase tracking-widest text-muted-foreground">
          {LISTING_KIND_LABEL[listing.kind]}
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {LISTING_KIND_LABEL[listing.kind]}
          </p>
          <p className="mt-1 font-serif text-lg leading-tight">
            {listing.title}
          </p>
        </div>
        <div className="flex items-center justify-between">
          {listing.price_cents != null && (
            <span className="font-serif text-base">
              ${(listing.price_cents / 100).toFixed(0)}
            </span>
          )}
          <button
            onClick={onReorder}
            disabled={!chef.accepting_orders}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[10px] uppercase tracking-[0.22em] text-background hover:bg-foreground/85 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Reorder
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={cta.to as any}
        className="mt-5 inline-flex h-10 items-center rounded-md bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/85"
      >
        {cta.label}
      </Link>
    </div>
  );
}
