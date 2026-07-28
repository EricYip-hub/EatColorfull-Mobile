import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: a signed-in host should be routed to /host/dashboard, not the guest
 * /dashboard view.
 *
 *   - Visiting /dashboard as a host redirects to /host/dashboard.
 *   - /host/dashboard renders the host-only sections (heading, filter tabs).
 *
 * Uses an ephemeral user created via the service-role admin client, with the
 * `host` role granted before login.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-host-routing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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

  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId!, role: "host" });
  if (roleErr) throw roleErr;
});

test.afterAll(async () => {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {
      /* best-effort cleanup */
    });
  }
});

test("host is routed away from /dashboard to /host/dashboard with host-only sections", async ({ page, context }) => {
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

  // 1. Hit /dashboard logged-out → auth gate sends to /login with safe param.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  // 2. Sign in as the host user.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 3. Post-login redirect target was /dashboard, but as a host we get bounced
  // to /host/dashboard. Wait for that final pathname.
  await page.waitForURL((url) => url.pathname === "/host/dashboard", {
    timeout: 10_000,
  });

  const url = new URL(page.url());
  expect(url.pathname).toBe("/host/dashboard");
  // No accumulating redirect chain on the way in.
  expect(url.href).not.toMatch(/redirect=.*redirect=/);

  // 4. /host/dashboard renders host-only sections.
  await expect(
    page.getByRole("heading", { name: /requests at your tables/i }),
  ).toBeVisible();
  // Filter tabs only exist on the host dashboard, not on the guest dashboard.
  await expect(page.getByRole("button", { name: /^pending$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^approved$/i })).toBeVisible();
  // The guest dashboard's "Your tables." headline must NOT be on the page.
  await expect(page.getByRole("heading", { name: /^your tables\.?$/i })).toHaveCount(0);

  // 5. Navigating in-app to /dashboard while signed in as host also bounces
  // to /host/dashboard. We use router-level navigation (history.pushState +
  // a click on a Link) rather than page.goto, because the test's init script
  // wipes localStorage on every full page load.
  await page.evaluate(() => {
    window.history.pushState({}, "", "/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForURL((u) => u.pathname === "/host/dashboard", { timeout: 5000 });
  expect(new URL(page.url()).pathname).toBe("/host/dashboard");

  // 6. No render-loop errors anywhere in the flow.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
