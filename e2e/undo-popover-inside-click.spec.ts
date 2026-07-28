import { test, expect } from "@playwright/test";

/**
 * E2E: clicking inside the Export popover panel (on a control, not the
 * trigger) does NOT dismiss the popover and focus stays within the
 * popover controls.
 *
 * This guards against accidental dismissal overlay bugs where an inside
 * click bubbles up and hits the dismiss overlay.
 */
test.describe("Undo popover — inside click keeps popover open", () => {
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
    // Allow React to hydrate before interacting.
    await page.waitForTimeout(500);
  });

  test("popover stays open and focus remains inside after clicking a control", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Sanity check: popover is open.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    // Click inside the popover on a control (the "From" date input).
    const fromInput = page.getByRole("textbox", { name: /from/i });
    await expect(fromInput).toBeVisible();
    await fromInput.click();

    // Popover is still open.
    await expect(typeCombo).toHaveCount(1);
    await expect(typeCombo).toBeVisible();

    // Focus is on the clicked control inside the popover.
    await expect(fromInput).toBeFocused();
  });

  test("clicking the Undo toast duration select keeps popover open", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    const undoCombo = page.getByRole("combobox", {
      name: /undo toast duration/i,
    });
    await expect(undoCombo).toBeVisible({ timeout: 5000 });

    // Click on the Undo toast duration select.
    await undoCombo.click();

    // Popover is still open.
    await expect(undoCombo).toHaveCount(1);
    await expect(undoCombo).toBeVisible();

    // Focus is on the clicked control inside the popover.
    await expect(undoCombo).toBeFocused();
  });
});
