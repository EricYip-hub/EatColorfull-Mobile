import { test, expect } from "@playwright/test";

/**
 * E2E regression for the /login redirect-loop fix.
 *
 * Visiting an authenticated route while logged out must:
 *   1. Redirect to /login.
 *   2. Carry a SAFE `redirect` search param — it must point at the originally
 *      requested route, NOT at /login itself, and must not stack multiple
 *      `redirect=` segments (the accumulating-chain regression).
 *   3. Render the login page normally with no render-loop / "Maximum update
 *      depth" errors firing during mount.
 */
test("logged-out visit to authenticated route redirects to /login safely", async ({ page, context }) => {
  // Ensure we're logged out — drop any persisted Supabase session.
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

  const target = "/bring-this-home";
  await page.goto(target, { waitUntil: "domcontentloaded" });

  // Allow the auth gate + redirect to settle.
  await page.waitForURL(/\/login(\?|$)/, { timeout: 5000 });
  await page.waitForTimeout(800);

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");

  // --- Safe redirect param ---
  const redirectParam = url.searchParams.get("redirect");
  // Either no param, or a param that points at the originally requested route
  // — never back to /login (which is the accumulating-loop signature).
  if (redirectParam !== null) {
    expect(
      redirectParam.startsWith("/login"),
      `redirect param must not point back to /login, got: ${redirectParam}`,
    ).toBe(false);
    expect(redirectParam).toContain("/bring-this-home");
  }

  // --- No accumulating chain ---
  // A loop would produce a URL like /login?redirect=%2Flogin%3Fredirect%3D...
  // i.e. the substring "redirect=" appears more than once in the raw search.
  const occurrences = (url.search.match(/redirect=/g) ?? []).length;
  expect(occurrences, `accumulating redirect chain detected: ${url.search}`)
    .toBeLessThanOrEqual(1);

  // --- Page renders normally ---
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(0);
  // Login page has a visible heading / sign-in affordance.
  await expect(page.getByRole("heading")).toBeVisible();

  // --- No render-loop errors ---
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
