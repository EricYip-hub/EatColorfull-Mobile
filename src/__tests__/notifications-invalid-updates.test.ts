/**
 * Integration test: verifies that invalid delivery/seen updates to
 * `public.notifications` are rejected by RLS / row constraints and do NOT
 * produce phantom UPDATE events on the realtime stream.
 *
 * Cases covered:
 *   1. Updating a non-existent notification id (no row) → 0 rows affected,
 *      no realtime UPDATE event fired.
 *   2. User A trying to set delivered_at on User B's notification → blocked
 *      by RLS, no realtime UPDATE event fired on either channel.
 *   3. User A trying to set read_at on User B's notification → same as above.
 *
 * Requires the following env vars (skipped otherwise):
 *   - SUPABASE_URL
 *   - SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { Notification } from "@/lib/notifications";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && ANON && SERVICE);
const d = enabled ? describe : describe.skip;

type TestUser = { id: string; email: string; password: string; client: SupabaseClient };

async function createTestUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `invalid-upd-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = `Pw!${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { id: data.user.id, email, password, client };
}

function listenForUpdates(
  client: SupabaseClient,
  userId: string,
  onEvent: (row: Notification) => void,
): Promise<RealtimeChannel> {
  return new Promise((resolve, reject) => {
    const channel = client
      .channel(`notifications-${userId}-invalid-upd`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => onEvent(payload.new as Notification),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(channel);
        if (status === "CHANNEL_ERROR" || status === "CLOSED") reject(new Error(`subscribe failed: ${status}`));
      });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

d("invalid notification delivery/seen updates are rejected", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;
  let userBNotifId: string;
  let aEvents: Notification[];
  let bEvents: Notification[];
  let channelA: RealtimeChannel;
  let channelB: RealtimeChannel;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    [userA, userB] = await Promise.all([createTestUser(admin, "a"), createTestUser(admin, "b")]);

    // Seed a notification owned by userB.
    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: userB.id,
        kind: "test",
        title: "B's private notification",
        body: "should not be touchable by A",
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("seed insert failed");
    userBNotifId = data.id as string;

    aEvents = [];
    bEvents = [];
    channelA = await listenForUpdates(userA.client, userA.id, (row) => aEvents.push(row));
    channelB = await listenForUpdates(userB.client, userB.id, (row) => bEvents.push(row));
  }, 30_000);

  afterAll(async () => {
    if (channelA) await userA.client.removeChannel(channelA);
    if (channelB) await userB.client.removeChannel(channelB);
    if (userBNotifId) await admin.from("notifications").delete().eq("id", userBNotifId);
    await Promise.all([
      userA?.client.auth.signOut(),
      userB?.client.auth.signOut(),
      userA && admin.auth.admin.deleteUser(userA.id),
      userB && admin.auth.admin.deleteUser(userB.id),
    ]);
  });

  it("updating a non-existent notification row affects 0 rows and emits no realtime event", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const before = aEvents.length + bEvents.length;

    const { data, error } = await userA.client
      .from("notifications")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", fakeId)
      .select();

    // RLS makes the row invisible; the update silently affects 0 rows (no error).
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // Give realtime a moment to (not) deliver anything.
    await sleep(750);
    expect(aEvents.length + bEvents.length).toBe(before);
  }, 15_000);

  it("user A cannot set delivered_at on user B's notification (RLS-blocked, no realtime event)", async () => {
    const before = aEvents.length + bEvents.length;

    const { data, error } = await userA.client
      .from("notifications")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", userBNotifId)
      .select();

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // Confirm the row was not mutated server-side either.
    const { data: row } = await admin.from("notifications").select("delivered_at, read_at").eq("id", userBNotifId).single();
    expect(row?.delivered_at).toBeNull();
    expect(row?.read_at).toBeNull();

    await sleep(750);
    expect(aEvents.length + bEvents.length).toBe(before);
  }, 15_000);

  it("user A cannot set read_at on user B's notification (RLS-blocked, no realtime event)", async () => {
    const before = aEvents.length + bEvents.length;

    const { data, error } = await userA.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", userBNotifId)
      .select();

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: row } = await admin.from("notifications").select("delivered_at, read_at").eq("id", userBNotifId).single();
    expect(row?.read_at).toBeNull();

    await sleep(750);
    expect(aEvents.length + bEvents.length).toBe(before);
  }, 15_000);
});

if (!enabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[notifications-invalid-updates] Skipped: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run.",
  );
}
