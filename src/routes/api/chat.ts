import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { TASTEMAKERS } from "@/lib/tastemakers-data";
import { TABLES, ARCHETYPES } from "@/lib/tables-data";

type ChatRequestBody = { messages?: unknown };

function extractText(msg: UIMessage): string {
  if (!msg || !Array.isArray(msg.parts)) return "";
  return msg.parts
    .map((p: any) => (p?.type === "text" ? String(p.text ?? "") : ""))
    .join("");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured (supabase)", { status: 500 });
        }
        if (!LOVABLE_API_KEY) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub as string | undefined;
        if (claimsError || !userId) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const uiMessages = messages as UIMessage[];

        // Persist the latest user message immediately
        const last = uiMessages[uiMessages.length - 1];
        if (last?.role === "user") {
          const text = extractText(last);
          if (text.trim().length > 0) {
            await supabase.from("chat_messages").insert({
              user_id: userId,
              role: "user",
              content: text,
            });
          }
        }

        // Load user context + lookup tables to resolve UUIDs to human names.
        const [ordersRes, favoritesRes, joinsRes, chefProfilesRes, listingsRes] =
          await Promise.all([
            supabase
              .from("chef_orders")
              .select(
                "id,status,payment_status,quantity,total_cents,created_at,listing_id,chef_id",
              )
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("chef_favorites")
              .select("chef_id,created_at")
              .order("created_at", { ascending: false })
              .limit(20),
            supabase
              .from("join_requests")
              .select("id,table_id,status,created_at,decided_at,paid_at")
              .order("created_at", { ascending: false })
              .limit(10),
            supabase.from("chef_profiles").select("id,tastemaker_id"),
            supabase.from("chef_listings").select("id,title,chef_id,slug,kind,price_cents"),
          ]);

        // Build lookup: chef_profiles.id (UUID) -> tastemaker name
        const tastemakerById = new Map(TASTEMAKERS.map((t) => [t.id, t]));
        const tableById = new Map(TABLES.map((t) => [t.id, t]));
        const chefProfileToName = new Map<string, string>();
        for (const cp of chefProfilesRes.data ?? []) {
          const tm = cp.tastemaker_id ? tastemakerById.get(cp.tastemaker_id) : null;
          if (tm) chefProfileToName.set(cp.id, tm.name);
        }
        const listingById = new Map(
          (listingsRes.data ?? []).map((l) => [l.id, l] as const),
        );

        const nameFmt = (fallback: string) => (id: string | null | undefined) =>
          (id && chefProfileToName.get(id)) || fallback;
        const chefName = nameFmt("Unknown chef");

        const userContext = {
          recent_orders: (ordersRes.data ?? []).map((o) => {
            const listing = o.listing_id ? listingById.get(o.listing_id) : null;
            return {
              order_id: o.id,
              chef: chefName(o.chef_id),
              listing_title: listing?.title ?? "Unknown listing",
              listing_slug: listing?.slug ?? null,
              quantity: o.quantity,
              total_usd: (o.total_cents ?? 0) / 100,
              status: o.status,
              payment_status: o.payment_status,
              placed_at: o.created_at,
              order_link: `/orders/${o.id}`,
            };
          }),
          favorited_chefs: (favoritesRes.data ?? []).map((f) => ({
            chef: chefName(f.chef_id),
            favorited_at: f.created_at,
          })),
          table_reservations: (joinsRes.data ?? []).map((j) => {
            const t = j.table_id ? tableById.get(j.table_id) : null;
            return {
              request_id: j.id,
              table_title: t?.title ?? "Unknown table",
              host: t?.hostName ?? null,
              date: t ? `${t.date} · ${t.time}` : null,
              neighborhood: t?.neighborhood ?? null,
              status: j.status,
              paid_at: j.paid_at,
              decided_at: j.decided_at,
              requested_at: j.created_at,
              table_link: t ? `/tables/${t.id}` : null,
            };
          }),
        };

        // Public catalog Chefbot can reference directly (names + links).
        const tastemakersCatalog = TASTEMAKERS.map((t) => ({
          name: t.name,
          city: t.city,
          neighborhood: t.neighborhood,
          cuisine: t.cuisineFocus,
          short_bio: t.shortBio,
          profile_link: `/tastemakers/${t.id}`,
        }));
        const tablesCatalog = TABLES.map((t) => ({
          title: t.title,
          archetype: t.archetype,
          host: t.hostName,
          neighborhood: t.neighborhood,
          when: `${t.date} · ${t.time}`,
          seats: `${t.seatsRemaining}/${t.seatsTotal} remaining`,
          price_usd: t.price,
          mood: t.moodTags,
          link: `/tables/${t.id}`,
        }));

        const systemPrompt = `You are Chefbot — a friendly, warm in-app assistant for Colorfull. Always refer to yourself as "Chefbot".
Colorfull is a curated communal dining platform: guests discover intimate hosted "tables" (private dinners), browse Tastemakers (chefs) and their meal-prep offerings, and reserve seats.

# How to answer
1. ALWAYS answer from the Colorfull data provided below — the Tastemakers catalog, Tables catalog, and the user's own data. Do NOT invent chefs, tables, hosts, prices, dates, addresses, or phone numbers.
2. NEVER show raw IDs or UUIDs (like "chef_id: 8f2a-…" or "listing_id"). Always resolve to the human name/title provided.
3. Structure every non-trivial reply with markdown:
   - A short 1–2 sentence intro answering the question directly.
   - A bulleted or numbered list when returning multiple items (chefs, tables, orders).
   - For each item, show the **name/title in bold**, then key details (host, neighborhood, date, price), then a markdown link to the page.
   - End with a short next-step suggestion (e.g. "Want me to filter for weekend tables?").
4. If the answer is not in the data, say so honestly and point them to the relevant section or the contact info below.
5. Keep it warm and concise — expand only when the user asks for more detail.

# Key app sections
- Discover tables: [/discover](/discover)
- Browse Tastemakers (chefs): [/tastemakers](/tastemakers)
- Meal-prep plans: [/meal-prep](/meal-prep)
- How it works: [/how-it-works](/how-it-works)
- Their saved favorites & orders: [/favorites](/favorites)
- Their dashboard (reservations, notifications): [/dashboard](/dashboard)
- Account & settings: [/settings](/settings)
- Apply to host: [/host](/host)
- Community standards: [/community](/community)

# Colorfull contact info (share when users ask how to reach the company)
- Address: 6230 Wilshire Blvd, Suite 152, Los Angeles, CA 90048
- Email: info@eatcolorfull.com
- Phone: 310-428-3118

# Table archetypes
${ARCHETYPES.join(", ")}

# Tastemakers catalog (use these names — never IDs)
${JSON.stringify(tastemakersCatalog, null, 2)}

# Tables catalog (use these titles + links — never IDs)
${JSON.stringify(tablesCatalog, null, 2)}

# The user's own data (already resolved to names; may be empty)
${JSON.stringify(userContext, null, 2)}`;

        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(uiMessages),
          onFinish: async ({ text }) => {
            if (text && text.trim().length > 0) {
              await supabase.from("chat_messages").insert({
                user_id: userId,
                role: "assistant",
                content: text,
              });
            }
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
      },
    },
  },
});
