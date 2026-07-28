import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E regression: switching repeatedly between /host/dashboard and /dashboard
 * as a signed-in NON-host guest must be stable.
 *
 *   - /host/dashboard renders the access-blocked screen (no redirect, no loop).
 *   - /dashboard renders the guest tables view (no bounce to /host/dashboard).
 *   - Neither URL accumulates `redirect=` query params.
 *   - Neither navigation triggers "Maximum update depth" / "Too many re-renders".
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-guest-switch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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
  // NOTE: no `host` role granted — this user is a guest.
});

test.afterAll(async () => {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {
      /* best-effort cleanup */
    });
  }
});

test("guest switching between /host/dashboard and /dashboard never loops or stacks redirect params", async ({ page }) => {
  // Fresh Playwright context per test starts with no cookies / no storage,
  // so no manual clearing is needed before sign-in.

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  // Track every URL the page ever lands on, so we can assert globally that
  // no intermediate hop ever had a stacked redirect chain.
  const visitedUrls: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visitedUrls.push(frame.url());
  });

  // 1. Sign in as guest. Default post-login target is /dashboard.
  // Wait for the bundle to fully hydrate — otherwise submitting too early
  // can fire before React wires the form's onSubmit handler.
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");
  await page.waitForURL((u) => u.pathname === "/dashboard", { timeout: 10_000 });

  // 2. Bounce between /host/dashboard and /dashboard several times.
  const switchCount = 4;
  for (let i = 0; i < switchCount; i++) {
    // -> /host/dashboard: stays put, shows blocked screen.
    await page.goto("/host/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("host-access-blocked")).toBeVisible({ timeout: 5000 });
    const hostUrl = new URL(page.url());
    expect(hostUrl.pathname).toBe("/host/dashboard");
    expect(
      (hostUrl.search.match(/redirect=/g) ?? []).length,
      `iteration ${i}: redirect chain on /host/dashboard: ${hostUrl.search}`,
    ).toBe(0);
    expect(hostUrl.href).not.toMatch(/redirect=.*redirect=/);
    // Host-only content must NOT render for a guest.
    await expect(
      page.getByRole("heading", { name: /requests at your tables/i }),
    ).toHaveCount(0);

    // -> /dashboard: stays put, shows guest tables view.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /^your tables\.?$/i }),
    ).toBeVisible({ timeout: 5000 });
    const dashUrl = new URL(page.url());
    expect(dashUrl.pathname).toBe("/dashboard");
    expect(
      (dashUrl.search.match(/redirect=/g) ?? []).length,
      `iteration ${i}: redirect chain on /dashboard: ${dashUrl.search}`,
    ).toBe(0);
    expect(dashUrl.href).not.toMatch(/redirect=.*redirect=/);
  }

  // 3. Global assertion: across EVERY URL the browser visited, no stacked
  // redirect chain ever appeared mid-flight. This catches transient bounces
  // like /host/dashboard → /login?redirect=... → /login?redirect=%2Flogin...
  for (const url of visitedUrls) {
    expect(url, `stacked redirect chain mid-flight: ${url}`).not.toMatch(
      /redirect=.*redirect=/,
    );
  }

  // 4. The browser must not have visited /login again after the initial sign-in —
  // any post-login bounce to /login would mean the guard is mis-routing the guest.
  const postLoginVisits = visitedUrls.slice(
    visitedUrls.findIndex((u) => new URL(u).pathname === "/dashboard"),
  );
  const loginRevisits = postLoginVisits.filter(
    (u) => new URL(u).pathname === "/login",
  );
  expect(
    loginRevisits,
    `guest got bounced back to /login after sign-in: ${loginRevisits.join(", ")}`,
  ).toHaveLength(0);

  // 5. No render-loop errors over the entire session.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
