import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const menuItemSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().min(0).max(10000).optional(),
  description: z.string().max(500).optional(),
});

const createSchema = z.object({
  title: z.string().min(2).max(200),
  chefName: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, dashes"),
  description: z.string().max(4000).optional(),
  eventDate: z.string().max(100).optional(),
  pickupAddress: z.string().max(500).optional(),
  coverUrl: z.string().url().max(1000).optional().or(z.literal("")),
  menu: z.array(menuItemSchema).max(40).optional(),
});

export const createChefEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      owner_id: userId,
      slug: data.slug,
      title: data.title,
      chef_name: data.chefName ?? null,
      description: data.description ?? null,
      event_date: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      pickup_address: data.pickupAddress ?? null,
      cover_url: data.coverUrl || null,
      menu: data.menu ?? [],
      status: "published",
    };
    const { data: row, error } = await supabase
      .from("chef_events")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("That link is already taken. Try another slug.");
      }
      throw new Error(error.message);
    }
    return row;
  });

export const listMyChefEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chef_events")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getChefEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("chef_events")
      .select(
        "id, slug, title, chef_name, description, event_date, pickup_address, cover_url, menu, status",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getEventInviteStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error: evErr } = await supabase
      .from("chef_events")
      .select("id, slug, owner_id")
      .eq("id", data.eventId)
      .single();
    if (evErr || !ev) throw new Error("Event not found");
    if (ev.owner_id !== userId) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("client_events")
      .select("event, props")
      .in("event", ["invite_view", "invite_copy", "invite_share", "invite_rsvp_click"])
      .or(`props->>slug.eq.${ev.slug},props->>eventId.eq.${ev.id}`);
    if (error) throw new Error(error.message);

    let views = 0,
      copies = 0,
      shares = 0,
      rsvpClicks = 0;
    for (const r of rows ?? []) {
      switch (r.event) {
        case "invite_view":
          views++;
          break;
        case "invite_copy":
          copies++;
          break;
        case "invite_share":
          shares++;
          break;
        case "invite_rsvp_click":
          rsvpClicks++;
          break;
      }
    }
    return { views, copies, shares, rsvpClicks };
  });

export const generateEventInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        tone: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error } = await supabase
      .from("chef_events")
      .select("*")
      .eq("id", data.eventId)
      .single();
    if (error || !ev) throw new Error("Event not found");
    if (ev.owner_id !== userId) throw new Error("Not authorized");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const url = `https://eatcolorfull.com/e/${ev.slug}`;
    const dateLabel = ev.event_date
      ? new Date(ev.event_date).toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "TBD";
    const menuList = Array.isArray(ev.menu)
      ? (ev.menu as any[])
          .map((m) =>
            `- ${m.name}${typeof m.price === "number" ? ` ($${m.price})` : ""}`,
          )
          .join("\n")
      : "";

    const system =
      "You are a copywriter for indie pop-up dinners. Write warm, playful, urgent invites that feel personal — never corporate. Use 1-2 tasteful emojis max. Always end with the booking link.";
    const userPrompt = `Write promo copy for this pop-up:

Title: ${ev.title}
Chef: ${ev.chef_name ?? "the chef"}
When: ${dateLabel}
Where: ${ev.pickup_address ?? "details with RSVP"}
Menu:\n${menuList}
Description: ${ev.description ?? ""}
Booking link: ${url}
Tone hint: ${data.tone ?? "playful, urgent, friends-only vibe"}

Return STRICT JSON with two fields:
- "invite": a 3-5 sentence invitation suitable for Instagram caption or email body. Include the link.
- "sms": a single SMS-length message (under 300 chars) with the link. Punchy hook + link.

Return ONLY JSON, no markdown fences.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limited — try again in a minute.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { invite?: string; sms?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { invite: content, sms: `${ev.title} — ${url}` };
    }
    return {
      invite: parsed.invite ?? "",
      sms: parsed.sms ?? `${ev.title} — ${url}`,
      url,
    };
  });
