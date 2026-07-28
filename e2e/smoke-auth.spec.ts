import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Post-deploy auth smoke:
 *   1. /login renders an email + password form.
 *   2. /signup renders an email + password form.
 *   3. Signing in with a seeded user lands on /dashboard (protected) and
 *      renders real authenticated content.
 *
 * Seeds an ephemeral confirmed user via the service-role admin client, then
 * deletes it on teardown. Runs against BASE_URL — works against both the
 * local preview server and the live deploy URL.
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

const email = `e2e-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const password = "Smoke-Test-Password-1234!";
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

async function clearSession(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

test("smoke: /login renders sign-in form", async ({ page, context }) => {
  await clearSession(page, context);
  const resp = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("smoke: /signup renders signup form", async ({ page, context }) => {
  await clearSession(page, context);
  const resp = await page.goto("/signup", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("smoke: sign-in lands on /dashboard with valid session", async ({ page, context }) => {
  await clearSession(page, context);

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  // Hitting a protected route while logged out should bounce to /login.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  // Sign in.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Should land on the protected /dashboard (not /login).
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 });
  expect(new URL(page.url()).pathname).toBe("/dashboard");

  // Authenticated content renders — guest dashboard headline + email.
  await expect(
    page.getByRole("heading", { name: /your tables/i }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(email)).toBeVisible();

  // No render-loop errors.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
