/**
 * Integration test: verifies notification delivery status transitions
 * (sent → delivered → seen) propagate correctly over the realtime stream
 * and that `deliveryStatus()` reflects each transition.
 *
 * Requires the following env vars (skipped otherwise):
 *   - SUPABASE_URL
 *   - SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *            SUPABASE_PUBLISHABLE_KEY=... bunx vitest run \
 *            src/__tests__/notifications-delivery-status.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import { deliveryStatus, type Notification } from "@/lib/notifications";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && ANON && SERVICE);
const d = enabled ? describe : describe.skip;

type TestUser = { id: string; email: string; password: string; client: SupabaseClient };

async function createTestUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `delivery-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = `Pw!${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { id: data.user.id, email, password, client };
}

/** Subscribe to postgres_changes on notifications for a user; returns a teardown. */
function listenForNotificationEvents(
  client: SupabaseClient,
  userId: string,
  onEvent: (row: Notification, event: "INSERT" | "UPDATE") => void,
): Promise<{ channel: RealtimeChannel }> {
  return new Promise((resolve, reject) => {
    const channel = client
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => onEvent(payload.new as Notification, "INSERT"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => onEvent(payload.new as Notification, "UPDATE"),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resolve({ channel });
        if (status === "CHANNEL_ERROR" || status === "CLOSED") reject(new Error(`subscribe failed: ${status}`));
      });
  });
}

function waitFor<T>(predicate: () => T | undefined, timeoutMs = 5000, intervalMs = 50): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const v = predicate();
      if (v !== undefined) return resolve(v);
      if (Date.now() - start > timeoutMs) return reject(new Error("waitFor timed out"));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

d("notification delivery status transitions over realtime", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    user = await createTestUser(admin, "u");
  }, 30_000);

  afterAll(async () => {
    await user?.client.auth.signOut();
    if (user) await admin.auth.admin.deleteUser(user.id);
  });

  it("emits sent → delivered → seen as the row is acked and read", async () => {
    const events: Array<{ row: Notification; event: "INSERT" | "UPDATE" }> = [];
    const { channel } = await listenForNotificationEvents(user.client, user.id, (row, event) => {
      events.push({ row, event });
    });

    try {
      // 1. Server inserts a notification → status should be "sent" on arrival.
      const { data: inserted, error: insErr } = await admin
        .from("notifications")
        .insert({
          user_id: user.id,
          kind: "test",
          title: "Delivery status test",
          body: "checking sent/delivered/seen",
        })
        .select()
        .single();
      if (insErr || !inserted) throw insErr ?? new Error("insert returned no row");
      const notifId = inserted.id as string;

      const insertEvt = await waitFor(() =>
        events.find((e) => e.event === "INSERT" && e.row.id === notifId),
      );
      expect(deliveryStatus(insertEvt.row)).toBe("sent");
      expect(insertEvt.row.delivered_at).toBeNull();
      expect(insertEvt.row.read_at).toBeNull();

      // 2. Client acks delivery (mirrors NotificationsBell's realtime handler).
      const { error: delErr } = await user.client
        .from("notifications")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", notifId)
        .is("delivered_at", null);
      if (delErr) throw delErr;

      const deliveredEvt = await waitFor(() =>
        events.find(
          (e) => e.event === "UPDATE" && e.row.id === notifId && e.row.delivered_at && !e.row.read_at,
        ),
      );
      expect(deliveryStatus(deliveredEvt.row)).toBe("delivered");

      // 3. Client marks it read → status becomes "seen".
      const { error: readErr } = await user.client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notifId);
      if (readErr) throw readErr;

      const seenEvt = await waitFor(() =>
        events.find((e) => e.event === "UPDATE" && e.row.id === notifId && e.row.read_at),
      );
      expect(deliveryStatus(seenEvt.row)).toBe("seen");

      // Cleanup the row.
      await admin.from("notifications").delete().eq("id", notifId);
    } finally {
      await user.client.removeChannel(channel);
    }
  }, 20_000);

  it("deliveryStatus() helper agrees with row state at each stage", () => {
    expect(deliveryStatus({ delivered_at: null, read_at: null })).toBe("sent");
    expect(deliveryStatus({ delivered_at: new Date().toISOString(), read_at: null })).toBe("delivered");
    expect(deliveryStatus({ delivered_at: new Date().toISOString(), read_at: new Date().toISOString() })).toBe("seen");
    // read_at wins even without delivered_at (defensive).
    expect(deliveryStatus({ delivered_at: null, read_at: new Date().toISOString() })).toBe("seen");
  });
});

if (!enabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[notifications-delivery-status] Skipped: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run.",
  );
}
