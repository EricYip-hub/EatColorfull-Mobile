import { Link } from "@tanstack/react-router";
import { Instagram, Play, Youtube } from "lucide-react";
import {
  type ChefListing,
  type KitchenVideo,
  youtubeEmbedUrl,
} from "@/lib/chef-kitchen";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.6 6.3a5.7 5.7 0 0 1-3.4-1.1V15a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.5V3h2.7a5.7 5.7 0 0 0 3.4 3.3v0z" />
    </svg>
  );
}

function platformIcon(p: KitchenVideo["platform"]) {
  if (p === "youtube") return <Youtube className="h-4 w-4" />;
  if (p === "instagram") return <Instagram className="h-4 w-4" />;
  if (p === "tiktok") return <TikTokIcon className="h-4 w-4" />;
  return <Play className="h-4 w-4" />;
}

export function WatchMyKitchen({
  videos,
  listingsById,
}: {
  videos: KitchenVideo[];
  listingsById: Record<string, ChefListing>;
}) {
  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-foreground/20 px-6 py-10 text-center text-sm text-muted-foreground">
        No videos yet. Check back soon.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => {
        const linked = v.linked_listing_id
          ? listingsById[v.linked_listing_id]
          : null;
        const yt = v.external_url ? youtubeEmbedUrl(v.external_url) : null;
        return (
          <article
            key={v.id}
            className="group overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-sm"
          >
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
              {yt ? (
                <iframe
                  src={yt}
                  title={v.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : v.thumbnail_url ? (
                <a
                  href={v.external_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full w-full"
                >
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/0">
                    <div className="rounded-full bg-white/90 p-3 text-foreground">
                      <Play className="h-5 w-5" />
                    </div>
                  </div>
                </a>
              ) : (
                <a
                  href={v.external_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full w-full items-center justify-center bg-foreground/5 text-muted-foreground"
                >
                  <Play className="h-8 w-8" />
                </a>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-widest text-white">
                {platformIcon(v.platform)}
                {v.platform}
              </span>
            </div>
            <div className="space-y-2 p-4">
              <h3 className="font-serif text-lg leading-tight">{v.title}</h3>
              {v.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {v.description}
                </p>
              )}
              {linked && (
                <Link
                  to="/listings/$slug"
                  params={{ slug: linked.slug }}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-foreground/85"
                >
                  {v.cta_label ?? "View offering"}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
