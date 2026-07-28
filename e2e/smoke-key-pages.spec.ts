import { test, expect } from "@playwright/test";

/**
 * Smoke tests: verify key public pages load and return HTTP 200.
 * Runs against BASE_URL (local preview by default; live URL when set in CI).
 */
const KEY_PAGES = [
  "/",
  "/about",
  "/how-it-works",
  "/discover",
  "/community",
  "/hosts",
  "/host",
  "/apply",
  "/join",
  "/login",
  "/signup",
  "/meal-prep",
  "/chefs/moshe-fhima",
  "/tastemakers",
  "/founding-salon",
  "/privacy",
  "/terms",
];

for (const path of KEY_PAGES) {
  test(`smoke: ${path} returns 200 and renders`, async ({ page, baseURL }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response!.status(), `bad status for ${path}`).toBe(200);

    // Page must render a non-empty <title> and at least one visible element.
    await expect(page).toHaveTitle(/.+/);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length, `empty body for ${path}`).toBeGreaterThan(0);
  });
}
