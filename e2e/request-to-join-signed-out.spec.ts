import { test, expect } from "@playwright/test";

/**
 * E2E: an unauthenticated visitor on a table detail page must NOT be able to
 * silently submit a join request. The Request-to-Join panel should:
 *   1. Render with a "Sign in to request" CTA instead of "Request to join".
 *   2. On click, redirect to /login with a safe single redirect param back
 *      to the same table page (so post-login the user lands on the panel).
 *   3. Never create a join_requests row (the underlying RPC is blocked by
 *      RLS for anon, but the UI must short-circuit before that).
 */

const TABLE_ID = "mediterranean-west-hollywood";

test("signed-out visitor sees a sign-in prompt instead of submitting a join request", async ({ page, context }) => {
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

  await page.goto(`/tables/${TABLE_ID}`, { waitUntil: "domcontentloaded" });

  // 1. CTA reflects signed-out state.
  const signInCta = page.getByRole("button", { name: /sign in to request/i });
  await expect(signInCta).toBeVisible({ timeout: 10_000 });

  // Defensive: the authed-only label must NOT be the visible button.
  await expect(
    page.getByRole("button", { name: /^request to join$/i }),
  ).toHaveCount(0);

  // Track any RPC attempts to request_seat — there must be none.
  const rpcCalls: string[] = [];
  page.on("request", (req) => {
    if (/\/rest\/v1\/rpc\/request_seat/.test(req.url())) {
      rpcCalls.push(req.url());
    }
  });

  // 2. Click should redirect to /login?redirect=/tables/<id>, no RPC fired.
  await signInCta.click();
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("redirect")).toBe(`/tables/${TABLE_ID}`);
  expect((url.search.match(/redirect=/g) ?? []).length).toBe(1);

  // 3. No request_seat RPC was issued from the anonymous session.
  expect(rpcCalls, `Unexpected RPC calls: ${rpcCalls.join(", ")}`).toHaveLength(0);

  // The login form is visible on the destination page.
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // No render-loop / unexpected runtime errors.
  const fatal = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(fatal, `Render loop detected: ${fatal}`).toBeUndefined();
});
