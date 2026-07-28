import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ChefRatingSummary = {
  average: number;
  count: number;
};

export type ChefRating = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  display_name: string | null;
};

const chefIdInput = z.object({ chefId: z.string().uuid() });

export const getChefRatingSummary = createServerFn({ method: "GET" })
  .inputValidator((input) => chefIdInput.parse(input))
  .handler(async ({ data }): Promise<ChefRatingSummary> => {
    const { data: rows, error } = await supabaseAdmin
      .from("chef_ratings")
      .select("stars")
      .eq("chef_id", data.chefId);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { average: 0, count: 0 };
    const total = rows.reduce((sum, r) => sum + (r.stars as number), 0);
    return { average: total / rows.length, count: rows.length };
  });

export const listChefRatings = createServerFn({ method: "GET" })
  .inputValidator((input) => chefIdInput.parse(input))
  .handler(async ({ data }): Promise<ChefRating[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("chef_ratings")
      .select("id, stars, comment, created_at, user_id")
      .eq("chef_id", data.chefId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)));
    const nameByUser: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        nameByUser[p.id as string] = (p.display_name as string | null) ?? null;
      }
    }
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      stars: r.stars as number,
      comment: (r.comment as string | null) ?? null,
      created_at: r.created_at as string,
      display_name: nameByUser[r.user_id as string] ?? null,
    }));
  });

const submitInput = z.object({
  orderId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().default(""),
});

export const submitChefRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => submitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error: orderErr } = await supabase
      .from("chef_orders")
      .select("id, chef_id, user_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order || order.user_id !== userId) {
      throw new Error("Order not found");
    }
    if (order.status !== "fulfilled") {
      throw new Error("You can rate this chef once your order is fulfilled.");
    }

    const payload = {
      chef_id: order.chef_id as string,
      order_id: order.id as string,
      user_id: userId,
      stars: data.stars,
      comment: data.comment ? data.comment : null,
    };

    const { error } = await supabase
      .from("chef_ratings")
      .upsert(payload, { onConflict: "order_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRatingForOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chef_ratings")
      .select("stars, comment")
      .eq("order_id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row
      ? { stars: row.stars as number, comment: (row.comment as string | null) ?? "" }
      : null;
  });
