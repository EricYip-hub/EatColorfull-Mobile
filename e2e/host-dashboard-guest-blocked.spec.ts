import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: a logged-in NON-host guest who reaches /host/dashboard must be
 * blocked with an explanatory screen + an "Apply to host" CTA — not silently
 * bounced and not allowed to see the host-only sections.
 *
 * Flow:
 *   1. Hit /host/dashboard logged out → auth gate redirects to /login with
 *      a safe single redirect param.
 *   2. Sign in as a guest user (no host role).
 *   3. Land on /host/dashboard with the access-blocked screen rendered.
 *   4. The host-only "Requests at your tables" heading must NOT appear.
 *   5. The "Apply to host" CTA links to /host.
 *   6. No render-loop errors anywhere in the flow.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-guest-host-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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
  // NOTE: intentionally NOT granting the `host` role — this user is a guest.
});

test.afterAll(async () => {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {
      /* best-effort cleanup */
    });
  }
});

test("guest signing in from /host/dashboard sees an access-blocked screen, not the host UI", async ({ page, context }) => {
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

  // 1. Logged-out visit → safe redirect to /login.
  await page.goto("/host/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });
  const preLoginUrl = new URL(page.url());
  expect(preLoginUrl.pathname).toBe("/login");
  expect(preLoginUrl.searchParams.get("redirect")).toBe("/host/dashboard");
  expect((preLoginUrl.search.match(/redirect=/g) ?? []).length).toBe(1);

  // 2. Sign in as the guest user.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 3. Wait for the post-login navigation to settle on /host/dashboard.
  // The page itself renders the blocked view — it does NOT redirect away.
  await page.waitForURL((url) => url.pathname === "/host/dashboard", { timeout: 10_000 });
  // Give the auth provider a beat to hydrate roles so the blocked view
  // (rather than the loading state) is what we assert against.
  await expect(page.getByTestId("host-access-blocked")).toBeVisible({ timeout: 5000 });

  expect(new URL(page.url()).pathname).toBe("/host/dashboard");

  // 4. Host-only sections must NOT be on screen.
  await expect(
    page.getByRole("heading", { name: /requests at your tables/i }),
  ).toHaveCount(0);

  // 5. Blocked screen content + working CTA.
  await expect(
    page.getByRole("heading", { name: /this is the host dashboard/i }),
  ).toBeVisible();
  await expect(page.getByText(/apply to host a colorfull table/i)).toBeVisible();

  const applyCta = page
    .getByTestId("host-access-blocked")
    .getByRole("link", { name: /apply to host/i });
  await expect(applyCta).toBeVisible();
  await applyCta.click();
  await page.waitForURL((u) => u.pathname === "/host", { timeout: 5000 });
  expect(new URL(page.url()).pathname).toBe("/host");

  // 6. No render-loop errors.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
