import { test, expect } from "@playwright/test";

/**
 * E2E regression for the /bring-this-home render loop.
 *
 * The page lives under the `_authenticated` layout, so an unauthenticated
 * visit redirects to /login. What we are guarding against here is the
 * specific failure mode where `validateSearch` re-fires on every render
 * and React throws "Maximum update depth exceeded" — that would occur
 * regardless of whether the user is authed (it happens during match/render
 * before any auth redirect settles).
 *
 * This test:
 *   - Visits /bring-this-home with no ?table query.
 *   - Captures every console error + page error for a fixed observation window.
 *   - Asserts the app painted SOMETHING (the route rendered, even if it then
 *     redirected to /login).
 *   - Asserts no "Maximum update depth" / "Too many re-renders" error fired,
 *     which is the exact signature of repeated search-param validation.
 */
test("bring-this-home with no query does not trigger repeated search validation", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  // Don't wait for networkidle — auth redirects make that flaky. We just
  // need the document loaded; the regression surfaces during render.
  await page.goto("/bring-this-home", { waitUntil: "domcontentloaded" });

  // Give the app a fixed window to mount, run effects, and either render or
  // redirect. A render loop would fire its error inside this window.
  await page.waitForTimeout(1500);

  // The app rendered something (body has paint). A render-loop crash leaves
  // an empty body or a React error overlay.
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(0);

  // The actual contract: validateSearch must not loop. That manifests as one
  // of these specific React errors.
  const loopError = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(loopError, `Render loop detected: ${loopError}`).toBeUndefined();
});
