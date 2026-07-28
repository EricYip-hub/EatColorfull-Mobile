import { test, expect } from "@playwright/test";

/**
 * E2E verifying the private-dining share-card party-size label and that
 * the CTA + price meta still render cleanly when min_guests / max_guests
 * are 0, null, or negative.
 *
 * Expected behavior (mirrors the priceCents fallback pattern):
 *   - both valid (>0)       → "N–M GUESTS"
 *   - only max valid (>0)   → "UP TO M GUESTS"
 *   - only min valid (>0)   → "FROM N GUESTS"
 *   - neither valid         → "GATHER YOUR PARTY"
 *
 * Zero and negative values are treated as missing — we must never
 * render "0 GUESTS", "-5 GUESTS", "0–12 GUESTS", etc.
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * from the real renderer and exposes them as JSON in the DOM.
 */

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

type Case = {
  name: string;
  minGuests: string;
  maxGuests: string;
  expectedLabel: string;
};

const CASES: Case[] = [
  // Both invalid → full fallback.
  { name: "both null",          minGuests: "null",      maxGuests: "null",      expectedLabel: "GATHER YOUR PARTY" },
  { name: "both zero",          minGuests: "0",         maxGuests: "0",         expectedLabel: "GATHER YOUR PARTY" },
  { name: "both negative",      minGuests: "-2",        maxGuests: "-5",        expectedLabel: "GATHER YOUR PARTY" },
  // Mixed invalid + valid → partial label.
  { name: "min zero, max valid",     minGuests: "0",    maxGuests: "10", expectedLabel: "UP TO 10 GUESTS" },
  { name: "min null, max valid",     minGuests: "null", maxGuests: "10", expectedLabel: "UP TO 10 GUESTS" },
  { name: "min negative, max valid", minGuests: "-3",   maxGuests: "10", expectedLabel: "UP TO 10 GUESTS" },
  { name: "min valid, max zero",     minGuests: "4",    maxGuests: "0",  expectedLabel: "FROM 4 GUESTS" },
  { name: "min valid, max null",     minGuests: "4",    maxGuests: "null", expectedLabel: "FROM 4 GUESTS" },
  { name: "min valid, max negative", minGuests: "4",    maxGuests: "-1", expectedLabel: "FROM 4 GUESTS" },
];

for (const c of CASES) {
  test(`private-dining party label is clean (${c.name})`, async ({ page }) => {
    await page.goto(
      `/e2e/share-card-price?priceCents=25000&minGuests=${c.minGuests}&maxGuests=${c.maxGuests}`,
      { waitUntil: "domcontentloaded" },
    );

    const pd = await readTexts(page, "private-texts");

    // Expected party label is present (joined with neighborhood in the meta line).
    expect(pd.some((t) => t.includes(c.expectedLabel))).toBe(true);

    // Never render a misleading 0-guest party label.
    expect(pd.some((t) => /\b0\s*GUESTS?\b/i.test(t))).toBe(false);
    // Never render a misleading 0–N or N–0 range.
    expect(pd.some((t) => /\b0\s*[–-]\s*\d/.test(t))).toBe(false);
    expect(pd.some((t) => /\b\d+\s*[–-]\s*0\b/.test(t))).toBe(false);
    // Never render a negative-guest label.
    expect(pd.some((t) => /-\s*\d+\s*GUESTS?/i.test(t))).toBe(false);
    expect(pd.some((t) => /-\s*\d+\s*[–-]/.test(t))).toBe(false);
    // No literal "null" / "undefined" / "NaN" leaking into rendered text.
    expect(pd.some((t) => /\b(null|undefined|NaN)\b/i.test(t))).toBe(false);

    // CTA and price meta still render correctly regardless of party-size shape.
    expect(pd).toContain("APPLY TO HOST");
    expect(pd).toContain("$250");

    // Hosted flows are unaffected (still render their own CTAs + price meta).
    const hosted = await readTexts(page, "hosted-texts");
    const salon = await readTexts(page, "hosted-salon-texts");
    expect(hosted).toContain("REQUEST A SEAT");
    expect(salon).toContain("APPLY TO ATTEND");
    expect(hosted).toContain("$250");
    expect(salon).toContain("$250");
  });
}

test("private-dining party label + CTA + price meta when guests invalid AND price missing", async ({
  page,
}) => {
  await page.goto(
    "/e2e/share-card-price?priceCents=null&minGuests=0&maxGuests=-3",
    { waitUntil: "domcontentloaded" },
  );

  const pd = await readTexts(page, "private-texts");

  // Both fallbacks must render cleanly together (party label is joined
  // with neighborhood in the meta line).
  expect(pd.some((t) => t.includes("GATHER YOUR PARTY"))).toBe(true);
  expect(pd).toContain("INQUIRE FOR PRICING");
  expect(pd).toContain("APPLY TO HOST");

  // No misleading currency or guest values.
  expect(pd.some((t) => /\$\d/.test(t))).toBe(false);
  expect(pd.some((t) => /-\s*\$\d/.test(t))).toBe(false);
  expect(pd.some((t) => /\b0\s*GUESTS?\b/i.test(t))).toBe(false);
  expect(pd.some((t) => /-\s*\d+\s*GUESTS?/i.test(t))).toBe(false);

  // Meta line must not end with a dangling separator or leak sentinel values.
  expect(pd.some((t) => /·\s*$/.test(t))).toBe(false);
  expect(pd.some((t) => /\b(null|undefined|NaN)\b/i.test(t))).toBe(false);

  // Legacy "FROM $" price prefix must not appear.
  expect(pd.some((t) => /^FROM\s*\$/i.test(t))).toBe(false);
});
