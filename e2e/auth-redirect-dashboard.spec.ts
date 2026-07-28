import { test, expect } from "@playwright/test";

/**
 * E2E regression: a logged-out visit to a *different* authenticated route
 * (here, /dashboard) must redirect to /login with a single, safe `redirect`
 * search param pointing back at the originally requested path — and the
 * login page must render normally.
 *
 * Complements e2e/auth-redirect.spec.ts which covers /bring-this-home.
 * This guards against per-route regressions in the auth gate where the
 * sanitization only works for one specific target path.
 */
test("logged-out visit to /dashboard redirects to /login with a safe single redirect param", async ({ page, context }) => {
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

  const target = "/dashboard";
  await page.goto(target, { waitUntil: "domcontentloaded" });

  // Auth gate should send us to /login.
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });
  await page.waitForTimeout(500);

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");

  // --- Safe redirect param: present, points at the original target, not /login. ---
  const redirectParam = url.searchParams.get("redirect");
  expect(redirectParam, "redirect param missing").not.toBeNull();
  expect(redirectParam!.startsWith("/login")).toBe(false);
  expect(redirectParam).toContain(target);

  // --- Single redirect= occurrence (no stacking). ---
  const occurrences = (url.search.match(/redirect=/g) ?? []).length;
  expect(
    occurrences,
    `accumulating redirect chain detected: ${url.search}`,
  ).toBe(1);
  expect(url.href).not.toMatch(/redirect=.*redirect=/);

  // --- Login page renders normally. ---
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(0);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

  // --- No render-loop errors. ---
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
