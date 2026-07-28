import { test, expect } from "@playwright/test";

/**
 * E2E verifying the share-card renderers emit the EXACT price wording
 * used on the listing flow:
 *   - hosted_table  → plain "$N" (no "/ SEAT" suffix)
 *   - private_dining → plain "$N" (no "FROM " prefix)
 * And the absent-price fallbacks render the documented copy.
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * from the real renderers and exposes them as JSON in the DOM.
 */

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  // Wait for the renderer's useEffect to populate the captured texts
  // (initial SSR/hydration paints "[]").
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

test("hosted-table share card renders price as plain '$N'", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=8500", {
    waitUntil: "domcontentloaded",
  });
  const hosted = await readTexts(page, "hosted-texts");
  expect(hosted).toContain("$85");
  // Must NOT use the legacy "/ SEAT" suffix anywhere.
  expect(hosted.some((t) => /\/\s*SEAT/i.test(t))).toBe(false);
});

test("private-dining share card renders price as plain '$N' (no 'FROM' prefix)", async ({
  page,
}) => {
  await page.goto("/e2e/share-card-price?priceCents=25000", {
    waitUntil: "domcontentloaded",
  });
  const pd = await readTexts(page, "private-texts");
  expect(pd).toContain("$250");
  expect(pd.some((t) => /^FROM\s*\$/i.test(t))).toBe(false);
});

test("share cards render documented fallbacks when priceCents is missing", async ({
  page,
}) => {
  await page.goto("/e2e/share-card-price?priceCents=null", {
    waitUntil: "domcontentloaded",
  });
  const hosted = await readTexts(page, "hosted-texts");
  const pd = await readTexts(page, "private-texts");
  expect(hosted).toContain("PRICING TBA");
  expect(pd).toContain("INQUIRE FOR PRICING");
  // No spurious dollar amounts when price is absent.
  expect(hosted.some((t) => /^\$\d/.test(t))).toBe(false);
  expect(pd.some((t) => /^\$\d/.test(t))).toBe(false);
});
