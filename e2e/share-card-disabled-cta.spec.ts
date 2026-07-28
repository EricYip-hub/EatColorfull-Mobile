import { test, expect } from "@playwright/test";

/**
 * E2E verifying that seats-remaining / sold-out state correctly
 * disables the hosted-table CTAs on the share card.
 *
 * Rules under test:
 *   - seats > 0  → CTA renders the active wording
 *       ("REQUEST A SEAT" for default hosted, "APPLY TO ATTEND" for salon)
 *       in the accent palette (active button color).
 *   - seats = 0  → CTA is REPLACED with the muted waitlist CTA
 *       ("JOIN THE WAITLIST"), drawn with the palette's muted color so it
 *       is visually disabled. The active wordings MUST NOT appear anywhere
 *       on the canvas — a sold-out card must never advertise a closed seat
 *       as bookable.
 *   - The private-dining CTA is unaffected by seats (no seat concept).
 */

type Styled = { text: string; color: string };

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

async function readStyled(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as Styled[];
}

async function readPalettes(page: import("@playwright/test").Page) {
  const loc = page.locator('[data-testid="palettes"]');
  await expect(loc).not.toHaveText("", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as Record<
    string,
    { bg: string; ink: string; muted: string; accent: string; onAccent: string }
  >;
}

const ACTIVE_HOSTED = "REQUEST A SEAT";
const ACTIVE_SALON = "APPLY TO ATTEND";
const DISABLED = "JOIN THE WAITLIST";

test("seats=0 disables default hosted CTA — renders muted JOIN THE WAITLIST", async ({
  page,
}) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=0", {
    waitUntil: "domcontentloaded",
  });
  const palettes = await readPalettes(page);
  const hosted = await readStyled(page, "hosted-styled");

  // CTA wording is replaced.
  const ctaEntry = hosted.find((s) => s.text === DISABLED);
  expect(ctaEntry, "JOIN THE WAITLIST must be drawn").toBeDefined();
  // The active CTA wording must not appear anywhere on the canvas.
  expect(hosted.some((s) => s.text === ACTIVE_HOSTED)).toBe(false);

  // The disabled CTA text is drawn with the palette's muted color (fg = bg
  // because drawCta uses bg as fg for the disabled state — the *button fill*
  // is muted, and the label color matches the panel bg for visual quiet).
  // We assert the label color equals the panel bg (i.e., NOT the active onAccent).
  expect(ctaEntry!.color.toLowerCase()).toBe(palettes.hosted_table.bg.toLowerCase());
  // And the label color must NOT equal the active onAccent (which would mean
  // the active style accidentally bled through).
  expect(ctaEntry!.color.toLowerCase()).not.toBe(
    palettes.hosted_table.onAccent.toLowerCase(),
  );
});

test("seats=0 disables salon hosted CTA — renders muted JOIN THE WAITLIST", async ({
  page,
}) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=0", {
    waitUntil: "domcontentloaded",
  });
  const palettes = await readPalettes(page);
  const salon = await readStyled(page, "hosted-salon-styled");

  const ctaEntry = salon.find((s) => s.text === DISABLED);
  expect(ctaEntry).toBeDefined();
  expect(salon.some((s) => s.text === ACTIVE_SALON)).toBe(false);
  expect(ctaEntry!.color.toLowerCase()).toBe(palettes.hosted_table.bg.toLowerCase());
});

test("seats>0 keeps active CTA wording and active accent styling", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=2", {
    waitUntil: "domcontentloaded",
  });
  const palettes = await readPalettes(page);
  const hosted = await readStyled(page, "hosted-styled");
  const salon = await readStyled(page, "hosted-salon-styled");

  const hostedCta = hosted.find((s) => s.text === ACTIVE_HOSTED);
  const salonCta = salon.find((s) => s.text === ACTIVE_SALON);
  expect(hostedCta).toBeDefined();
  expect(salonCta).toBeDefined();

  // Active label color must equal the palette's onAccent (not muted/bg).
  expect(hostedCta!.color.toLowerCase()).toBe(palettes.hosted_table.onAccent.toLowerCase());
  expect(salonCta!.color.toLowerCase()).toBe(palettes.hosted_table.onAccent.toLowerCase());

  // The disabled wording must not appear when seats are available.
  expect(hosted.some((s) => s.text === DISABLED)).toBe(false);
  expect(salon.some((s) => s.text === DISABLED)).toBe(false);
});

test("seats=1 (last seat) is still active — CTA is NOT disabled", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=1", {
    waitUntil: "domcontentloaded",
  });
  const hosted = await readTexts(page, "hosted-texts");
  const salon = await readTexts(page, "hosted-salon-texts");

  expect(hosted).toContain("1 SEAT LEFT");
  expect(salon).toContain("1 SEAT LEFT");
  expect(hosted).toContain(ACTIVE_HOSTED);
  expect(salon).toContain(ACTIVE_SALON);
  expect(hosted).not.toContain(DISABLED);
  expect(salon).not.toContain(DISABLED);
});

test("seats unknown (null) keeps active CTA — only seats=0 disables", async ({ page }) => {
  // No seats query param → harness default is 4. Use explicit null to confirm.
  await page.goto("/e2e/share-card-price?priceCents=8500&seats=null", {
    waitUntil: "domcontentloaded",
  });
  const hosted = await readTexts(page, "hosted-texts");
  const salon = await readTexts(page, "hosted-salon-texts");

  // No SOLD OUT badge, no seats badge — and CTA stays active.
  expect(hosted).not.toContain("SOLD OUT");
  expect(salon).not.toContain("SOLD OUT");
  expect(hosted).toContain(ACTIVE_HOSTED);
  expect(salon).toContain(ACTIVE_SALON);
  expect(hosted).not.toContain(DISABLED);
  expect(salon).not.toContain(DISABLED);
});

test("private-dining CTA is unaffected by seats=0", async ({ page }) => {
  await page.goto("/e2e/share-card-price?priceCents=25000&seats=0", {
    waitUntil: "domcontentloaded",
  });
  const pd = await readTexts(page, "private-texts");

  expect(pd).toContain("APPLY TO HOST");
  expect(pd).not.toContain(DISABLED);
  expect(pd).not.toContain("SOLD OUT");
});
