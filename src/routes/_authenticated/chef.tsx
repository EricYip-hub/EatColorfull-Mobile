import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getOrCreateMyChefProfile,
  updateChefProfile,
  listListingsForChef,
  createListing,
  deleteListing,
  listKitchenVideos,
  createKitchenVideo,
  deleteKitchenVideo,
  LISTING_KIND_LABEL,
  type ChefProfile,
  type ChefListing,
  type ChefListingKind,
  type KitchenVideo,
} from "@/lib/chef-kitchen";
import { ColorfullBadgeGenerator } from "@/components/chef/ColorfullBadge";
import { AnalyticsTab } from "@/components/chef/AnalyticsTab";
import { ShareHistoryTab } from "@/components/chef/ShareHistoryTab";
import { ChefPaymentsTab } from "@/components/chef/ChefPaymentsTab";
import { ChefRemindersTab } from "@/components/chef/ChefRemindersTab";

export const Route = createFileRoute("/_authenticated/chef")({
  component: ChefDashboard,
});

const TABS = ["Profile", "Listings", "Watch My Kitchen", "Payments", "Reminders", "Analytics", "Share History", "Shoppable Badges"] as const;

function ChefDashboard() {
  const { user, isHost } = useAuth();
  const [chef, setChef] = useState<ChefProfile | null>(null);
  const [listings, setListings] = useState<ChefListing[]>([]);
  const [videos, setVideos] = useState<KitchenVideo[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");

  useEffect(() => {
    if (!user) return;
    getOrCreateMyChefProfile(user.id).then((c) => {
      setChef(c);
      listListingsForChef(c.id).then(setListings);
      listKitchenVideos(c.id).then(setVideos);
    });
  }, [user]);

  if (!isHost) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl">Chef dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Your account isn't set up as a chef yet. Apply to host first.
        </p>
        <Link
          to="/tastemakers/apply"
          className="mt-6 inline-flex h-10 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em]"
        >
          Apply
        </Link>
      </div>
    );
  }

  if (!chef)
    return <div className="mx-auto max-w-3xl px-6 py-24">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-foreground/10 pb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Chef dashboard
        </p>
        <h1 className="mt-2 font-serif text-4xl">Your Social Kitchen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Public storefront:{" "}
          <Link
            to="/chefs/$chefId"
            params={{ chefId: chef.id }}
            className="underline"
          >
            /chefs/{chef.id.slice(0, 8)}…
          </Link>
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-foreground/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.2em] ${
              tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <section className="mt-8">
        {tab === "Profile" && (
          <ProfileTab chef={chef} onSave={setChef} />
        )}
        {tab === "Listings" && (
          <ListingsTab
            chefId={chef.id}
            listings={listings}
            onChange={() => listListingsForChef(chef.id).then(setListings)}
          />
        )}
        {tab === "Watch My Kitchen" && (
          <VideosTab
            chefId={chef.id}
            videos={videos}
            listings={listings}
            onChange={() => listKitchenVideos(chef.id).then(setVideos)}
          />
        )}
        {tab === "Payments" && <ChefPaymentsTab chefId={chef.id} />}
        {tab === "Reminders" && <ChefRemindersTab chefId={chef.id} />}
        {tab === "Analytics" && (
          <AnalyticsTab chefId={chef.id} listings={listings} />
        )}
        {tab === "Share History" && (
          <ShareHistoryTab chefId={chef.id} listings={listings} />
        )}
        {tab === "Shoppable Badges" && <ColorfullBadgeGenerator />}
      </section>
    </div>
  );
}

function ProfileTab({
  chef,
  onSave,
}: {
  chef: ChefProfile;
  onSave: (c: ChefProfile) => void;
}) {
  const [form, setForm] = useState(chef);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const c = await updateChefProfile(chef.id, form);
        onSave(c);
        setSaving(false);
      }}
    >
      <Field label="Service area">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          value={form.service_area ?? ""}
          onChange={(e) =>
            setForm({ ...form, service_area: e.target.value })
          }
        />
      </Field>
      <Field label="Extended bio (first line shows as headline)">
        <textarea
          rows={5}
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          value={form.extended_bio ?? ""}
          onChange={(e) =>
            setForm({ ...form, extended_bio: e.target.value })
          }
        />
      </Field>
      <Field label="Instagram URL">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          value={form.instagram_url ?? ""}
          onChange={(e) =>
            setForm({ ...form, instagram_url: e.target.value })
          }
        />
      </Field>
      <Field label="TikTok URL">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          value={form.tiktok_url ?? ""}
          onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })}
        />
      </Field>
      <Field label="YouTube URL">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          value={form.youtube_url ?? ""}
          onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
        />
      </Field>
      <Field label="Zelle handle (email or phone)">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          placeholder="you@example.com or (555) 555-5555"
          value={form.zelle_handle ?? ""}
          onChange={(e) => setForm({ ...form, zelle_handle: e.target.value })}
        />
      </Field>
      <Field label="Venmo handle (@username)">
        <input
          className="w-full rounded-md border border-foreground/20 px-3 py-2"
          placeholder="@your-venmo"
          value={form.venmo_handle ?? ""}
          onChange={(e) => setForm({ ...form, venmo_handle: e.target.value })}
        />
      </Field>
      <button
        disabled={saving}
        className="inline-flex h-10 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function ListingsTab({
  chefId,
  listings,
  onChange,
}: {
  chefId: string;
  listings: ChefListing[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ChefListingKind>("meal_prep");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState("");
  const [desc, setDesc] = useState("");
  const [video, setVideo] = useState("");

  return (
    <div className="space-y-8">
      <form
        className="grid max-w-3xl gap-3 rounded-2xl border border-foreground/10 bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title) return;
          await createListing(chefId, {
            title,
            kind,
            description: desc || null,
            price_cents: price ? Math.round(Number(price) * 100) : null,
            photos: photo ? [photo] : [],
            video_url: video || null,
          });
          setTitle("");
          setPrice("");
          setPhoto("");
          setDesc("");
          setVideo("");
          onChange();
        }}
      >
        <h3 className="font-serif text-xl">Add a new listing</h3>
        <Field label="Title">
          <input
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field label="Kind">
          <select
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as ChefListingKind)}
          >
            {(Object.keys(LISTING_KIND_LABEL) as ChefListingKind[]).map((k) => (
              <option key={k} value={k}>
                {LISTING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Price (USD)">
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-foreground/20 px-3 py-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Photo URL">
            <input
              className="w-full rounded-md border border-foreground/20 px-3 py-2"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Video URL (YouTube / TikTok / Instagram)">
          <input
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
        <button className="inline-flex h-10 w-fit items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background">
          Create listing
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-serif text-xl">Your listings</h3>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-2xl border border-foreground/10">
            {listings.map((l) => {
              const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/listings/${l.slug}`;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-3 p-4"
                >
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-serif text-base">{l.title}</p>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {LISTING_KIND_LABEL[l.kind]} · {l.status}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                    }}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                  >
                    Copy shoppable link
                  </button>
                  <Link
                    to="/listings/$slug"
                    params={{ slug: l.slug }}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]"
                  >
                    Preview
                  </Link>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this listing?")) {
                        await deleteListing(l.id);
                        onChange();
                      }
                    }}
                    className="rounded-md border border-destructive/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-destructive"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function VideosTab({
  chefId,
  videos,
  listings,
  onChange,
}: {
  chefId: string;
  videos: KitchenVideo[];
  listings: ChefListing[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [thumb, setThumb] = useState("");
  const [linked, setLinked] = useState("");
  const [cta, setCta] = useState("");

  return (
    <div className="space-y-8">
      <form
        className="grid max-w-3xl gap-3 rounded-2xl border border-foreground/10 bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title || !url) return;
          await createKitchenVideo(chefId, {
            title,
            external_url: url,
            thumbnail_url: thumb || undefined,
            linked_listing_id: linked || null,
            cta_label: cta || undefined,
          });
          setTitle("");
          setUrl("");
          setThumb("");
          setLinked("");
          setCta("");
          onChange();
        }}
      >
        <h3 className="font-serif text-xl">Add a video to your kitchen</h3>
        <Field label="Title (dish, week, or experience)">
          <input
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field label="Video URL (Instagram, TikTok, or YouTube)">
          <input
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </Field>
        <Field label="Thumbnail URL (recommended for IG/TikTok)">
          <input
            className="w-full rounded-md border border-foreground/20 px-3 py-2"
            value={thumb}
            onChange={(e) => setThumb(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link to a listing (optional)">
            <select
              className="w-full rounded-md border border-foreground/20 px-3 py-2"
              value={linked}
              onChange={(e) => setLinked(e.target.value)}
            >
              <option value="">— none —</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CTA label (e.g. Order this week's meals)">
            <input
              className="w-full rounded-md border border-foreground/20 px-3 py-2"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
            />
          </Field>
        </div>
        <button className="inline-flex h-10 w-fit items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background">
          Add video
        </button>
      </form>

      <ul className="divide-y divide-foreground/10 rounded-2xl border border-foreground/10">
        {videos.map((v) => (
          <li key={v.id} className="flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-serif text-base">{v.title}</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {v.platform}
              </p>
            </div>
            <button
              onClick={async () => {
                await deleteKitchenVideo(v.id);
                onChange();
              }}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-destructive"
            >
              Delete
            </button>
          </li>
        ))}
        {videos.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No videos yet.</li>
        )}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
