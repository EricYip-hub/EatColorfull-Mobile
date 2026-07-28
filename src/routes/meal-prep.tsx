import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  listMealPrepMarketplace,
  type ChefListing,
  type ChefProfile,
} from "@/lib/chef-kitchen";
import { LISTING_CTA } from "@/lib/listing-cta";

export const Route = createFileRoute("/meal-prep")({
  head: () => ({
    meta: [
      { title: "Meal Prep — Colorfull" },
      {
        name: "description",
        content:
          "Discover talented chefs and order weekly meal prep packages. Watch real videos of the food being prepared, then order in seconds.",
      },
      { property: "og:title", content: "Meal Prep — Colorfull" },
      {
        property: "og:description",
        content:
          "Discover talented chefs and order weekly meal prep packages.",
      },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: MealPrepMarketplace,
});

function MealPrepMarketplace() {
  const [items, setItems] = useState<(ChefListing & { chef: ChefProfile })[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMealPrepMarketplace().then((res) => {
      setItems(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Colorfull marketplace
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">
          Meal Prep, from chefs you can actually watch cook.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Browse weekly meal packages from independent chefs. Watch how the
          food is made, packaged, and delivered — then order this week's
          menu in seconds.
        </p>
      </header>

      <div className="mt-12">
        {/* Chefs section */}
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl md:text-3xl">Chefs</h2>
          <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Meet the makers
          </span>
        </div>

        {/* Featured active chef */}
        <Link
          to="/chefs/moshe-fhima"
          className="group mb-14 grid gap-6 overflow-hidden rounded-3xl border border-foreground/10 bg-card p-6 shadow-sm transition-shadow hover:shadow-xl md:grid-cols-[1fr_2fr] md:p-8"
        >
          <div className="overflow-hidden rounded-2xl bg-muted">
            <img
              src="/moshe-fhima.jpg"
              alt="Portrait of Chef Moshe Fhima, Italian and French inspired meal preparation chef, actively booking through Colorfull."
              className="aspect-[4/5] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Active chef · Now booking
            </span>
            <h3 className="mt-2 font-serif text-3xl md:text-4xl">Moshe Fhima</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Italian and French Inspired Meal Preparation
            </p>
            <p className="mt-4 font-serif text-lg italic text-foreground/80">
              “Food is a universal language.”
            </p>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Available for curated meal preparation, private dining, and
              communal dining experiences through Colorfull.
            </p>
            <span className="mt-5 inline-flex w-fit items-center rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.22em] text-background group-hover:opacity-90">
              View Menu and Request Booking →
            </span>
          </div>
        </Link>

        {/* Meal Prep section */}
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl md:text-3xl">Meal Prep</h2>
          <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            This week's menus
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading meal prep packages…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meal prep packages available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <Link
                key={l.id}
                to="/listings/$slug"
                params={{ slug: l.slug }}
                className="group block overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                  {l.photos?.[0] ? (
                    <img
                      src={l.photos[0]}
                      alt={l.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                      Meal Prep
                    </div>
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                    Weekly menu
                  </span>
                </div>
                <div className="space-y-2 p-5">
                  <h3 className="font-serif text-2xl leading-tight">
                    {l.title}
                  </h3>
                  {l.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {l.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    {l.price_cents != null && (
                      <p className="text-sm">
                        From{" "}
                        <span className="font-semibold">
                          ${(l.price_cents / 100).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground"> / week</span>
                      </p>
                    )}
                    <span className="text-[11px] uppercase tracking-[0.22em] text-foreground/80 group-hover:underline">
                      {LISTING_CTA[l.kind].primary} →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
