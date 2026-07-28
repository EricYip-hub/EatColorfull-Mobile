import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Heart, Instagram, Youtube, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MealPlanShareDialog } from "@/components/chef/MealPlanShareDialog";
import { getTastemaker, TASTEMAKER_STATUS_LABEL } from "@/lib/tastemakers-data";
import { TABLES } from "@/lib/tables-data";
import { useAuth } from "@/lib/auth-context";
import {
  listVideosForTastemaker,
  type TastemakerVideo,
  type TastemakerVideoPlatform,
} from "@/lib/tastemaker-videos";
import {
  getChefProfileByTastemakerId,
  listActiveListingsForChef,
  listKitchenVideos,
  trackProfileView,
  toggleFavorite,
  LISTING_KIND_LABEL,
  type ChefProfile,
  type ChefListing,
  type KitchenVideo,
} from "@/lib/chef-kitchen";
import { WatchMyKitchen } from "@/components/chef/WatchMyKitchen";
import { useIsEventEnded, EVENT_END } from "@/lib/event-status";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.6 6.3a5.7 5.7 0 0 1-3.4-1.1V15a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.5V3h2.7a5.7 5.7 0 0 0 3.4 3.3z" />
    </svg>
  );
}

function EndedEventBanner({
  title,
  meta,
}: {
  title: string;
  meta: string;
}) {
  return (
    <div className="mb-3 flex flex-col items-start rounded-2xl border border-border bg-muted/40 p-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]">
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] tracking-[0.2em] text-background">
            Ended
          </span>
          Past event
        </span>
        <span className="mt-1 block font-serif text-2xl text-foreground/70 line-through decoration-foreground/30">
          {title}
        </span>
        <span className="mt-1 block text-xs">{meta}</span>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/tastemakers/$tastemakerId")({
  head: ({ params }) => {
    const t = getTastemaker(params.tastemakerId);
    const title = t ? `${t.name} — Colorfull Tastemaker` : "Tastemaker — Colorfull";
    const desc = t?.shortBio ?? "A Colorfull tastemaker profile.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(t ? [{ property: "og:image", content: t.cover }] : []),
      ],
    };
  },
  component: TastemakerProfile,
});

function TastemakerProfile() {
  const { tastemakerId } = Route.useParams();
  const t = getTastemaker(tastemakerId);
  const { isHost, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [collabSent, setCollabSent] = useState(false);
  const handleCollabRequest = () => {
    if (!user) {
      toast.info("Please sign in to request a collaboration.");
      navigate({ to: "/login", search: { redirect: window.location.pathname } });
      return;
    }
    setCollabSent(true);
    toast.success("Collaboration request sent.");
  };
  const [uploadedVideos, setUploadedVideos] = useState<TastemakerVideo[]>([]);
  const [sharePlanOpen, setSharePlanOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // Chef Social Kitchen state
  const [chef, setChef] = useState<ChefProfile | null>(null);
  const [chefListings, setChefListings] = useState<ChefListing[]>([]);
  const [kitchenVideos, setKitchenVideos] = useState<KitchenVideo[]>([]);

  // Reactive ended flags — auto-flip when each event's end time passes.
  const irieEnded = useIsEventEnded(EVENT_END.irieSupperClubJune3);
  const molinoSatEnded = useIsEventEnded(EVENT_END.molinoSaturdayJune6);
  const molinoWedEnded = useIsEventEnded(EVENT_END.molinoWednesdayJune3);
  const richieEnded = useIsEventEnded(EVENT_END.richieTuesdayJune2);

  useEffect(() => {
    listVideosForTastemaker(tastemakerId)
      .then(setUploadedVideos)
      .catch(() => setUploadedVideos([]));

    // Try to load linked chef profile
    getChefProfileByTastemakerId(tastemakerId).then((cp) => {
      if (!cp) return;
      setChef(cp);
      listActiveListingsForChef(cp.id).then(setChefListings);
      listKitchenVideos(cp.id, true).then(setKitchenVideos);
      trackProfileView(cp.id, user?.id).catch(() => {});
    });
  }, [tastemakerId, user?.id]);

  // Load favorite state once chef + user are known
  useEffect(() => {
    if (!chef || !user) {
      setIsFavorite(false);
      return;
    }
    supabase
      .from("chef_favorites")
      .select("chef_id")
      .eq("user_id", user.id)
      .eq("chef_id", chef.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [chef, user]);

  async function handleToggleFavorite() {
    if (!user) {
      toast.error("Sign in to save chefs to your favorites.");
      return;
    }
    if (!chef) {
      toast.error("This tastemaker doesn't have a chef profile yet.");
      return;
    }
    setFavoriteBusy(true);
    try {
      const nowFav = await toggleFavorite(user.id, chef.id);
      setIsFavorite(nowFav);
      toast.success(nowFav ? "Added to your favorites" : "Removed from favorites");
    } catch {
      toast.error("Could not update favorites");
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (!t) return <Navigate to="/tastemakers" />;

  const upcoming = TABLES.filter((tb) => t.upcomingTableIds.includes(tb.id));
  const isChefOwner = !!(chef && user && chef.user_id === user.id);
  const canUpload = isHost || isAdmin || isChefOwner;
  const hasChefStore = chef !== null;
  const showShortFilms = hasChefStore;


  return (
    <>
      {/* Cover */}
      <section className="relative">

        <div className="relative h-[42vh] min-h-[320px] w-full overflow-hidden md:h-[56vh]">
          <img src={t.cover} alt={`${t.name} — cover image`} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/60" />
        </div>
      </section>

      {/* Identity */}
      <section className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:gap-5">
            <img
              src={t.avatar}
              alt={t.name}
              className="-mt-14 h-28 w-28 shrink-0 rounded-full border-4 border-background bg-background object-cover shadow-lg md:-mt-20 md:h-36 md:w-36"
            />
            <div className="md:pb-2">
              <p className="eyebrow text-foreground/70">
                {t.neighborhood} · {t.city}
              </p>
              <h1 className="mt-2 font-serif text-3xl md:text-5xl">{t.name}</h1>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {t.handle} · {TASTEMAKER_STATUS_LABEL[t.status]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              disabled={favoriteBusy || !hasChefStore}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={
                hasChefStore
                  ? isFavorite
                    ? "Remove from favorites"
                    : "Add to favorites"
                  : "Favorites open once a chef profile is linked"
              }
              className={`inline-flex h-10 items-center gap-2 px-5 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-60 ${
                isFavorite
                  ? "bg-foreground text-background"
                  : "border border-foreground text-foreground hover:bg-foreground hover:text-background"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
              />
              {isFavorite ? "Favorited" : "Favorite"}
            </button>
            <button
              onClick={handleCollabRequest}
              disabled={collabSent}
              className="inline-flex h-10 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background disabled:opacity-60"
            >
              {collabSent ? "Request sent" : "Request collaboration"}
            </button>
          </div>
        </div>


        {/* Bio + philosophy */}
        <div className="mt-10 grid gap-10 border-t border-border pt-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="font-serif text-xl leading-relaxed md:text-2xl text-balance">
              "{t.philosophy}"
            </p>
            <p className="mt-6 text-muted-foreground leading-relaxed">{t.shortBio}</p>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="eyebrow">Cultural background</dt>
                <dd className="mt-2 text-sm leading-relaxed">{t.culturalBackground}</dd>
              </div>
              <div>
                <dt className="eyebrow">Wellness focus</dt>
                <dd className="mt-2 text-sm leading-relaxed">{t.wellnessFocus}</dd>
              </div>
            </dl>
          </div>
          <aside className="rounded-2xl border border-border bg-secondary/40 p-6">
            <p className="eyebrow">Cuisine focus</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.cuisineFocus.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/80"
                >
                  {c}
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-6">Signature dishes</p>
            <ul className="mt-3 space-y-1 font-serif text-base">
              {t.signatureDishes.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Primary CTAs */}
      <section className="mx-auto mt-14 max-w-6xl px-6">
        {tastemakerId === "vince-macintosh" && (
          irieEnded ? (
            <EndedEventBanner
              title="Irie Supper Club · Sunset Rooftop Dinner"
              meta="Wed, June 3 · 21 Union Jack, Marina Del Rey · $180/guest"
            />
          ) : (
            <Link
              to="/irie-supper-club"
              className="mb-3 flex flex-col items-start rounded-2xl border border-foreground bg-foreground p-6 text-background transition-colors hover:bg-foreground/90 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] opacity-80">
                  Now booking — invite only
                </span>
                <span className="mt-1 block font-serif text-2xl">
                  Irie Supper Club · Sunset Rooftop Dinner
                </span>
                <span className="mt-1 block text-xs opacity-80">
                  Wed, June 3 · 21 Union Jack, Marina Del Rey · $180/guest
                </span>
              </div>
              <span className="mt-3 inline-flex h-10 items-center border border-background/40 px-5 text-[11px] uppercase tracking-[0.22em] sm:mt-0">
                Reserve a seat →
              </span>
            </Link>
          )
        )}
        {tastemakerId === "moshe-feema" && (
          <>
            <Link
              to="/vintage-1986"
              className="mb-3 flex flex-col items-start rounded-2xl border-2 p-6 transition-opacity hover:opacity-90 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "#a72525", backgroundColor: "#f4ecd8", color: "#1a1a1a" }}
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: "#a72525" }}>
                  Monday, June 8 · invite only
                </span>
                <span className="mt-1 block font-serif italic text-3xl" style={{ color: "#a72525" }}>
                  Vintage 1986 · curated by molino
                </span>
                <span className="mt-1 block text-xs">
                  Mon, June 8 · 8 PM · celebrating 40 · address after RSVP
                </span>
              </div>
              <span
                className="mt-3 inline-flex h-10 items-center px-5 text-[11px] uppercase tracking-[0.22em] sm:mt-0"
                style={{ backgroundColor: "#a72525", color: "#f4ecd8" }}
              >
                RSVP →
              </span>
            </Link>
            {molinoSatEnded && (
              <EndedEventBanner
                title="Molino · Saturday Night Pizza Pop-Up"
                meta="Sat, June 6 · 9:25 PM — 12:30 AM · Margherita, La Bianca, Fusilloni alla Vodka & Nutella Calzone"
              />
            )}
            {molinoWedEnded && (
              <EndedEventBanner
                title="Molino · Wednesday Pop-Up"
                meta="Wed, June 3 · 12:30 — 4:30 PM · Margherita & La Bianca"
              />
            )}
          </>
        )}
        {tastemakerId === "richie-million-jr" && (
          richieEnded ? (
            <EndedEventBanner
              title="A Night with Richie Million Jr."
              meta="Tue, June 2 · West Hollywood · family-style"
            />
          ) : (
            <Link
              to="/richie"
              className="mb-3 flex flex-col items-start rounded-2xl border border-foreground bg-foreground p-6 text-background transition-colors hover:bg-foreground/90 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] opacity-80">
                  Now booking — communal dinner
                </span>
                <span className="mt-1 block font-serif text-2xl">
                  A Night with Richie Million Jr.
                </span>
                <span className="mt-1 block text-xs opacity-80">
                  New York Steak & Honey Dijon Salmon · family-style · limited seats
                </span>
              </div>
              <span className="mt-3 inline-flex h-10 items-center border border-background/40 px-5 text-[11px] uppercase tracking-[0.22em] sm:mt-0">
                RSVP for dinner →
              </span>
            </Link>
          )
        )}


        <div className="grid gap-3 sm:grid-cols-3">
          {t.hostReady && upcoming[0] ? (
            <Link
              to="/tables/$tableId"
              params={{ tableId: upcoming[0].id }}
              className="flex flex-col items-start rounded-2xl border border-foreground bg-foreground p-6 text-background transition-colors hover:bg-foreground/90"
            >
              <span className="text-[10px] uppercase tracking-[0.24em] opacity-80">
                Now hosting
              </span>
              <span className="mt-2 font-serif text-xl">Book a table</span>
              <span className="mt-1 text-xs opacity-80">{upcoming[0].title}</span>
            </Link>
          ) : (
            <div className="flex flex-col items-start rounded-2xl border border-dashed border-border p-6 text-muted-foreground">
              <span className="text-[10px] uppercase tracking-[0.24em]">
                No upcoming tables
              </span>
              <span className="mt-2 font-serif text-xl">Get notified</span>
            </div>
          )}
          {t.mealPlans[0] ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-6">
              <Link
                to="/apply"
                search={{ intent: "attend" }}
                className="flex w-full flex-col items-start transition-colors hover:opacity-90"
              >
                <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Inspired meal plan
                </span>
                <span className="mt-2 font-serif text-xl">Request a Table</span>
                <span className="mt-1 text-xs text-muted-foreground">{t.mealPlans[0].title}</span>
              </Link>
              <button
                type="button"
                onClick={() => setSharePlanOpen(true)}
                className="inline-flex items-center gap-2 self-stretch justify-center rounded-full border border-foreground/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-foreground hover:text-background"
              >
                <Share2 className="h-3.5 w-3.5" /> Share this plan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start rounded-2xl border border-dashed border-border p-6 text-muted-foreground">
              <span className="text-[10px] uppercase tracking-[0.24em]">Plans</span>
              <span className="mt-2 font-serif text-xl">Coming soon</span>
            </div>
          )}
          <button
            onClick={handleCollabRequest}
            disabled={collabSent}
            className="flex flex-col items-start rounded-2xl border border-border bg-background p-6 text-left transition-colors hover:border-foreground disabled:opacity-60"
          >
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Brands & partners
            </span>
            <span className="mt-2 font-serif text-xl">
              {collabSent ? "Request sent" : "Request collaboration"}
            </span>
          </button>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto mt-16 max-w-7xl px-6 md:mt-24">
        <p className="eyebrow">From the kitchen</p>
        <h2 className="mt-2 font-serif text-2xl md:text-3xl">Food gallery.</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {t.gallery.map((g, i) => (
            <li
              key={g + i}
              className="aspect-square overflow-hidden rounded-xl bg-muted"
            >
              <img src={g} alt={`${t.name} — gallery image ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      </section>

      {/* Short films — split by platform */}
      {showShortFilms && (
        <section className="mx-auto mt-8 max-w-7xl px-6">
          <div>
            <p className="eyebrow">Short films</p>
            <h2 className="mt-2 font-serif text-2xl md:text-3xl">In motion.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Short clips from {t.name.split(" ")[0]}'s kitchen, grouped by where
              they live online.
            </p>
          </div>

          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <PlatformShortFilms
              platform="tiktok"
              label="TikTok"
              icon={<TikTokIcon className="h-4 w-4" />}
              link={chef?.tiktok_url ?? null}
              videos={uploadedVideos.filter((v) => v.platform === "tiktok")}
              canUpload={canUpload}
              tastemakerId={tastemakerId}
            />
            <PlatformShortFilms
              platform="youtube"
              label="YouTube Shorts"
              icon={<Youtube className="h-4 w-4" />}
              link={chef?.youtube_url ?? null}
              videos={uploadedVideos.filter((v) => v.platform === "youtube")}
              canUpload={canUpload}
              tastemakerId={tastemakerId}
            />
            <PlatformShortFilms
              platform="instagram"
              label="Instagram Reels"
              icon={<Instagram className="h-4 w-4" />}
              link={chef?.instagram_url ?? null}
              videos={uploadedVideos.filter((v) => v.platform === "instagram")}
              canUpload={canUpload}
              tastemakerId={tastemakerId}
            />
          </div>

          {uploadedVideos.filter((v) => v.platform === "upload").length > 0 && (
            <div className="mt-10">
              <p className="eyebrow">More uploads</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {uploadedVideos
                  .filter((v) => v.platform === "upload")
                  .map((v) => (
                    <li
                      key={v.id}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <video
                        src={v.public_url}
                        controls
                        preload="metadata"
                        poster={v.poster_url ?? undefined}
                        className="aspect-video w-full bg-black object-cover"
                      />
                      <div className="p-3">
                        <p className="font-serif text-base">{v.title}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}




      {/* Tables & past */}
      <section className="mx-auto mt-16 grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div>
          <p className="eyebrow">Upcoming Colorfull tables</p>
          {upcoming.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {upcoming.map((tb) => (
                <li key={tb.id}>
                  <Link
                    to="/tables/$tableId"
                    params={{ tableId: tb.id }}
                    className="flex items-center gap-4 rounded-xl border border-border p-4 hover:border-foreground"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img src={tb.image} alt={tb.title} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="font-serif text-base">{tb.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tb.date} · {tb.neighborhood}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No upcoming tables yet. Save the profile to be notified.
            </p>
          )}
        </div>
        <div>
          <p className="eyebrow">Past tables & collaborations</p>
          {t.pastCollabs.length > 0 ? (
            <ul className="mt-4 space-y-3 border-l border-border pl-4">
              {t.pastCollabs.map((c) => (
                <li key={c.title}>
                  <p className="font-serif text-base">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No past collaborations listed.</p>
          )}
        </div>
      </section>

      {/* Chef Social Kitchen — Watch & Shop */}
      {hasChefStore && (
        <section className="mx-auto mt-16 max-w-7xl px-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Chef storefront
              </p>
              <h2 className="mt-1 font-serif text-xl md:text-2xl">
                Watch, browse, and order from {t.name.split(" ")[0]}.
              </h2>
            </div>
            <Link
              to="/chefs/$chefId"
              params={{ chefId: chef!.id }}
              className="inline-flex h-10 shrink-0 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
            >
              Open storefront
            </Link>
          </div>

          {/* Videos */}
          {kitchenVideos.length > 0 && (
            <div className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Watch My Kitchen</p>
                  <h3 className="mt-2 font-serif text-2xl md:text-3xl">
                    Cook with {t.name.split(" ")[0]}.
                  </h3>
                </div>
              </div>
              <div className="mt-6">
                <WatchMyKitchen
                  videos={kitchenVideos}
                  listingsById={Object.fromEntries(
                    chefListings.map((l) => [l.id, l]),
                  )}
                />
              </div>
            </div>
          )}

          {/* Active listings */}
          {chefListings.length > 0 && (
            <div className="mt-14">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Shop</p>
                  <h3 className="mt-2 font-serif text-2xl md:text-3xl">
                    What {t.name.split(" ")[0]} is offering now.
                  </h3>
                </div>
              </div>
              <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {chefListings.map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/listings/$slug"
                      params={{ slug: l.slug }}
                      className="group block overflow-hidden rounded-2xl border border-foreground/10 bg-card transition-shadow hover:shadow-lg"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        {l.photos[0] ? (
                          <img
                            src={l.photos[0]}
                            alt={l.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                            {LISTING_KIND_LABEL[l.kind]}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 p-4">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          {LISTING_KIND_LABEL[l.kind]}
                        </p>
                        <h4 className="font-serif text-lg leading-tight">
                          {l.title}
                        </h4>
                        {l.price_cents != null && (
                          <p className="text-sm text-foreground/80">
                            ${(l.price_cents / 100).toFixed(0)}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="h-24" />
      {t.mealPlans[0] && (
        <MealPlanShareDialog
          open={sharePlanOpen}
          onOpenChange={setSharePlanOpen}
          data={{
            tastemakerId: t.id,
            tastemakerName: t.name,
            coverImage: t.cover,
            avatarImage: t.avatar,
            plan: t.mealPlans[0],
          }}

        />
      )}
    </>
  );
}

function PlatformShortFilms({
  platform,
  label,
  icon,
  link,
  videos,
  canUpload,
  tastemakerId,
}: {
  platform: TastemakerVideoPlatform;
  label: string;
  icon: React.ReactNode;
  link: string | null;
  videos: TastemakerVideo[];
  canUpload: boolean;
  tastemakerId: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
            {icon}
          </span>
          <p className="font-serif text-lg">{label}</p>
        </div>
        {canUpload && (
          <Link
            to="/tastemakers/$tastemakerId/upload"
            params={{ tastemakerId }}
            search={{ platform }}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-foreground/30 px-3 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
          >
            <Upload className="h-3.5 w-3.5" />
            Add
          </Link>
        )}
      </div>

      <div className="mt-4 flex-1">
        {videos.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No {label} yet.
          </div>
        ) : (
          <ul className="grid gap-3">
            {videos.map((v) => (
              <li
                key={v.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <video
                  src={v.public_url}
                  controls
                  preload="metadata"
                  poster={v.poster_url ?? undefined}
                  className="aspect-[9/16] w-full bg-black object-cover"
                />
                <div className="p-2">
                  <p className="text-sm">{v.title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3 text-xs">
        <span className="uppercase tracking-[0.18em] text-muted-foreground">
          Link:
        </span>{" "}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-foreground underline underline-offset-2 hover:no-underline"
          >
            {link.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-muted-foreground">Not linked yet</span>
        )}
      </div>
    </div>
  );
}

