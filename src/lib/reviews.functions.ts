import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ratingSchema = z.number().int().min(1).max(5);

const submitInput = z.object({
  tableId: z.string().min(1).max(200),
  hostId: z.string().min(1).max(200),
  ratings: z.object({
    food: ratingSchema,
    ambience: ratingSchema,
    hostEnergy: ratingSchema,
    cleanliness: ratingSchema,
    flow: ratingSchema,
    wouldReturn: ratingSchema,
  }),
  publicNote: z.string().max(240).optional().default(""),
  privateNote: z.string().max(1200).optional().default(""),
  flagged: z.boolean().optional().default(false),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => submitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("table_feedback")
      .select("id")
      .eq("user_id", userId)
      .eq("table_id", data.tableId)
      .maybeSingle();
    if (existing) {
      throw new Error("You've already shared a reflection for this table.");
    }

    const { error } = await supabase.from("table_feedback").insert({
      user_id: userId,
      table_id: data.tableId,
      host_id: data.hostId,
      food: data.ratings.food,
      ambience: data.ratings.ambience,
      host_energy: data.ratings.hostEnergy,
      cleanliness: data.ratings.cleanliness,
      flow: data.ratings.flow,
      would_return: data.ratings.wouldReturn,
      public_note: data.publicNote || null,
      private_note: data.privateNote || null,
      flagged: data.flagged,
      loved: [],
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("You've already shared a reflection for this table.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

const hasReviewedInput = z.object({ tableId: z.string().min(1).max(200) });
export const hasReviewedTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => hasReviewedInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("table_feedback")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("table_id", data.tableId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { reviewed: Boolean(row), submittedAt: (row?.created_at as string | undefined) ?? null };
  });

export type PublicReview = {
  id: string;
  tableId: string;
  hostId: string | null;
  attendedOn: string;
  ratings: {
    food: number | null;
    ambience: number | null;
    hostEnergy: number | null;
    cleanliness: number | null;
    flow: number | null;
    wouldReturn: number | null;
  };
  publicNote: string | null;
  flagged: boolean;
};

// Public, safe projection (no user_id, no private_note). Used to compute
// host scores and surface public quote lines.
export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("table_feedback")
    .select(
      "id, table_id, host_id, created_at, food, ambience, host_energy, cleanliness, flow, would_return, public_note, flagged",
    )
    .eq("flagged", false)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows: PublicReview[] = (data ?? []).map((r) => ({
    id: r.id as string,
    tableId: r.table_id as string,
    hostId: (r.host_id as string | null) ?? null,
    attendedOn: (r.created_at as string).slice(0, 10),
    ratings: {
      food: r.food as number | null,
      ambience: r.ambience as number | null,
      hostEnergy: r.host_energy as number | null,
      cleanliness: r.cleanliness as number | null,
      flow: r.flow as number | null,
      wouldReturn: r.would_return as number | null,
    },
    publicNote: (r.public_note as string | null) ?? null,
    flagged: Boolean(r.flagged),
  }));
  return rows;
});

// Admin-only: full review rows including private notes. Gated by admin role.
export const listAdminReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Forbidden");

    const { data, error } = await supabaseAdmin
      .from("table_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const markInput = z.object({ id: z.string().uuid(), reviewed: z.boolean() });
export const markReviewReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => markInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("table_feedback")
      .update({ admin_reviewed: data.reviewed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
