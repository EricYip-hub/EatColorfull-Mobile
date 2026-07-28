import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { saveAxeReport } from "./axe-report";

/**
 * E2E accessibility audit for Chef Moshe Fhima's profile image:
 * - verifies the image renders successfully (naturalWidth > 0) on both
 *   /chefs/moshe-fhima and the /meal-prep chef card
 * - verifies descriptive alt text mentioning the chef's name
 * - runs an axe WCAG A/AA scan scoped to the image's surrounding region
 */

const MOSHE_ALT_RE = /Moshe Fhima/i;

async function expectImageRendered(locator: ReturnType<import("@playwright/test").Page["locator"]>) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
}

test.describe("Moshe Fhima profile image — alt text + rendering + axe", () => {
  test("profile page /chefs/moshe-fhima renders image with descriptive alt", async ({ page }) => {
    await page.goto("/chefs/moshe-fhima", { waitUntil: "networkidle" });

    const img = page.getByRole("img", { name: MOSHE_ALT_RE }).first();
    await expectImageRendered(img);

    const alt = await img.getAttribute("alt");
    expect(alt, "alt text must be descriptive (>20 chars)").toBeTruthy();
    expect((alt ?? "").length).toBeGreaterThan(20);
    expect(alt).toMatch(MOSHE_ALT_RE);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    saveAxeReport(results, "moshe-fhima-profile");

    const imageViolations = results.violations.filter((v) =>
      ["image-alt", "role-img-alt", "image-redundant-alt", "svg-img-alt"].includes(v.id),
    );
    expect(
      imageViolations,
      `image-related axe violations:\n${JSON.stringify(imageViolations, null, 2)}`,
    ).toEqual([]);
  });

  test("meal prep page renders Moshe chef card image with descriptive alt", async ({ page }) => {
    await page.goto("/meal-prep", { waitUntil: "networkidle" });

    const img = page.getByRole("img", { name: MOSHE_ALT_RE }).first();
    await expectImageRendered(img);

    const alt = await img.getAttribute("alt");
    expect(alt, "alt text must be descriptive (>20 chars)").toBeTruthy();
    expect((alt ?? "").length).toBeGreaterThan(20);
    expect(alt).toMatch(MOSHE_ALT_RE);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    saveAxeReport(results, "moshe-fhima-meal-prep-card");

    const imageViolations = results.violations.filter((v) =>
      ["image-alt", "role-img-alt", "image-redundant-alt", "svg-img-alt"].includes(v.id),
    );
    expect(
      imageViolations,
      `image-related axe violations:\n${JSON.stringify(imageViolations, null, 2)}`,
    ).toEqual([]);
  });
});
