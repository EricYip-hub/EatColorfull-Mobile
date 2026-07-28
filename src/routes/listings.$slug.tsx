import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import {
  getListingBySlug,
  trackLinkClick,
  LISTING_KIND_LABEL,
  youtubeEmbedUrl,
  type ChefListing,
  type ChefProfile,
} from "@/lib/chef-kitchen";
import { LISTING_CTA } from "@/lib/listing-cta";
import { CheckoutDialog } from "@/components/chef/CheckoutDialog";
import { ShareDialog } from "@/components/chef/ShareDialog";
import { ListingPhotoCarousel } from "@/components/chef/ListingPhotoCarousel";

export const Route = createFileRoute("/listings/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Listing — Colorfull" },
      { name: "description", content: "Reserve directly with the chef on Colorfull — meal prep, hosted tables, private dining, and more." },
      { property: "og:title", content: "Listing — Colorfull" },
      { property: "og:description", content: "Reserve directly with the chef on Colorfull." },
      { property: "og:url", content: `https://eatcolorfull.com/listings/${params.slug}` },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: ListingLanding,
});

function ListingLanding() {
  const { slug } = Route.useParams();
  const [item, setItem] = useState<(ChefListing & { chef: ChefProfile }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    getListingBySlug(slug).then((r) => {
      setItem(r);
      setLoading(false);
      if (r) {
        const params = new URLSearchParams(window.location.search);
        trackLinkClick(
          r.id,
          params.get("utm_source") ?? undefined,
          document.referrer,
        ).catch(() => {});
      }
    });
  }, [slug]);

  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  if (!item)
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="font-serif text-3xl">Listing not found</p>
        <Link to="/meal-prep" className="mt-4 inline-block underline">
          Browse meal prep
        </Link>
      </div>
    );

  const yt = item.video_url ? youtubeEmbedUrl(item.video_url) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        {LISTING_KIND_LABEL[item.kind]} · on Colorfull
      </p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl">{item.title}</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="group overflow-hidden rounded-2xl bg-muted">
          {yt ? (
            <iframe
              src={yt}
              title={item.title}
              className="aspect-video w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <ListingPhotoCarousel
              photos={item.photos ?? []}
              alt={item.title}
              aspectClassName="aspect-[4/5]"
              fallback={
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                  No image
                </div>
              }
            />
          )}
        </div>
        <div className="space-y-5">
          {item.description && (
            <p className="text-base text-foreground/80 whitespace-pre-wrap">
              {item.description}
            </p>
          )}
          {item.price_cents != null && (
            <p className="font-serif text-3xl">
              ${(item.price_cents / 100).toFixed(0)}
              <span className="ml-1 text-sm text-muted-foreground">
                {item.kind === "meal_prep" ? "/ week" : ""}
              </span>
            </p>
          )}
          {item.inventory_remaining != null && (
            <p className="text-sm text-muted-foreground">
              {item.inventory_remaining} remaining this week
            </p>
          )}
          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={!item.chef.accepting_orders}
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-foreground px-6 text-[12px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!item.chef.accepting_orders
              ? "Not accepting orders"
              : LISTING_CTA[item.kind].primary}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-foreground/20 px-6 text-[11px] uppercase tracking-[0.22em] transition-colors hover:bg-foreground hover:text-background"
          >
            <Share2 className="h-4 w-4" /> Share to Social
          </button>
          <p className="text-xs text-muted-foreground">
            Pay now to reserve. All food is purchased and curated with the
            intention you will show up — no refunds.
          </p>
          <Link
            to="/chefs/$chefId"
            params={{ chefId: item.chef.id }}
            className="block text-[11px] uppercase tracking-[0.22em] underline underline-offset-4"
          >
            View chef profile →
          </Link>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        listing={item}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        listing={item}
        chefId={item.chef.id}
        chefName={item.chef.extended_bio?.split("\n")[0] ?? "Colorfull chef"}
      />
    </div>
  );
}
