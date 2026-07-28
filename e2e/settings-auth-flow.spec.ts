import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: logged-out visit to /settings → safe redirect to /login → after login,
 * lands on /settings with no stacked redirect chain and the page renders.
 *
 * Combines the auth-gate sanitization check with a real login round-trip
 * against an ephemeral user created via the service-role admin client.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-settings-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
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

test("/settings redirects to /login safely while logged out, then renders after login", async ({ page, context }) => {
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

  const target = "/settings";

  // 1. Logged-out visit → redirect to /login with a safe single redirect param.
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });

  const preLoginUrl = new URL(page.url());
  expect(preLoginUrl.pathname).toBe("/login");

  const redirectParam = preLoginUrl.searchParams.get("redirect");
  expect(redirectParam, "redirect param missing").not.toBeNull();
  expect(redirectParam!.startsWith("/login")).toBe(false);
  expect(redirectParam).toContain(target);

  const occurrences = (preLoginUrl.search.match(/redirect=/g) ?? []).length;
  expect(
    occurrences,
    `accumulating redirect chain detected: ${preLoginUrl.search}`,
  ).toBe(1);

  // Login form is visible and rendered.
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // 2. Sign in.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // 3. Land on /settings with a clean URL.
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 10_000 });

  const postLoginUrl = new URL(page.url());
  expect(postLoginUrl.pathname).toBe(target);
  expect(
    (postLoginUrl.search.match(/redirect=/g) ?? []).length,
    `accumulating redirect chain after login: ${postLoginUrl.search}`,
  ).toBe(0);
  expect(postLoginUrl.href).not.toMatch(/redirect=.*redirect=/);

  // 4. Settings page rendered with its real content.
  await expect(
    page.getByRole("heading", { name: /settings/i }),
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

  // 5. No render-loop errors anywhere in the flow.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
