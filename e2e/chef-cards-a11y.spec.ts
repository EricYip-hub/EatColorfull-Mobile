import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { saveAxeReport } from "./axe-report";

/**
 * Generic a11y-guard for chef card surfaces beyond the dedicated
 * Moshe Fhima checks. Asserts that on each listing/discovery page:
 *  - every non-decorative <img> renders (naturalWidth > 0)
 *  - every <img> has a descriptive alt (>= 5 chars, not the filename)
 *  - no image-related WCAG A/AA axe violations fire
 *
 * Dynamic chef profile routes (/chefs/$chefId, /chef/$handle) are not
 * exercised because chef_profiles is empty — add fixtures + a test
 * case here once seeded.
 */

const FILENAME_RE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
const IMAGE_AXE_RULES = [
  "image-alt",
  "role-img-alt",
  "image-redundant-alt",
  "svg-img-alt",
];

async function auditImagesOnPage(page: Page, path: string, reportName: string) {
  await page.goto(path, { waitUntil: "networkidle" });

  const imgs = page.locator("img:visible");
  const count = await imgs.count();
  expect(count, `expected at least one image on ${path}`).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    const alt = (await img.getAttribute("alt")) ?? "";
    const src = (await img.getAttribute("src")) ?? "(no src)";

    // Decorative images (alt="") are allowed; everything else must be descriptive.
    if (alt !== "") {
      expect(
        alt.length,
        `alt too short on ${path} img[src="${src}"]: "${alt}"`,
      ).toBeGreaterThanOrEqual(5);
      expect(
        FILENAME_RE.test(alt),
        `alt looks like a filename on ${path} img[src="${src}"]: "${alt}"`,
      ).toBe(false);
    }

    const rendered = await img.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
    );
    expect(rendered, `image failed to render on ${path}: ${src}`).toBe(true);
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  saveAxeReport(results, reportName);

  const imageViolations = results.violations.filter((v) =>
    IMAGE_AXE_RULES.includes(v.id),
  );
  expect(
    imageViolations,
    `image-related axe violations on ${path}:\n${JSON.stringify(imageViolations, null, 2)}`,
  ).toEqual([]);
}

test.describe("Chef card surfaces — image rendering + alt text + axe", () => {
  test("/meal-prep cards have descriptive alts and render", async ({ page }) => {
    await auditImagesOnPage(page, "/meal-prep", "meal-prep-cards");
  });

  test("/tastemakers cards have descriptive alts and render", async ({ page }) => {
    await auditImagesOnPage(page, "/tastemakers", "tastemakers-cards");
  });
});
