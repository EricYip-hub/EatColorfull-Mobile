import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Youtube, Heart, MapPin, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getChefProfileById,
  listActiveListingsForChef,
  listKitchenVideos,
  trackProfileView,
  toggleFavorite,
  LISTING_KIND_LABEL,
  type ChefProfile,
  type ChefListing,
  type ChefListingKind,
  type ChefVideoPlatform,
  type KitchenVideo,
} from "@/lib/chef-kitchen";
import { LISTING_CTA } from "@/lib/listing-cta";
import { WatchMyKitchen } from "@/components/chef/WatchMyKitchen";
import { ListingPhotoCarousel } from "@/components/chef/ListingPhotoCarousel";
import { ChefRatingBadge } from "@/components/chef/ChefRatingBadge";
import { useAuth } from "@/lib/auth-context";
import { getTastemaker } from "@/lib/tastemakers-data";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.6 6.3a5.7 5.7 0 0 1-3.4-1.1V15a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.5V3h2.7a5.7 5.7 0 0 0 3.4 3.3z" />
    </svg>
  );
}

export const Route = createFileRoute("/chefs/$chefId")({
  head: () => ({
    meta: [
      { title: "Chef Storefront — Colorfull" },
      { name: "description", content: "Watch this chef's kitchen, browse meal prep, hosted tables, private dining, and shop their menu on Colorfull." },
      { property: "og:title", content: "Chef Storefront — Colorfull" },
      { property: "og:description", content: "Watch the kitchen, browse meal prep, hosted tables, private dining, and shop the menu." },
      { property: "og:image", content: "https://eatcolorfull.com/og-image.jpg" },
      { name: "twitter:image", content: "https://eatcolorfull.com/og-image.jpg" },
    ],
  }),
  component: ChefStorefront,
});


const TABS: { key: "kitchen" | ChefListingKind | "about"; label: string }[] = [
  { key: "kitchen", label: "Watch My Kitchen" },
  { key: "meal_prep", label: "Tastemaker Plans" },
  { key: "hosted_table", label: "Hosted Tables" },
  { key: "private_dining", label: "Private Dining" },
  { key: "product", label: "Shop" },
  { key: "about", label: "About" },
];

function ChefStorefront() {
  const { chefId } = Route.useParams();
  const { user } = useAuth();
  const [chef, setChef] = useState<ChefProfile | null>(null);
  const [listings, setListings] = useState<ChefListing[]>([]);
  const [videos, setVideos] = useState<KitchenVideo[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("kitchen");
  const [fav, setFav] = useState(false);

  useEffect(() => {
    getChefProfileById(chefId).then(setChef);
    listActiveListingsForChef(chefId).then(setListings);
    listKitchenVideos(chefId, true).then(setVideos);
    trackProfileView(chefId, user?.id).catch(() => {});
    if (user?.id) {
      import("@/integrations/supabase/client").then(({ supabase }) =>
        supabase
          .from("chef_favorites")
          .select("chef_id")
          .eq("user_id", user.id)
          .eq("chef_id", chefId)
          .maybeSingle()
          .then(({ data }) => setFav(!!data)),
      );
    }
  }, [chefId, user?.id]);

  if (!chef) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center text-sm text-muted-foreground">
        Loading chef…
      </div>
    );
  }

  const listingsById: Record<string, ChefListing> = Object.fromEntries(
    listings.map((l) => [l.id, l]),
  );
  const byKind = (k: ChefListingKind) => listings.filter((l) => l.kind === k);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-foreground/10 pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Chef storefront
          </p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">
            {getTastemaker(chef.tastemaker_id)?.name
              ?? chef.extended_bio?.replace(/\\n/g, "\n").split("\n")[0]
              ?? "A Colorfull chef"}
          </h1>
          {chef.extended_bio?.replace(/\\n/g, "\n") && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {chef.extended_bio.replace(/\\n/g, "\n")}
            </p>
          )}
          {chef.service_area && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {chef.service_area}
            </p>
          )}
          <div className="mt-3">
            <ChefRatingBadge chefId={chef.id} />
          </div>
          <div className="mt-4 flex items-center gap-3">

            {chef.instagram_url && (
              <a
                href={chef.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-foreground/20 p-2 hover:bg-foreground hover:text-background"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {chef.tiktok_url && (
              <a
                href={chef.tiktok_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-foreground/20 px-3 py-2 text-[11px] uppercase tracking-widest hover:bg-foreground hover:text-background"
              >
                TikTok
              </a>
            )}
            {chef.youtube_url && (
              <a
                href={chef.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-foreground/20 p-2 hover:bg-foreground hover:text-background"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <button
              onClick={async () => setFav(await toggleFavorite(user.id, chef.id))}
              className="inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-2 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
            >
              <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
              {fav ? "Following" : "Follow Chef"}
            </button>
          )}
          <ShareStorefrontButton handle={chef.tastemaker_id} chefId={chef.id} />
        </div>
      </header>

      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Bio link: <span className="font-mono normal-case tracking-normal">{typeof window !== "undefined" ? window.location.origin : "eatcolorfull.com"}/chef/{chef.tastemaker_id}</span>
      </p>

      {/* Tabs */}
      <nav className="mt-8 flex flex-wrap gap-2 border-b border-foreground/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors ${
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="mt-10">
        {tab === "kitchen" && (
          <div className="space-y-12">
            {videos.length > 0 && (
              <WatchMyKitchen videos={videos} listingsById={listingsById} />
            )}
            <ShortFilmSection chef={chef} videos={videos} />
          </div>
        )}

        {tab === "about" && (
          <div className="prose prose-sm max-w-2xl whitespace-pre-wrap text-foreground/80">
            {chef.extended_bio ?? "This chef hasn't added a bio yet."}
          </div>
        )}
        {tab !== "kitchen" && tab !== "about" && (
          <ListingGrid items={byKind(tab)} />
        )}
      </section>
    </div>
  );
}

function ListingGrid({ items }: { items: ChefListing[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No offerings here yet.</p>
    );
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => (
        <Link
          key={l.id}
          to="/listings/$slug"
          params={{ slug: l.slug }}
          className="group block overflow-hidden rounded-2xl border border-foreground/10 bg-card transition-shadow hover:shadow-lg"
        >
          <ListingPhotoCarousel
            photos={l.photos}
            alt={l.title}
            fallback={
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                {LISTING_KIND_LABEL[l.kind]}
              </div>
            }
          />
          <div className="space-y-1 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {LISTING_KIND_LABEL[l.kind]}
            </p>
            <h3 className="font-serif text-lg leading-tight">{l.title}</h3>
            <div className="flex items-center justify-between pt-1">
              {l.price_cents != null ? (
                <p className="text-sm text-foreground/80">
                  ${(l.price_cents / 100).toFixed(0)}
                </p>
              ) : <span />}
              <span className="text-[11px] uppercase tracking-[0.22em] text-foreground/80 group-hover:underline">
                {LISTING_CTA[l.kind].primary} →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ShareStorefrontButton({ handle, chefId }: { handle: string; chefId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/chef/${handle}?utm_source=bio_link`
      : `https://eatcolorfull.com/chef/${handle}`;

  function log(channel: string) {
    import("@/lib/chef-kitchen").then(({ recordShareEvent }) =>
      recordShareEvent({
        chef_id: chefId,
        listing_id: null,
        platform: `storefront:${channel}`,
        share_url: url,
      }).catch(() => {}),
    );
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My Colorfull Kitchen", url });
        log("native");
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Storefront link copied");
      setTimeout(() => setCopied(false), 1800);
      log("copy");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-5 py-2 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      Share Kitchen
      <Copy className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

function ShortFilmSection({
  chef,
  videos,
}: {
  chef: ChefProfile;
  videos: KitchenVideo[];
}) {
  const groups: {
    platform: ChefVideoPlatform;
    label: string;
    icon: React.ReactNode;
    link: string | null;
  }[] = [
    { platform: "tiktok", label: "TikTok", icon: <TikTokIcon className="h-4 w-4" />, link: chef.tiktok_url },
    { platform: "youtube", label: "YouTube Shorts", icon: <Youtube className="h-4 w-4" />, link: chef.youtube_url },
    { platform: "instagram", label: "Instagram Reels", icon: <Instagram className="h-4 w-4" />, link: chef.instagram_url },
  ];

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Short films</p>
      <h2 className="mt-2 font-serif text-2xl md:text-3xl">In motion.</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {groups.map((g) => {
          const items = videos.filter((v) => v.platform === g.platform);
          return (
            <div key={g.platform} className="flex flex-col rounded-2xl border border-foreground/10 bg-card p-4">
              <div className="flex items-center gap-2">
                {g.link ? (
                  <a
                    href={g.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${g.label}`}
                    title={`Open ${g.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-110"
                  >
                    {g.icon}
                  </a>
                ) : (
                  <span
                    aria-label={`${g.label} not linked yet`}
                    title={`${g.label} not linked yet`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/40 text-background"
                  >
                    {g.icon}
                  </span>
                )}
                <p className="font-serif text-lg">{g.label}</p>
              </div>
              <div className="mt-4 flex-1">
                {items.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-foreground/20 p-4 text-center text-xs text-muted-foreground">
                    No {g.label} yet.
                  </div>
                ) : (
                  <ul className="grid gap-3">
                    {items.map((v) => (
                      <li key={v.id} className="overflow-hidden rounded-xl border border-foreground/10">
                        {v.thumbnail_url ? (
                          <a href={v.external_url ?? "#"} target="_blank" rel="noreferrer">
                            <img src={v.thumbnail_url} alt={v.title} className="aspect-[9/16] w-full object-cover" />
                          </a>
                        ) : (
                          <a href={v.external_url ?? "#"} target="_blank" rel="noreferrer" className="flex aspect-[9/16] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            View
                          </a>
                        )}
                        <div className="p-2">
                          <p className="text-sm">{v.title}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 border-t border-foreground/10 pt-3 text-xs">
                <span className="uppercase tracking-[0.18em] text-muted-foreground">Link:</span>{" "}
                {g.link ? (
                  <a href={g.link} target="_blank" rel="noreferrer" className="break-all font-mono underline underline-offset-2 hover:no-underline">
                    {g.link.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not linked yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


