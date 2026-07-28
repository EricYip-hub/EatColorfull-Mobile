import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: After being redirected to /login from an authenticated route,
 * signing in must land the user on the ORIGINALLY requested page —
 * and the resulting URL must not contain any stacked `redirect=` chain.
 *
 * Setup creates an ephemeral confirmed user via the service-role admin
 * client, then deletes it on teardown.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-redirect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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
    await admin.auth.admin.deleteUser(userId).catch(() => {
      /* best-effort cleanup */
    });
  }
});

test("login after safe /login redirect lands on originally requested page", async ({ page, context }) => {
  // Start logged out.
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  // 1. Hit a protected route → expect safe redirect to /login.
  const target = "/bring-this-home";
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  const preLoginUrl = new URL(page.url());
  expect(preLoginUrl.pathname).toBe("/login");
  // Sanity: redirect param is the originally requested route, not /login.
  const redirectParam = preLoginUrl.searchParams.get("redirect");
  expect(redirectParam).toBe(target);

  // 2. Fill the sign-in form (labels aren't htmlFor-linked, target by type).
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 3. Land on the originally requested page (or the closest matching
  // post-login route the app routes the user to).
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 10_000 });

  const postLoginUrl = new URL(page.url());
  expect(postLoginUrl.pathname).toBe(target);

  // 4. No accumulating redirect chain anywhere in the final URL.
  const occurrences = (postLoginUrl.search.match(/redirect=/g) ?? []).length;
  expect(
    occurrences,
    `accumulating redirect chain after login: ${postLoginUrl.search}`,
  ).toBe(0);
  expect(postLoginUrl.href).not.toMatch(/redirect=.*redirect=/);
});
