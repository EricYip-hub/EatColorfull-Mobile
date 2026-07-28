import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactRow = {
  source:
    | "event_booking"
    | "host_application"
    | "join_request"
    | "meal_prep_request"
    | "meal_plan_request"
    | "profile"
    | "form_submission";
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  extra: Record<string, string | number | boolean | null>;
};

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

export const listAllContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const [
      bookings,
      hostApps,
      joinReqs,
      mealPrep,
      mealPlan,
      profiles,
      suppressed,
      formSubs,
    ] = await Promise.all([
      supabaseAdmin.from("event_bookings").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("host_applications").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("join_requests").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("chef_meal_prep_requests").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("meal_plan_requests").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("suppressed_emails").select("email"),
      supabaseAdmin.from("form_submissions").select("*").order("created_at", { ascending: false }),
    ]);

    const suppressedSet = new Set(
      (suppressed.data ?? []).map((r: { email: string }) => r.email.toLowerCase()),
    );

    // Profiles need email lookup via auth admin
    const profileRows = profiles.data ?? [];
    const profileEmails = new Map<string, string | null>();
    await Promise.all(
      profileRows.map(async (p: { id: string }) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(p.id);
          profileEmails.set(p.id, data.user?.email ?? null);
        } catch {
          profileEmails.set(p.id, null);
        }
      }),
    );

    // Join_request user emails
    const joinUserIds = Array.from(new Set((joinReqs.data ?? []).map((r: any) => r.user_id)));
    const joinEmails = new Map<string, string | null>();
    await Promise.all(
      joinUserIds.map(async (uid) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(uid as string);
          joinEmails.set(uid as string, data.user?.email ?? null);
        } catch {
          joinEmails.set(uid as string, null);
        }
      }),
    );

    const rows: ContactRow[] = [];

    for (const b of bookings.data ?? []) {
      rows.push({
        source: "event_booking",
        id: b.id,
        name: b.full_name,
        email: b.email,
        phone: b.phone,
        location: b.event_slug,
        notes: [b.dietary_notes, b.notes].filter(Boolean).join(" · ") || null,
        created_at: b.created_at,
        extra: {
          guests: b.guest_count,
          age: b.age,
          payment_status: b.payment_status,
          coupon: b.coupon_code,
          price_cents: b.price_cents,
        },
      });
    }

    for (const a of hostApps.data ?? []) {
      rows.push({
        source: "host_application",
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        location: a.location,
        notes: a.motivation,
        created_at: a.created_at,
        extra: {
          instagram: a.instagram,
          status: a.status,
          experience_type: a.experience_type,
          guest_count: a.guest_count,
        },
      });
    }

    for (const j of joinReqs.data ?? []) {
      rows.push({
        source: "join_request",
        id: j.id,
        name: null,
        email: joinEmails.get(j.user_id) ?? null,
        phone: null,
        location: j.table_id,
        notes: j.message,
        created_at: j.created_at,
        extra: { status: j.status, host_note: j.host_note },
      });
    }

    for (const m of mealPrep.data ?? []) {
      rows.push({
        source: "meal_prep_request",
        id: m.id,
        name: m.full_name,
        email: m.email,
        phone: m.phone,
        location: m.city_state,
        notes: [m.dietary_restrictions, m.food_allergies, m.additional_notes]
          .filter(Boolean)
          .join(" · ") || null,
        created_at: m.created_at,
        extra: {
          chef_slug: m.chef_slug,
          guests: m.guest_count,
          requested_date: m.requested_date,
          service_type: m.service_type,
          status: m.status,
        },
      });
    }

    for (const p of mealPlan.data ?? []) {
      rows.push({
        source: "meal_plan_request",
        id: p.id,
        name: null,
        email: profileEmails.get(p.user_id) ?? null,
        phone: null,
        location: p.table_id,
        notes: [p.wellness_goals, p.dietary_restrictions, p.foods_to_avoid]
          .filter(Boolean)
          .join(" · ") || null,
        created_at: p.created_at,
        extra: { plan_type: p.plan_type, days: p.days_count, status: p.status },
      });
    }

    for (const pr of profileRows) {
      rows.push({
        source: "profile",
        id: pr.id,
        name: pr.display_name,
        email: profileEmails.get(pr.id) ?? null,
        phone: null,
        location: null,
        notes: pr.dietary_notes ?? pr.bio,
        created_at: pr.created_at,
        extra: {},
      });
    }

    for (const f of formSubs.data ?? []) {
      const payload = (f.payload ?? {}) as Record<string, string | number | boolean | null>;
      rows.push({
        source: "form_submission",
        id: f.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        location: f.location,
        notes: f.notes,
        created_at: f.created_at,
        extra: { form_source: f.source, ...payload },
      });
    }


    // Mark suppressed
    return rows.map((r) => ({
      ...r,
      extra: {
        ...r.extra,
        unsubscribed: r.email ? suppressedSet.has(r.email.toLowerCase()) : false,
      },
    }));
  });
