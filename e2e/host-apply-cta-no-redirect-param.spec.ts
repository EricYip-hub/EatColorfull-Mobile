import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: clicking the "Apply to host" CTA on the access-blocked screen at
 * /host/dashboard must navigate cleanly to /host. No `redirect=` query
 * param should appear in any intermediate or final URL — the user is
 * already authenticated and is choosing to navigate, not being gated.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-apply-cta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});

test('guest clicking "Apply to host" goes to /host with no redirect= param', async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  // Track every URL the browser visits to assert no redirect= ever appears
  // around the CTA click.
  const visitedUrls: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visitedUrls.push(frame.url());
  });

  // Sign in via the login gate by visiting /host/dashboard while logged out.
  await page.goto("/host/dashboard", { waitUntil: "networkidle" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");

  // Login redirects back to /host/dashboard; the page renders the blocked view.
  await page.waitForURL((u) => u.pathname === "/host/dashboard", { timeout: 15_000 });
  await expect(page.getByTestId("host-access-blocked")).toBeVisible({ timeout: 15_000 });

  // Sanity: we're on /host/dashboard with no redirect param.
  {
    const u = new URL(page.url());
    expect(u.pathname).toBe("/host/dashboard");
    expect(u.searchParams.get("redirect")).toBeNull();
  }

  // Reset URL log to focus the assertion window on the CTA click.
  visitedUrls.length = 0;

  const applyCta = page
    .getByTestId("host-access-blocked")
    .getByRole("link", { name: /apply to host/i });
  await expect(applyCta).toHaveAttribute("href", "/host");
  await applyCta.click();

  await page.waitForURL((u) => u.pathname === "/host", { timeout: 5000 });

  // Final URL: /host, no redirect param.
  const finalUrl = new URL(page.url());
  expect(finalUrl.pathname).toBe("/host");
  expect(finalUrl.searchParams.get("redirect")).toBeNull();
  expect(finalUrl.search).toBe("");

  // No intermediate URL during the click should have introduced a redirect= param,
  // and no URL should have bounced through /login.
  for (const raw of visitedUrls) {
    const u = new URL(raw);
    expect(
      u.searchParams.get("redirect"),
      `Unexpected redirect= param in ${raw}`,
    ).toBeNull();
    expect(
      /\/login(\?|$|\/)/.test(u.pathname),
      `Unexpected bounce through /login at ${raw}`,
    ).toBe(false);
    expect(
      (u.search.match(/redirect=/g) ?? []).length,
      `Stacked redirect params in ${raw}`,
    ).toBeLessThanOrEqual(0);
  }
});
