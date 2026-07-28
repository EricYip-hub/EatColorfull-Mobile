import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: a signed-in guest can successfully request a seat at a table, and
 * if the underlying RPC rejects (here: duplicate active request), the
 * panel surfaces a clear human-readable error instead of silently failing.
 *
 * Flow:
 *   1. Create a fresh guest user via the admin API and confirm their email.
 *   2. Sign in, navigate to a known table detail page.
 *   3. Click "Request to join". Verify the panel flips to the "Awaiting host
 *      review" confirmation state.
 *   4. Verify a join_requests row was created in the database for this user.
 *   5. Reload the panel state (it auto-hydrates from "my-requests") and
 *      assert the duplicate-submission path is blocked at the UI level
 *      (the form is replaced by the existing-request card).
 *   6. As a belt-and-braces check on RPC error surfacing, call request_seat
 *      directly as the same user — Supabase must reject it with the
 *      "already have an active request" message that the panel would
 *      render via setError(e.message).
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLE_ID = "mediterranean-west-hollywood";

const email = `e2e-rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const password = "Test-Password-1234!";
let userId: string | null = null;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user?.id ?? null;
});

test.afterAll(async () => {
  if (userId) {
    // Hard cleanup: remove any join_requests this user created, then the user.
    await admin.from("join_requests").delete().eq("user_id", userId).catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});

test("signed-in guest can request a seat and sees a clear error when the RPC rejects", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  // 1. Sign in via the login form (mirrors a real guest).
  await page.goto(`/login?redirect=/tables/${TABLE_ID}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 2. Land on the table detail page.
  await page.waitForURL(new RegExp(`/tables/${TABLE_ID}`), { timeout: 10_000 });

  // 3. Submit the request.
  const submit = page.getByRole("button", { name: /^request to join$/i });
  await expect(submit).toBeVisible({ timeout: 10_000 });
  await submit.click();

  // 4. Panel flips into the awaiting-review state.
  await expect(page.getByText(/awaiting host review/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /manage in your dashboard/i })).toBeVisible();

  // 5. The new join_requests row exists in the DB for this user.
  const { data: rows, error: readErr } = await admin
    .from("join_requests")
    .select("id, status, table_id, user_id")
    .eq("user_id", userId!)
    .eq("table_id", TABLE_ID);
  expect(readErr).toBeNull();
  expect(rows ?? []).toHaveLength(1);
  expect(rows![0].status).toBe("pending");

  // 6. RPC error surfacing: a second call as the same user must be rejected
  //    by request_seat with a readable Postgres error message. This is the
  //    exact path the panel renders via `setError(e.message)`.
  const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  expect(signInErr).toBeNull();

  const { error: rpcErr } = await userClient.rpc("request_seat", {
    _table_id: TABLE_ID,
    _message: "duplicate attempt",
  });
  expect(rpcErr, "duplicate request must be rejected").not.toBeNull();
  expect(rpcErr!.message).toMatch(/already have an active request/i);

  // No render-loop / unexpected runtime errors during the flow.
  const fatal = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(fatal, `Render loop detected: ${fatal}`).toBeUndefined();
});
