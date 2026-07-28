/**
 * Integration test: verifies the RLS policies on `realtime.messages` correctly
 * scope private notification channel access to the owning user.
 *
 * Requires the following env vars (skipped otherwise):
 *   - SUPABASE_URL
 *   - SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *            SUPABASE_PUBLISHABLE_KEY=... bunx vitest run \
 *            src/__tests__/realtime-notifications-rls.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && ANON && SERVICE);
const d = enabled ? describe : describe.skip;

type TestUser = { id: string; email: string; password: string; client: SupabaseClient };

async function createTestUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `rls-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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

function subscribeAndWait(
  client: SupabaseClient,
  topic: string,
  timeoutMs = 5000,
): Promise<"SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED"> {
  return new Promise((resolve) => {
    const channel = client.channel(topic, { config: { private: true } });
    const timer = setTimeout(() => {
      void client.removeChannel(channel);
      resolve("TIMED_OUT");
    }, timeoutMs);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "CLOSED") {
        clearTimeout(timer);
        void client.removeChannel(channel);
        resolve(status);
      }
    });
  });
}

d("realtime notification channel RLS", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    [userA, userB] = await Promise.all([
      createTestUser(admin, "a"),
      createTestUser(admin, "b"),
    ]);
  }, 30_000);

  afterAll(async () => {
    await Promise.all([
      userA?.client.auth.signOut(),
      userB?.client.auth.signOut(),
      userA && admin.auth.admin.deleteUser(userA.id),
      userB && admin.auth.admin.deleteUser(userB.id),
    ]);
  });

  it("allows a user to subscribe to their own notifications-<uid> channel", async () => {
    const status = await subscribeAndWait(userA.client, `notifications-${userA.id}`);
    expect(status).toBe("SUBSCRIBED");
  }, 15_000);

  it("denies a user subscribing to another user's notifications-<uid> channel", async () => {
    const status = await subscribeAndWait(userA.client, `notifications-${userB.id}`);
    expect(status).not.toBe("SUBSCRIBED");
    expect(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]).toContain(status);
  }, 15_000);

  it("denies an unrelated topic name (e.g. notifications-anything)", async () => {
    const status = await subscribeAndWait(userA.client, "notifications-not-a-real-uid");
    expect(status).not.toBe("SUBSCRIBED");
  }, 15_000);
});

if (!enabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[realtime-notifications-rls] Skipped: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run.",
  );
}
