import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function getActorEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

async function writeAudit(input: {
  entity_type: "host_application" | "join_request";
  entity_id: string;
  from_status: string | null;
  to_status: string;
  note?: string | null;
  actor_user_id: string;
}) {
  const actor_email = await getActorEmail(input.actor_user_id);
  await supabaseAdmin.from("admin_audit_log").insert({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    from_status: input.from_status,
    to_status: input.to_status,
    note: input.note ?? null,
    actor_user_id: input.actor_user_id,
    actor_email,
  });
}

export type AuditEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  created_at: string;
};

export const listAuditTrail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      entity_type: z.enum(["host_application", "join_request"]),
      entity_id: z.string().uuid(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as AuditEntry[];
  });

export const exportAuditHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      entity_type: z.enum(["all", "host_application", "join_request"]).default("all"),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data.entity_type !== "all") q = q.eq("entity_type", data.entity_type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const hostIds = Array.from(new Set((rows ?? []).filter((r) => r.entity_type === "host_application").map((r) => r.entity_id)));
    const reqIds = Array.from(new Set((rows ?? []).filter((r) => r.entity_type === "join_request").map((r) => r.entity_id)));

    let hostNames: Record<string, string> = {};
    let guestNames: Record<string, string> = {};

    if (hostIds.length) {
      const { data: hosts } = await supabaseAdmin
        .from("host_applications")
        .select("id, name")
        .in("id", hostIds);
      hostNames = Object.fromEntries((hosts ?? []).map((h) => [h.id as string, h.name as string]));
    }

    if (reqIds.length) {
      const { data: reqs } = await supabaseAdmin
        .from("join_requests")
        .select("id, user_id")
        .in("id", reqIds);
      const userIds = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        const names = Object.fromEntries((profs ?? []).map((p) => [p.id as string, (p.display_name as string) ?? ""]));
        for (const r of reqs ?? []) {
          guestNames[r.id as string] = names[r.user_id as string] ?? "";
        }
      }
    }

    return (rows ?? []).map((r) => ({
      id: r.id as string,
      entity_type: r.entity_type as string,
      entity_id: r.entity_id as string,
      entity_name: r.entity_type === "host_application" ? (hostNames[r.entity_id as string] ?? "") : (guestNames[r.entity_id as string] ?? ""),
      from_status: (r.from_status as string) ?? "",
      to_status: r.to_status as string,
      actor_email: (r.actor_email as string) ?? "",
      note: (r.note as string) ?? "",
      created_at: r.created_at as string,
    }));
  });

export type ComplianceDoc = {
  key: string;
  label: string;
  path: string;
  filename: string;
  size: number;
  mime: string;
};

export type HostApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  instagram: string | null;
  experience_type: string;
  background: string;
  sample_menu: string;
  guest_count: number;
  location_status: string;
  motivation: string;
  food_prep_location: string | null;
  county_city: string | null;
  permit_number: string | null;
  permit_agency: string | null;
  permit_expiration: string | null;
  emergency_contact: string | null;
  max_capacity: number | null;
  compliance_docs: ComplianceDoc[];
};

export type JoinRequestRow = {
  id: string;
  created_at: string;
  decided_at: string | null;
  status: string;
  table_id: string;
  user_id: string;
  message: string | null;
  host_note: string | null;
  guest_name: string | null;
};

export const listHostApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("host_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as HostApplicationRow[];
  });

const updateAppInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "reviewing", "approved", "declined", "archived"]),
});
export const updateHostApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => updateAppInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prev } = await supabaseAdmin
      .from("host_applications")
      .select("status, email")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("host_applications")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    let hostGranted = false;
    let hostUserMissing = false;
    let grantedEmail: string | null = null;

    if (data.status === "approved" && prev?.email) {
      const email = (prev.email as string).toLowerCase();
      grantedEmail = email;
      let foundUserId: string | null = null;
      for (let page = 1; page <= 5 && !foundUserId; page++) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (listErr) break;
        const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (match) foundUserId = match.id;
        if (list.users.length < 200) break;
      }
      if (foundUserId) {
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: foundUserId, role: "host" }, { onConflict: "user_id,role" });
        if (!roleErr) hostGranted = true;

        // Mirror the approval email as an in-app notification.
        await supabaseAdmin.from("notifications").insert({
          user_id: foundUserId,
          kind: "host_application_approved",
          title: "You're approved to host with Colorfull",
          body: "Welcome to the table. Head to your host dashboard to publish your first listing.",
          link: "/host/dashboard",
        });
      } else {
        hostUserMissing = true;
      }
    }

    await writeAudit({
      entity_type: "host_application",
      entity_id: data.id,
      from_status: (prev?.status as string) ?? null,
      to_status: data.status,
      note: hostGranted
        ? `Host role granted to ${grantedEmail}`
        : hostUserMissing
          ? `Approved, but no account exists yet for ${grantedEmail}`
          : null,
      actor_user_id: context.userId,
    });
    return { ok: true, hostGranted, hostUserMissing, email: grantedEmail };
  });


export const listJoinRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("join_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let names: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      names = Object.fromEntries(
        (profs ?? []).map((p) => [p.id as string, (p.display_name as string) ?? ""]),
      );
    }
    return rows.map((r) => ({
      ...r,
      guest_name: names[r.user_id] ?? null,
    })) as JoinRequestRow[];
  });

const updateReqInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "declined", "paid", "cancelled", "waitlisted"]),
  host_note: z.string().max(1000).optional(),
});
export const updateJoinRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => updateReqInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prev } = await supabaseAdmin
      .from("join_requests")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("join_requests")
      .update({
        status: data.status,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
        ...(data.host_note !== undefined ? { host_note: data.host_note } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit({
      entity_type: "join_request",
      entity_id: data.id,
      from_status: (prev?.status as string) ?? null,
      to_status: data.status,
      note: data.host_note ?? null,
      actor_user_id: context.userId,
    });
    return { ok: true };
  });

const signDocInput = z.object({
  path: z.string().min(1).max(500),
});
export const getHostComplianceDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => signDocInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.path.startsWith("applications/")) {
      throw new Error("Invalid path");
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("host-compliance-docs")
      .createSignedUrl(data.path, 300);
    if (error || !signed) throw new Error(error?.message ?? "Failed to sign URL");
    return { url: signed.signedUrl };
  });
