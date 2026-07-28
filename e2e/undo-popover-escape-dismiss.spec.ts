import { test, expect } from "@playwright/test";

/**
 * E2E: pressing Escape while the Undo popover is open dismisses it and
 * returns focus to the "Export audit history" trigger so keyboard users
 * remain anchored.
 */
test.describe("Undo popover — Escape dismiss returns focus", () => {
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
    // Give React a moment to hydrate the SSR markup so click handlers
    // are attached before tests interact with the popover.
    await page.waitForTimeout(500);
  });

  test("focus returns to trigger after Escape closes the popover", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Wait for the popover to open and hydrate.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    // Focus a control inside the popover so the focus-return assertion
    // is meaningful.
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Press Escape to close the popover.
    await page.keyboard.press("Escape");

    // Popover content is gone.
    await expect(typeCombo).toHaveCount(0);

    // And focus is back on the trigger.
    await expect(trigger).toBeFocused();
  });
});
