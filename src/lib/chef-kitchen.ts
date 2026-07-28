import { supabase } from "@/integrations/supabase/client";

export type ChefListingKind =
  | "meal_prep"
  | "hosted_table"
  | "private_dining"
  | "product"
  | "merch";

export type ChefListingStatus = "draft" | "active" | "paused" | "sold_out";

export type ChefVideoPlatform = "instagram" | "tiktok" | "youtube" | "upload";

export type ChefOrderStatus =
  | "pending"
  | "confirmed"
  | "fulfilled"
  | "cancelled";

export type ChefFulfillment = "pickup" | "delivery";

export type ChefProfile = {
  id: string;
  tastemaker_id: string;
  user_id: string;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  service_area: string | null;
  extended_bio: string | null;
  accepting_orders: boolean;
  zelle_handle: string | null;
  venmo_handle: string | null;
  created_at: string;
  updated_at: string;
};

export type ChefListing = {
  id: string;
  chef_id: string;
  kind: ChefListingKind;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  photos: string[];
  video_url: string | null;
  details: any;
  slug: string;
  status: ChefListingStatus;
  inventory_remaining: number | null;
  cutoff_at: string | null;
  created_at: string;
  updated_at: string;
};

export type KitchenVideo = {
  id: string;
  chef_id: string;
  platform: ChefVideoPlatform;
  external_url: string | null;
  thumbnail_url: string | null;
  uploaded_video_id: string | null;
  title: string;
  description: string | null;
  linked_listing_id: string | null;
  cta_label: string | null;
  display_order: number;
  is_public: boolean;
  created_at: string;
};

const PUBLIC_CHEF_PROFILE_SELECT =
  "id, tastemaker_id, user_id, instagram_url, tiktok_url, youtube_url, service_area, extended_bio, accepting_orders, created_at, updated_at";

export const LISTING_KIND_LABEL: Record<ChefListingKind, string> = {
  meal_prep: "Meal Prep",
  hosted_table: "Hosted Table",
  private_dining: "Private Dining",
  product: "Food Product",
  merch: "Merchandise",
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function detectPlatform(url: string): ChefVideoPlatform {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  return "upload";
}

export function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// ---------- Chef profile ----------

export async function getChefProfileByTastemakerId(tastemakerId: string) {
  const { data } = await supabase
    .from("chef_profiles")
    .select(PUBLIC_CHEF_PROFILE_SELECT)
    .eq("tastemaker_id", tastemakerId)
    .maybeSingle();
  return data as ChefProfile | null;
}

export async function getChefProfileById(id: string) {
  const { data } = await supabase
    .from("chef_profiles")
    .select(PUBLIC_CHEF_PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data as ChefProfile | null;
}

export async function getOrCreateMyChefProfile(userId: string) {
  const { data: existing } = await supabase
    .from("chef_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as ChefProfile;
  const { data, error } = await supabase
    .from("chef_profiles")
    .insert({
      user_id: userId,
      tastemaker_id: userId,
      accepting_orders: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChefProfile;
}

export async function updateChefProfile(
  id: string,
  patch: Partial<ChefProfile>,
) {
  const { data, error } = await supabase
    .from("chef_profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChefProfile;
}

// ---------- Listings ----------

export async function listListingsForChef(chefId: string) {
  const { data } = await supabase
    .from("chef_listings")
    .select("*")
    .eq("chef_id", chefId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ChefListing[];
}

export async function listActiveListingsForChef(chefId: string) {
  const { data } = await supabase
    .from("chef_listings")
    .select("*")
    .eq("chef_id", chefId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data ?? []) as ChefListing[];
}

export async function listMealPrepMarketplace() {
  const { data } = await supabase
    .from("chef_listings")
    .select(`*, chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})`)
    .eq("kind", "meal_prep")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data ?? []) as (ChefListing & { chef: ChefProfile })[];
}

export async function getListingBySlug(slug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
  const query = supabase
    .from("chef_listings")
    .select(`*, chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})`);

  const { data } = await query.eq("slug", slug).maybeSingle();
  if (data || !isUuid) return data as (ChefListing & { chef: ChefProfile }) | null;

  const { data: byId } = await supabase
    .from("chef_listings")
    .select(`*, chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})`)
    .eq("id", slug)
    .maybeSingle();
  return byId as (ChefListing & { chef: ChefProfile }) | null;
}

export async function createListing(
  chefId: string,
  input: Partial<ChefListing> & { title: string; kind: ChefListingKind },
) {
  const base = slugify(input.title) || "listing";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("chef_listings")
    .insert({
      chef_id: chefId,
      kind: input.kind,
      title: input.title,
      description: input.description ?? null,
      price_cents: input.price_cents ?? null,
      photos: input.photos ?? [],
      video_url: input.video_url ?? null,
      details: input.details ?? {},
      inventory_remaining: input.inventory_remaining ?? null,
      cutoff_at: input.cutoff_at ?? null,
      status: input.status ?? "active",
      slug,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChefListing;
}

export async function updateListing(id: string, patch: Partial<ChefListing>) {
  const { data, error } = await supabase
    .from("chef_listings")
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChefListing;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from("chef_listings").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Kitchen videos ----------

export async function listKitchenVideos(chefId: string, publicOnly = false) {
  let q = supabase
    .from("chef_kitchen_videos")
    .select("*")
    .eq("chef_id", chefId)
    .order("display_order", { ascending: true });
  if (publicOnly) q = q.eq("is_public", true);
  const { data } = await q;
  return (data ?? []) as KitchenVideo[];
}

export async function createKitchenVideo(
  chefId: string,
  input: {
    title: string;
    external_url: string;
    thumbnail_url?: string;
    description?: string;
    linked_listing_id?: string | null;
    cta_label?: string;
  },
) {
  const platform = detectPlatform(input.external_url);
  const { data, error } = await supabase
    .from("chef_kitchen_videos")
    .insert({
      chef_id: chefId,
      platform,
      external_url: input.external_url,
      thumbnail_url: input.thumbnail_url ?? null,
      title: input.title,
      description: input.description ?? null,
      linked_listing_id: input.linked_listing_id ?? null,
      cta_label: input.cta_label ?? null,
      is_public: true,
      display_order: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as KitchenVideo;
}

export async function updateKitchenVideo(
  id: string,
  patch: Partial<KitchenVideo>,
) {
  const { error } = await supabase
    .from("chef_kitchen_videos")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKitchenVideo(id: string) {
  await supabase.from("chef_kitchen_videos").delete().eq("id", id);
}

// ---------- Orders ----------

export async function createOrder(input: {
  user_id: string;
  chef_id: string;
  listing_id: string;
  quantity: number;
  fulfillment: ChefFulfillment;
  fulfillment_date?: string | null;
  dietary_notes?: string | null;
  total_cents: number;
  source_video_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("chef_orders")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMyOrders(userId: string) {
  const { data } = await supabase
    .from("chef_orders")
    .select(`*, listing:chef_listings(*, chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})), chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---------- Favorites ----------

export async function toggleFavorite(userId: string, chefId: string) {
  const { data: existing } = await supabase
    .from("chef_favorites")
    .select("user_id")
    .eq("user_id", userId)
    .eq("chef_id", chefId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("chef_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("chef_id", chefId);
    return false;
  }
  await supabase.from("chef_favorites").insert({ user_id: userId, chef_id: chefId });
  return true;
}

export async function listFavorites(userId: string) {
  const { data } = await supabase
    .from("chef_favorites")
    .select(`chef_id, chef:chef_profiles(${PUBLIC_CHEF_PROFILE_SELECT})`)
    .eq("user_id", userId);
  return data ?? [];
}

// ---------- Analytics ----------

export async function trackProfileView(chefId: string, viewerUserId?: string) {
  await supabase.from("chef_profile_views").insert({
    chef_id: chefId,
    viewer_user_id: viewerUserId ?? null,
  });
}

export async function trackLinkClick(
  listingId: string,
  utmSource?: string,
  referrer?: string,
) {
  await supabase.from("chef_link_clicks").insert({
    listing_id: listingId,
    utm_source: utmSource ?? null,
    referrer: referrer ?? null,
  });
}

export async function getChefAnalytics(chefId: string) {
  const [views, clicks, orders] = await Promise.all([
    supabase
      .from("chef_profile_views")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chefId),
    supabase
      .from("chef_link_clicks")
      .select("id, listing_id, created_at, utm_source, referrer")
      .in(
        "listing_id",
        (
          await supabase
            .from("chef_listings")
            .select("id")
            .eq("chef_id", chefId)
        ).data?.map((l) => l.id) ?? [],
      ),
    supabase
      .from("chef_orders")
      .select("id, listing_id, total_cents, status, created_at")
      .eq("chef_id", chefId),
  ]);
  return {
    profile_views: views.count ?? 0,
    clicks: clicks.data ?? [],
    orders: orders.data ?? [],
  };
}

// ---------- Share history ----------

export type ChefShareEvent = {
  id: string;
  chef_id: string;
  listing_id: string | null;
  platform: string;
  share_url: string;
  created_by: string | null;
  created_at: string;
};

export async function recordShareEvent(input: {
  chef_id: string;
  listing_id?: string | null;
  platform: string;
  share_url: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("chef_share_events").insert({
    chef_id: input.chef_id,
    listing_id: input.listing_id ?? null,
    platform: input.platform,
    share_url: input.share_url,
    created_by: user?.id ?? null,
  });
}

export async function listShareEventsForChef(chefId: string) {
  const { data } = await supabase
    .from("chef_share_events")
    .select("*")
    .eq("chef_id", chefId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as ChefShareEvent[];
}

