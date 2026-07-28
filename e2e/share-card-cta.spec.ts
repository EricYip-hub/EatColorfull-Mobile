import { test, expect } from "@playwright/test";

/**
 * E2E verifying the share-card CTA labels — Apply to Attend (salon
 * hosted tables), Request a Seat (default hosted tables), and Apply
 * to Host (private dining) — render via the renderer regardless of
 * the priceCents scenario, AND that the right-side price meta line
 * matches the listing flow for every priceCents case:
 *   - null      → "PRICING TBA"  / "INQUIRE FOR PRICING"
 *   - undefined → "PRICING TBA"  / "INQUIRE FOR PRICING"
 *   - 0         → "$0"
 *   - negative  → "PRICING TBA"  / "INQUIRE FOR PRICING"
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * from the real renderers (default hosted, salon hosted, private
 * dining) and exposes them as JSON in the DOM.
 */

async function readTexts(page: import("@playwright/test").Page, testid: string) {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText()) as string[];
}

type Case = {
  param: string;
  hostedPrice: string;
  privatePrice: string;
  /** Must NOT appear in either flow when price is absent / invalid. */
  forbidCurrency: boolean;
};

const CASES: Case[] = [
  {
    param: "null",
    hostedPrice: "PRICING TBA",
    privatePrice: "INQUIRE FOR PRICING",
    forbidCurrency: true,
  },
  {
    param: "undefined",
    hostedPrice: "PRICING TBA",
    privatePrice: "INQUIRE FOR PRICING",
    forbidCurrency: true,
  },
  {
    param: "0",
    hostedPrice: "$0",
    privatePrice: "$0",
    forbidCurrency: false,
  },
  {
    param: "-500",
    hostedPrice: "PRICING TBA",
    privatePrice: "INQUIRE FOR PRICING",
    forbidCurrency: true,
  },
];

for (const c of CASES) {
  test(`share card CTAs + price meta match listing flow (priceCents=${c.param})`, async ({
    page,
  }) => {
    await page.goto(`/e2e/share-card-price?priceCents=${c.param}`, {
      waitUntil: "domcontentloaded",
    });

    const hosted = await readTexts(page, "hosted-texts");
    const salon = await readTexts(page, "hosted-salon-texts");
    const pd = await readTexts(page, "private-texts");

    // CTA labels must exactly match the listing-flow copy (rendered uppercase by drawCta).
    expect(hosted).toContain("REQUEST A SEAT");
    expect(salon).toContain("APPLY TO ATTEND");
    expect(pd).toContain("APPLY TO HOST");

    // Salon hosted tables must NOT show the default "Request a Seat" copy.
    expect(salon).not.toContain("REQUEST A SEAT");
    // Default hosted tables must NOT borrow the salon copy.
    expect(hosted).not.toContain("APPLY TO ATTEND");
    // Hosted flows must never use the private-dining CTA, and vice versa.
    expect(hosted).not.toContain("APPLY TO HOST");
    expect(salon).not.toContain("APPLY TO HOST");
    expect(pd).not.toContain("REQUEST A SEAT");
    expect(pd).not.toContain("APPLY TO ATTEND");

    // Right-side price meta line.
    expect(hosted).toContain(c.hostedPrice);
    expect(salon).toContain(c.hostedPrice);
    expect(pd).toContain(c.privatePrice);

    if (c.forbidCurrency) {
      // No spurious dollar amounts (incl. negatives like "-$5") when
      // priceCents is missing/invalid.
      for (const list of [hosted, salon, pd]) {
        expect(list.some((t) => /\$\d/.test(t))).toBe(false);
        expect(list.some((t) => /-\s*\$\d/.test(t))).toBe(false);
      }
    }

    // The hosted flows must never render the legacy "/ SEAT" suffix,
    // and the private flow must never render the legacy "FROM $" prefix.
    for (const list of [hosted, salon]) {
      expect(list.some((t) => /\/\s*SEAT/i.test(t))).toBe(false);
    }
    expect(pd.some((t) => /^FROM\s*\$/i.test(t))).toBe(false);
  });
}
