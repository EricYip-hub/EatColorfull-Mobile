import { test, expect } from "@playwright/test";

/**
 * E2E regression: a logged-out (and therefore non-host) visit to
 * /host/dashboard must redirect to /login with a single, safe `redirect`
 * search param pointing back at /host/dashboard — never at /login itself,
 * and never with a stacked redirect chain.
 *
 * This is the pre-auth surface of the host page: we don't sign in, we just
 * assert the gate behaves correctly for an unauthenticated guest.
 */
test("logged-out guest visiting /host/dashboard redirects to /login safely", async ({ page, context }) => {
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

  const target = "/host/dashboard";
  await page.goto(target, { waitUntil: "domcontentloaded" });

  // Auth gate should send us to /login.
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });
  // Give any follow-up navigation a chance to settle so we'd catch
  // accumulating redirects.
  await page.waitForTimeout(800);

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");

  // --- Safe redirect param ---
  const redirectParam = url.searchParams.get("redirect");
  expect(redirectParam, "redirect param missing").not.toBeNull();
  expect(
    redirectParam!.startsWith("/login"),
    `redirect param must not point back to /login, got: ${redirectParam}`,
  ).toBe(false);
  expect(redirectParam).toContain(target);

  // --- Single redirect= occurrence (no stacking) ---
  const occurrences = (url.search.match(/redirect=/g) ?? []).length;
  expect(
    occurrences,
    `accumulating redirect chain detected: ${url.search}`,
  ).toBe(1);
  expect(url.href).not.toMatch(/redirect=.*redirect=/);

  // --- Login page renders normally ---
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(0);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

  // --- No render-loop errors ---
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
