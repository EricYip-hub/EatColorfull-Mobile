import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Vanity URL: /chef/$handle → resolves to /chefs/$chefId
 * Uses chef_profiles.tastemaker_id as the public handle.
 */
export const Route = createFileRoute("/chef/$handle")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase
      .from("chef_profiles")
      .select("id")
      .eq("tastemaker_id", params.handle)
      .maybeSingle();
    if (!data) {
      throw redirect({ to: "/meal-prep" });
    }
    throw redirect({ to: "/chefs/$chefId", params: { chefId: data.id } });
  },
  component: () => null,
});
