import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MolinoOrderRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  guest_count: number;
  amount_due_cents: number;
  payment_status: string;
  notes: string | null;
  dietary_notes: string | null;
  pickup_time: string | null;
  margherita_qty: number;
  margherita_addons: string | null;
  bianca_qty: number;
  bianca_addons: string | null;
};

const EVENT_SLUG = "molino-pizza-pop-up";

async function assertAdmin(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function parseNotes(notes: string | null) {
  const out = {
    pickup_time: null as string | null,
    margherita_qty: 0,
    margherita_addons: null as string | null,
    bianca_qty: 0,
    bianca_addons: null as string | null,
  };
  if (!notes) return out;
  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim();
    const pickup = line.match(/^Pickup:\s*(.+)$/i);
    if (pickup) {
      out.pickup_time = pickup[1].trim();
      continue;
    }
    const marg = line.match(/^(\d+)\s*×\s*Margherita Pizza(?:\s*\(add-ons:\s*([^)]+)\))?/i);
    if (marg) {
      out.margherita_qty = parseInt(marg[1], 10) || 0;
      out.margherita_addons = marg[2]?.trim() || null;
      continue;
    }
    const bianca = line.match(/^(\d+)\s*×\s*La Bianca Pizza(?:\s*\(add-on:\s*([^)]+)\))?/i);
    if (bianca) {
      out.bianca_qty = parseInt(bianca[1], 10) || 0;
      out.bianca_addons = bianca[2]?.trim() || null;
    }
  }
  return out;
}

export const listMolinoOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MolinoOrderRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data, error } = await supabaseAdmin
      .from("event_bookings")
      .select("*")
      .eq("event_slug", EVENT_SLUG)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((b: any) => {
      const parsed = parseNotes(b.notes);
      return {
        id: b.id,
        created_at: b.created_at,
        full_name: b.full_name,
        email: b.email,
        phone: b.phone,
        guest_count: b.guest_count ?? 0,
        amount_due_cents: b.amount_due_cents ?? 0,
        payment_status: b.payment_status ?? "pending",
        notes: b.notes,
        dietary_notes: b.dietary_notes,
        ...parsed,
      };
    });
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  payment_status: z.enum([
    "pending",
    "confirmed",
    "ready",
    "picked_up",
    "cancelled",
    "paid",
  ]),
});

export const updateMolinoOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { error } = await supabaseAdmin
      .from("event_bookings")
      .update({ payment_status: data.payment_status })
      .eq("id", data.id)
      .eq("event_slug", EVENT_SLUG);
    if (error) throw new Error(error.message);
    return { success: true };
  });
