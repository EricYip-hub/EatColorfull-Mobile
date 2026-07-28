import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Post-deploy password-reset smoke:
 *   1. Seed an ephemeral confirmed user via the service-role admin client.
 *   2. On /login, open the "Forgot password?" panel and submit the reset form
 *      — verifies resetPasswordForEmail returns without error and the UI
 *      shows the "link is on its way" confirmation.
 *   3. Use the admin client's generateLink({ type: 'recovery' }) to obtain a
 *      real, usable recovery URL for that same email (proves the recovery
 *      pathway works end-to-end without depending on inbox delivery).
 *   4. Visit the recovery link → lands on /reset-password with a valid
 *      recovery session, set a new password, and watch the redirect back
 *      to /login.
 *   5. Sign in with the *new* password → lands on /dashboard with real
 *      authenticated content.
 *
 * Runs against BASE_URL — works against both the local preview server and
 * the live deploy URL.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE,
  "password-reset smoke requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars",
);

const admin = createClient(SUPABASE_URL ?? "", SERVICE_ROLE ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `e2e-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const originalPassword = "Smoke-Reset-Original-1234!";
const newPassword = "Smoke-Reset-Updated-5678!";
let userId: string | null = null;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: originalPassword,
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

async function clearSession(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
) {
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

test("smoke: password reset flow lets user sign in with new password", async ({
  page,
  context,
  baseURL,
}) => {
  await clearSession(page, context);

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  // --- 1. Trigger reset from the real /login UI -----------------------------
  const loginResp = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(loginResp?.status()).toBe(200);

  await page.getByRole("button", { name: /forgot password\?/i }).click();

  const resetPanel = page.locator("#forgot-password-panel");
  await expect(resetPanel).toBeVisible();

  await resetPanel.locator('input[type="email"]').fill(email);
  await resetPanel.getByRole("button", { name: /send reset link/i }).click();

  // UI always shows the same confirmation (no account-existence leak).
  await expect(
    resetPanel.getByText(/reset link is on its way/i),
  ).toBeVisible({ timeout: 10_000 });

  // --- 2. Obtain a real recovery URL via admin generateLink -----------------
  // Point the recovery link at the same origin the browser is on so the
  // redirect lands on /reset-password in this test's BASE_URL.
  const origin =
    baseURL ?? (await page.evaluate(() => window.location.origin));
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });
  if (linkError) throw linkError;
  const actionLink = linkData?.properties?.action_link;
  expect(actionLink, "generateLink should return an action_link").toBeTruthy();

  // --- 3. Visit the recovery link & set a new password ----------------------
  await page.goto(actionLink!, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/reset-password(\?|#|$)/, { timeout: 15_000 });

  const newPwInput = page.locator('input#new-password');
  await expect(newPwInput).toBeVisible({ timeout: 15_000 });
  await newPwInput.fill(newPassword);
  await page.locator('input#confirm-password').fill(newPassword);
  await page.getByRole("button", { name: /update password/i }).click();

  // Page signs the recovery session out and redirects to /login.
  await page.waitForURL(/\/login(\?|$)/, { timeout: 15_000 });

  // --- 4. Sign in with the NEW password → /dashboard ------------------------
  await clearSession(page, context);
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input#login-password').fill(newPassword);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 });
  expect(new URL(page.url()).pathname).toBe("/dashboard");

  await expect(
    page.getByRole("heading", { name: /your tables/i }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(email)).toBeVisible();

  // --- 5. Confirm the OLD password no longer works --------------------------
  const { error: oldPwError } = await admin.auth.signInWithPassword({
    email,
    password: originalPassword,
  });
  expect(
    oldPwError,
    "Old password should be rejected after reset",
  ).not.toBeNull();

  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
