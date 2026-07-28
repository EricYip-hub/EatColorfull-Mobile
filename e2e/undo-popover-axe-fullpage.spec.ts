import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { saveAxeReport } from "./axe-report";

/**
 * E2E: runs axe accessibility scans over the entire page in two
 * states — while the Undo/Export popover is open, and again after
 * it has been dismissed — to catch regressions that only surface
 * when the dialog is mounted (focus traps, aria-hidden conflicts,
 * duplicate ids, etc.).
 */
test.describe("Undo popover — full-page axe scans (open + closed)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("colorfull-aria-debounce-secs", "3");
        window.localStorage.setItem(
          "colorfull-audit-export-undo-timeout",
          "5",
        );
      } catch {
        /* ignore */
      }
    });
    await page.goto("/admin/inbox", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  });

  test("no axe violations while popover is open, and after it closes", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });

    // --- Open the popover ---
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: /filters/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const openResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    saveAxeReport(openResults, "undo-popover-open");

    expect(
      openResults.violations,
      `axe violations while popover open:\n${JSON.stringify(
        openResults.violations,
        null,
        2,
      )}`,
    ).toEqual([]);

    // --- Dismiss the popover ---
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    const closedResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    saveAxeReport(closedResults, "undo-popover-closed");

    expect(
      closedResults.violations,
      `axe violations after popover closed:\n${JSON.stringify(
        closedResults.violations,
        null,
        2,
      )}`,
    ).toEqual([]);
  });
});
