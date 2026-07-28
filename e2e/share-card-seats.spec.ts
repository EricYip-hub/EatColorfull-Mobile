import { test, expect } from "@playwright/test";

/**
 * E2E verifying the share-card seat-remaining meta line and SOLD OUT badge
 * when seats remaining is 0, plus CTA behavior consistency.
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * from the real renderers and exposes them as JSON in the DOM.
 */

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

test("hosted-table share card shows SOLD OUT badge when seats=0", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=0", {
    waitUntil: "domcontentloaded",
  });

  const hosted = await readTexts(page, "hosted-texts");
  const salon = await readTexts(page, "hosted-salon-texts");

  // SOLD OUT badge must appear.
  expect(hosted).toContain("SOLD OUT");
  expect(salon).toContain("SOLD OUT");

  // Must NOT show "0 seat" or "0 SEATS" anywhere — neither badge nor meta.
  expect(hosted.some((t) => /\b0\s*seat/i.test(t))).toBe(false);
  expect(salon.some((t) => /\b0\s*seat/i.test(t))).toBe(false);

  // CTA must be replaced with the muted waitlist CTA when sold out —
  // a sold-out card must never advertise "Request a Seat" / "Apply to Attend".
  expect(hosted).toContain("JOIN THE WAITLIST");
  expect(salon).toContain("JOIN THE WAITLIST");
  expect(hosted).not.toContain("REQUEST A SEAT");
  expect(salon).not.toContain("APPLY TO ATTEND");

  // Price meta must still render.
  expect(hosted).toContain("$85");
  expect(salon).toContain("$85");
});



test("hosted-table share card shows seat-remaining badge when seats>0", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=3", {
    waitUntil: "domcontentloaded",
  });

  const hosted = await readTexts(page, "hosted-texts");
  const salon = await readTexts(page, "hosted-salon-texts");

  // Seat-remaining badge must appear.
  expect(hosted).toContain("3 SEATS LEFT");
  expect(salon).toContain("3 SEATS LEFT");

  // Must NOT show SOLD OUT.
  expect(hosted).not.toContain("SOLD OUT");
  expect(salon).not.toContain("SOLD OUT");

  // CTA labels must still render correctly (uppercased by drawCta).
  expect(hosted).toContain("REQUEST A SEAT");
  expect(salon).toContain("APPLY TO ATTEND");

  // Price meta must still render.
  expect(hosted).toContain("$85");
  expect(salon).toContain("$85");
});

test("private-dining share card is unaffected by seats parameter", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=25000&seats=0", {
    waitUntil: "domcontentloaded",
  });

  const pd = await readTexts(page, "private-texts");

  // Private dining does not use seats — must not render SOLD OUT or seat badges.
  expect(pd).not.toContain("SOLD OUT");
  expect(pd.some((t) => /SEATS?\s*LEFT/i.test(t))).toBe(false);

  // CTA and price meta must still render correctly (uppercased by drawCta).
  expect(pd).toContain("APPLY TO HOST");
  expect(pd).toContain("$250");

  // Party-size badge must still render.
  expect(pd.some((t) => t.includes("6–12 GUESTS"))).toBe(true);
});

test("hosted-table SOLD OUT renders clean meta line without dangling separators", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=null&seats=0", {
    waitUntil: "domcontentloaded",
  });

  const hosted = await readTexts(page, "hosted-texts");

  // SOLD OUT badge appears even when price is missing.
  expect(hosted).toContain("SOLD OUT");

  // Price fallback must render.
  expect(hosted).toContain("PRICING TBA");

  // No "0 seat" text.
  expect(hosted.some((t) => /\b0\s*seat/i.test(t))).toBe(false);

  // No spurious dollar amounts when price is absent.
  expect(hosted.some((t) => /^\$\d/.test(t))).toBe(false);

  // Meta line must not end with a dangling separator.
  expect(hosted.some((t) => /·\s*$/.test(t))).toBe(false);
  expect(hosted.some((t) => /undefined/.test(t))).toBe(false);
});
