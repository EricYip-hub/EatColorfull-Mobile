import { test, expect, type Page } from "@playwright/test";

/**
 * E2E verifying the share-card renderers emit identical CTA + price meta
 * text and color tokens regardless of the OS color scheme, and that the
 * CTA preserves a strong contrast ratio against its button background in
 * every flow.
 *
 * The branded share cards (hosted_table, private_dining) intentionally
 * use fixed palettes — they must NOT respond to `prefers-color-scheme:
 * dark`, since the rendered PNG is shared off-platform and must look the
 * same for every viewer. These tests enforce that invariant and guard
 * the CTA/price contrast against silent regressions.
 *
 * Driven by /e2e/share-card-price which captures every fillText call
 * (text + fillStyle) and exposes them as JSON in the DOM.
 */

type StyledText = { text: string; color: string };
type Palette = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
};

async function readTexts(page: Page, testid: string): Promise<string[]> {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText());
}

async function readStyled(page: Page, testid: string): Promise<StyledText[]> {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await expect(loc).not.toHaveText("[]", { timeout: 10_000 });
  return JSON.parse(await loc.innerText());
}

async function readPalettes(page: Page): Promise<Record<string, Palette>> {
  const loc = page.locator('[data-testid="palettes"]');
  await expect(loc).not.toHaveText("", { timeout: 10_000 });
  return JSON.parse(await loc.innerText());
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").trim();
  const full =
    m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relLuminance(hexToRgb(a));
  const lb = relLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const CTA_LABELS = {
  hosted: "REQUEST A SEAT",
  salon: "APPLY TO ATTEND",
  private: "APPLY TO HOST",
} as const;

function findColor(entries: StyledText[], text: string): string | null {
  const hit = entries.find((e) => e.text === text);
  return hit ? hit.color.toLowerCase() : null;
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`OS color scheme = ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("share cards render identical CTA + price meta text", async ({ page }) => {
      await page.goto("/e2e/share-card-price?priceCents=8500", {
        waitUntil: "domcontentloaded",
      });

      const hosted = await readTexts(page, "hosted-texts");
      const salon = await readTexts(page, "hosted-salon-texts");
      const pd = await readTexts(page, "private-texts");

      // CTAs are unaffected by OS color scheme.
      expect(hosted).toContain(CTA_LABELS.hosted);
      expect(salon).toContain(CTA_LABELS.salon);
      expect(pd).toContain(CTA_LABELS.private);

      // Price meta still renders the plain "$N" listing copy.
      expect(hosted).toContain("$85");
      expect(salon).toContain("$85");
      expect(pd).toContain("$85");
    });

    test("CTA fg + price meta use fixed palette tokens (no theme drift)", async ({
      page,
    }) => {
      await page.goto("/e2e/share-card-price?priceCents=8500", {
        waitUntil: "domcontentloaded",
      });

      const palettes = await readPalettes(page);
      const hostedP = palettes.hosted_table;
      const privateP = palettes.private_dining;

      const hosted = await readStyled(page, "hosted-styled");
      const salon = await readStyled(page, "hosted-salon-styled");
      const pd = await readStyled(page, "private-styled");

      // Hosted (default + salon) CTAs: accent bg + onAccent fg.
      expect(findColor(hosted, CTA_LABELS.hosted)).toBe(hostedP.onAccent.toLowerCase());
      expect(findColor(salon, CTA_LABELS.salon)).toBe(hostedP.onAccent.toLowerCase());
      // Private dining CTA: accent bg + onAccent fg.
      expect(findColor(pd, CTA_LABELS.private)).toBe(privateP.onAccent.toLowerCase());

      // Price meta token (right side) — hosted uses accent, private uses accent.
      expect(findColor(hosted, "$85")).toBe(hostedP.accent.toLowerCase());
      expect(findColor(salon, "$85")).toBe(hostedP.accent.toLowerCase());
      expect(findColor(pd, "$85")).toBe(privateP.accent.toLowerCase());
    });

    test("CTA preserves WCAG AA contrast against its button background", async ({
      page,
    }) => {
      await page.goto("/e2e/share-card-price?priceCents=8500", {
        waitUntil: "domcontentloaded",
      });

      const palettes = await readPalettes(page);
      const hostedP = palettes.hosted_table;
      const privateP = palettes.private_dining;

      const hosted = await readStyled(page, "hosted-styled");
      const salon = await readStyled(page, "hosted-salon-styled");
      const pd = await readStyled(page, "private-styled");

      const hostedFg = findColor(hosted, CTA_LABELS.hosted)!;
      const salonFg = findColor(salon, CTA_LABELS.salon)!;
      const pdFg = findColor(pd, CTA_LABELS.private)!;

      // drawCta(...) bgs: hosted=accent, salon=accent, private=accent.
      expect(contrastRatio(hostedFg, hostedP.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(salonFg, hostedP.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(pdFg, privateP.accent)).toBeGreaterThanOrEqual(4.5);

      // The dark private-dining card must also keep its body text legible
      // on its dark background (ink vs bg).
      expect(contrastRatio(privateP.ink, privateP.bg)).toBeGreaterThanOrEqual(4.5);
    });

    test("price-absent fallback copy keeps contrast in every flow", async ({
      page,
    }) => {
      await page.goto("/e2e/share-card-price?priceCents=null", {
        waitUntil: "domcontentloaded",
      });

      const palettes = await readPalettes(page);
      const hostedP = palettes.hosted_table;
      const privateP = palettes.private_dining;

      const hosted = await readStyled(page, "hosted-styled");
      const pd = await readStyled(page, "private-styled");

      const hostedFallback = findColor(hosted, "PRICING TBA");
      const pdFallback = findColor(pd, "INQUIRE FOR PRICING");
      expect(hostedFallback).toBe(hostedP.accent.toLowerCase());
      expect(pdFallback).toBe(privateP.accent.toLowerCase());

      // Fallback text sits on the bottom panel (bg). Must stay readable.
      expect(contrastRatio(hostedFallback!, hostedP.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(pdFallback!, privateP.bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
}

test("CTA colors are byte-identical between light and dark OS color schemes", async ({
  browser,
}) => {
  const capture = async (scheme: "light" | "dark") => {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto("/e2e/share-card-price?priceCents=8500", {
      waitUntil: "domcontentloaded",
    });
    const hosted = await readStyled(page, "hosted-styled");
    const salon = await readStyled(page, "hosted-salon-styled");
    const pd = await readStyled(page, "private-styled");
    await ctx.close();
    return {
      hosted: findColor(hosted, CTA_LABELS.hosted),
      salon: findColor(salon, CTA_LABELS.salon),
      pd: findColor(pd, CTA_LABELS.private),
    };
  };

  const light = await capture("light");
  const dark = await capture("dark");
  expect(dark).toEqual(light);
});
