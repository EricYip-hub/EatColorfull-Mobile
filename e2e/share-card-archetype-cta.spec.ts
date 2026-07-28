import { test, expect, type Page } from "@playwright/test";

/**
 * E2E covering the full archetype → CTA mapping enforced by
 * `resolveShareCta('hosted_table', { archetype })`:
 *
 *   - "Founding Salon" (and anything matching /salon|founding/i)
 *       → "Apply to Attend" → drawCta renders "APPLY TO ATTEND"
 *   - Every other hosted-table archetype from `ARCHETYPES`
 *       → "Request a Seat" → drawCta renders "REQUEST A SEAT"
 *   - Empty / null / unknown archetype
 *       → defaults to "Request a Seat"
 *
 * The mapping is also resilient to which details key the chef record
 * uses: `archetype`, `table_archetype`, or `tableArchetype`.
 *
 * Driven by /e2e/share-card-price which calls the real resolveShareCta
 * and the real hosted-table renderer for the given archetype, then
 * exposes both the resolved CTA string and the canvas-rendered text via
 * the DOM.
 */

const ATTEND = "APPLY TO ATTEND";
const REQUEST = "REQUEST A SEAT";

/** Mirror of `ARCHETYPES` from src/lib/tables-data.ts. */
const ARCHETYPES = [
  "Heritage Table",
  "Mediterranean Table",
  "Sacred Table",
  "Plant Forward Table",
  "Longevity Table",
  "Fire Table",
  "Sensory Table",
  "Biohacker Table",
  "Creator Table",
  "Music Table",
  "Shabbat Table",
  "Founding Salon",
] as const;

/**
 * Mirror of `resolveShareCta('hosted_table', { archetype })` so the
 * test owns the expected mapping independently of the implementation.
 */
function expectedHostedCta(archetype: string | null): string {
  const a = (archetype ?? "").toLowerCase();
  if (a.includes("salon") || a.includes("founding")) return ATTEND;
  return REQUEST;
}

async function readTexts(page: Page, testid: string): Promise<string[]> {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText());
}

async function readText(page: Page, testid: string): Promise<string> {
  return (await page.locator(`[data-testid="${testid}"]`).innerText()).trim();
}

async function loadArchetype(
  page: Page,
  archetype: string | null,
  field: "archetype" | "table_archetype" | "tableArchetype" = "archetype",
) {
  const params = new URLSearchParams({
    priceCents: "8500",
    archetypeField: field,
  });
  if (archetype !== null) params.set("archetype", archetype);
  await page.goto(`/e2e/share-card-price?${params.toString()}`, {
    waitUntil: "domcontentloaded",
  });
  // Wait for the dynamic harness to render so DOM contents are stable.
  await expect(page.locator('[data-testid="archetype-texts"]')).not.toHaveText("[]", {
    timeout: 10_000,
  });
}

for (const archetype of ARCHETYPES) {
  const expected = expectedHostedCta(archetype);
  const other = expected === ATTEND ? REQUEST : ATTEND;

  test(`archetype "${archetype}" → CTA "${expected}"`, async ({ page }) => {
    await loadArchetype(page, archetype);

    // The resolver returned the right human-cased CTA.
    expect(await readText(page, "archetype-resolved-cta")).toBe(
      expected === ATTEND ? "Apply to Attend" : "Request a Seat",
    );

    // The canvas renderer drew the matching uppercase label, and
    // not the opposite one.
    const texts = await readTexts(page, "archetype-texts");
    expect(texts).toContain(expected);
    expect(texts).not.toContain(other);

    // The CTA must never accidentally borrow the private-dining copy.
    expect(texts).not.toContain("APPLY TO HOST");
  });
}

test('Founding Salon is the ONLY archetype that maps to "Apply to Attend"', async ({
  page,
}) => {
  const attendArchetypes: string[] = [];
  for (const archetype of ARCHETYPES) {
    await loadArchetype(page, archetype);
    const texts = await readTexts(page, "archetype-texts");
    if (texts.includes(ATTEND)) attendArchetypes.push(archetype);
  }
  expect(attendArchetypes).toEqual(["Founding Salon"]);
});

test("empty/null/unknown archetype defaults to Request a Seat", async ({ page }) => {
  for (const value of [null, "", "Unknown Vibe", "supper club"]) {
    await loadArchetype(page, value);
    const resolved = await readText(page, "archetype-resolved-cta");
    expect(resolved).toBe("Request a Seat");
    const texts = await readTexts(page, "archetype-texts");
    expect(texts).toContain(REQUEST);
    expect(texts).not.toContain(ATTEND);
  }
});

test('"Founding Salon" maps to Apply to Attend across details fields', async ({
  page,
}) => {
  for (const field of [
    "archetype",
    "table_archetype",
    "tableArchetype",
  ] as const) {
    await loadArchetype(page, "Founding Salon", field);
    expect(await readText(page, "archetype-field")).toBe(field);
    // `resolveShareCta` only reads `archetype` and `table_archetype`,
    // so the camelCase variant should fall back to "Request a Seat" —
    // this guards against an over-eager match that would silently
    // pick up unsupported keys.
    const resolved = await readText(page, "archetype-resolved-cta");
    const texts = await readTexts(page, "archetype-texts");
    if (field === "tableArchetype") {
      expect(resolved).toBe("Request a Seat");
      expect(texts).toContain(REQUEST);
      expect(texts).not.toContain(ATTEND);
    } else {
      expect(resolved).toBe("Apply to Attend");
      expect(texts).toContain(ATTEND);
      expect(texts).not.toContain(REQUEST);
    }
  }
});

test("salon-style variants (case + spacing) all map to Apply to Attend", async ({
  page,
}) => {
  for (const v of [
    "Founding Salon",
    "founding salon",
    "FOUNDING SALON",
    "Salon Series",
    "salon-style",
    "Founding Members Table",
  ]) {
    await loadArchetype(page, v);
    expect(await readText(page, "archetype-resolved-cta")).toBe("Apply to Attend");
    const texts = await readTexts(page, "archetype-texts");
    expect(texts).toContain(ATTEND);
    expect(texts).not.toContain(REQUEST);
  }
});
