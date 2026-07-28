import { test, expect } from "@playwright/test";

/**
 * E2E verifying the share card NEVER leaks a full street address.
 *
 * The renderer accepts a `neighborhood` plus several looser fallback
 * fields (`city`, `location`, `service_area`). Any of those could
 * accidentally contain a full address pulled from the listing. The
 * share card must:
 *   - Render a plain neighborhood label when one is provided.
 *   - Treat any address-shaped value (street number, street suffix,
 *     ZIP, multi-segment address, unit/apt) as missing and omit it.
 *   - Behave the same across hosted_table (default + salon archetypes),
 *     private_dining, and every priceCents scenario.
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * from the real renderers and exposes them as JSON in the DOM.
 */

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

const FLOWS = ["hosted-texts", "hosted-salon-texts", "private-texts"] as const;

const PRICE_CASES = ["8500", "0", "null", "undefined", "-500"] as const;

/**
 * Address-shaped strings that must NEVER appear verbatim in any rendered
 * text on the card. Mirrors patterns from the safeNeighborhood helper.
 */
const FORBIDDEN_ADDRESSES = [
  "123 Main Street",
  "45 Oak Ave",
  "789 Sunset Blvd, Apt 4B",
  "1600 Pennsylvania Ave NW, Washington, DC 20500",
  "10 Downing St",
  "221B Baker Street",
  "500 Market St, San Francisco, CA 94105",
  "Suite 200, 99 Broadway",
];

function assertNoFullAddress(rendered: string[], address: string) {
  // No exact-substring leak.
  for (const text of rendered) {
    expect(text).not.toContain(address);
  }
  // No address-shaped fragment ever rendered into the meta row.
  expect(rendered.some((t) => /\d{1,6}\s+\S+\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy|Parkway|Pkwy)\b/i.test(t))).toBe(false);
  // No standalone ZIP code rendered.
  expect(rendered.some((t) => /\b\d{5}(-\d{4})?\b/.test(t))).toBe(false);
  // No unit/apt indicator rendered.
  expect(rendered.some((t) => /\b(Apt|Suite|Ste|Unit|#)\s*\.?\s*\d/i.test(t))).toBe(false);
}

for (const price of PRICE_CASES) {
  for (const addr of FORBIDDEN_ADDRESSES) {
    test(`share card omits full address (priceCents=${price}, addr="${addr}")`, async ({
      page,
    }) => {
      // Note: `hood=null` removes the neighborhood entirely so we can
      // verify that the address fallbacks (`city`, `location`,
      // `service_area`) never leak even when they're the only thing
      // available.
      await page.goto(
        `/e2e/share-card-price?priceCents=${price}&hood=null&addr=${encodeURIComponent(addr)}`,
        { waitUntil: "domcontentloaded" },
      );

      for (const flow of FLOWS) {
        const rendered = await readTexts(page, flow);
        assertNoFullAddress(rendered, addr);
      }
    });
  }
}

for (const price of PRICE_CASES) {
  test(`share card renders neighborhood (not address) when both present (priceCents=${price})`, async ({
    page,
  }) => {
    const addr = "500 Market St, San Francisco, CA 94105";
    await page.goto(
      `/e2e/share-card-price?priceCents=${price}&hood=Mission&addr=${encodeURIComponent(addr)}`,
      { waitUntil: "domcontentloaded" },
    );

    for (const flow of FLOWS) {
      const rendered = await readTexts(page, flow);
      // The clean neighborhood label is present (uppercased for private
      // dining, plain case for hosted).
      const containsHood = rendered.some((t) => /\bmission\b/i.test(t));
      expect(containsHood).toBe(true);
      // The full address must never leak.
      assertNoFullAddress(rendered, addr);
    }
  });
}

test("share card omits address-shaped neighborhood input as well", async ({ page }) => {
  // If the neighborhood field itself contains an address-shaped value,
  // it must be rejected too — not just the fallback fields.
  const addr = "742 Evergreen Terrace";
  await page.goto(
    `/e2e/share-card-price?priceCents=8500&hood=${encodeURIComponent(addr)}&addr=null`,
    { waitUntil: "domcontentloaded" },
  );

  for (const flow of FLOWS) {
    const rendered = await readTexts(page, flow);
    assertNoFullAddress(rendered, addr);
    // Specifically, "Evergreen Terrace" includes a street suffix and
    // must not appear verbatim.
    expect(rendered.some((t) => /Evergreen\s+Terrace/i.test(t))).toBe(false);
  }
});
