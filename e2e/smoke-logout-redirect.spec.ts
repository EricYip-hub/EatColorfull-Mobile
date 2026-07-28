import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Smoke: after a real UI sign-out, visiting a protected page must redirect
 * back to /login (no stale-session leak). Uses a real Supabase session
 * created via the admin client, signs in through the login form, signs out
 * through the Settings page's Sign out button, then re-visits /dashboard.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE,
  "auth smoke requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars",
);

const admin = createClient(SUPABASE_URL ?? "", SERVICE_ROLE ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-logout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const password = "Smoke-Logout-Password-1234!";
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
      /* best-effort */
    });
  }
});

test("smoke: protected page redirects to /login after real sign-out", async ({ page, context }) => {
  // 1. Start logged out.
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  // 2. Sign in through the real login form.
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 3. Confirm we have an authenticated session on a protected page.
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /your tables/i })).toBeVisible({
    timeout: 10_000,
  });

  // 4. Sign out through the real UI (Settings → Sign out).
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/settings", { timeout: 10_000 });
  await page.getByRole("button", { name: /sign out/i }).click();

  // Wait for the session to clear (root listener invalidates and the
  // _authenticated layout will bounce the next protected request).
  await page.waitForFunction(
    () => {
      // Supabase persists the session under sb-<ref>-auth-token in localStorage.
      const keys = Object.keys(window.localStorage);
      return !keys.some((k) => /sb-.*-auth-token/.test(k));
    },
    { timeout: 10_000 },
  );

  // 5. Re-visit the protected page → must redirect to /login with a safe
  //    redirect-back param pointing at /dashboard.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 10_000 });

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");

  const redirectParam = url.searchParams.get("redirect");
  if (redirectParam !== null) {
    expect(redirectParam.startsWith("/login")).toBe(false);
    expect(redirectParam).toContain("/dashboard");
  }
  expect(
    (url.search.match(/redirect=/g) ?? []).length,
    `accumulating redirect chain detected: ${url.search}`,
  ).toBeLessThanOrEqual(1);

  // Authenticated content must NOT be visible after logout.
  await expect(
    page.getByRole("heading", { name: /your tables/i }),
  ).toHaveCount(0);
});
