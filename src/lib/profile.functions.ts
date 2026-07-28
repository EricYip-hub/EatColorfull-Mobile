import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const updateSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  date_of_birth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, date_of_birth, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { profile: data, email: context.claims?.email ?? null };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        date_of_birth: data.date_of_birth || null,
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
