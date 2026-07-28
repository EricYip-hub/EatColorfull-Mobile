import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { saveAxeReport } from "./axe-report";

/**
 * E2E: verifies the Undo popover exposes correct ARIA roles and
 * accessible names, and passes an axe accessibility scan scoped to
 * the popover dialog.
 */
test.describe("Undo popover — ARIA roles, names, and axe scan", () => {
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

  test("popover has dialog role, accessible name, and no axe violations", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });

    // Trigger advertises popover semantics.
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Dialog is present with an accessible name from the heading.
    const dialog = page.getByRole("dialog", { name: /filters/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Controls within the popover have accessible names.
    await expect(
      dialog.getByRole("combobox", { name: /^type$/i }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /download csv/i }),
    ).toBeVisible();

    // aria-controls on the trigger points at the dialog's id.
    const controlsId = await trigger.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    await expect(dialog).toHaveAttribute("id", controlsId!);

    // Run axe scoped to the dialog. Fail on any violations.
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    saveAxeReport(results, "undo-popover-dialog");

    expect(
      results.violations,
      `axe violations:\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([]);
  });
});
