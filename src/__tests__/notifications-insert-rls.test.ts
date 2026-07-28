/**
 * Integration test: verifies that authenticated users cannot directly INSERT
 * into `public.notifications`. The table is meant to be written only by
 * server-side triggers / service role — clients should be locked out.
 *
 * Requires the following env vars (skipped otherwise):
 *   - SUPABASE_URL
 *   - SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && ANON && SERVICE);
const d = enabled ? describe : describe.skip;

async function createTestUser(admin: SupabaseClient, label: string) {
  const email = `notif-insert-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = `Pw!${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  return { id: data.user.id, email, client };
}

d("notifications INSERT is locked down", () => {
  let admin: SupabaseClient;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    [userA, userB] = await Promise.all([createTestUser(admin, "a"), createTestUser(admin, "b")]);
  }, 30_000);

  afterAll(async () => {
    await Promise.all([
      userA?.client.auth.signOut(),
      userB?.client.auth.signOut(),
      userA && admin.auth.admin.deleteUser(userA.id),
      userB && admin.auth.admin.deleteUser(userB.id),
    ]);
  });

  it("rejects user A inserting a notification for themselves", async () => {
    const { data, error } = await userA.client
      .from("notifications")
      .insert({ user_id: userA.id, kind: "test", title: "self insert" })
      .select();
    // Either the insert errors (RLS rejection) or returns no row.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  }, 15_000);

  it("rejects user A inserting a notification for user B", async () => {
    const { data, error } = await userA.client
      .from("notifications")
      .insert({ user_id: userB.id, kind: "test", title: "cross-user insert" })
      .select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  }, 15_000);

  it("service role CAN insert (sanity check — used by triggers)", async () => {
    const { data, error } = await admin
      .from("notifications")
      .insert({ user_id: userA.id, kind: "test", title: "service-role insert" })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    if (data?.id) await admin.from("notifications").delete().eq("id", data.id);
  }, 15_000);
});

if (!enabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[notifications-insert-rls] Skipped: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run.",
  );
}
