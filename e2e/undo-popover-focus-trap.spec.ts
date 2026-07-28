import { test, expect } from "@playwright/test";

/**
 * E2E: Tab and Shift+Tab cycling through the Export popover controls
 * keeps focus inside the popover. Focus only returns to the trigger
 * after the popover is dismissed (Escape).
 *
 * This guards against focus leaking out of the modal surface and
 * getting lost on the underlying page.
 */
test.describe("Undo popover — Tab focus stays trapped inside", () => {
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
    // Give React a moment to hydrate the SSR markup.
    await page.waitForTimeout(500);
  });

  test("Tab from last popover control wraps to first", async ({ page }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Wait for the popover to open.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    const downloadButton = page.getByRole("button", {
      name: /download csv/i,
    });
    await expect(downloadButton).toBeVisible();

    // Focus the last control inside the popover.
    await downloadButton.focus();
    await expect(downloadButton).toBeFocused();

    // Tab forward should wrap to the first control (focus trap).
    await page.keyboard.press("Tab");
    await expect(typeCombo).toBeFocused();
  });

  test("Shift+Tab from first popover control wraps to last", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    const downloadButton = page.getByRole("button", {
      name: /download csv/i,
    });
    await expect(downloadButton).toBeVisible();

    // Focus the first control inside the popover.
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Shift+Tab backward should wrap to the last control.
    await page.keyboard.press("Shift+Tab");
    await expect(downloadButton).toBeFocused();
  });

  test("focus escapes the popover only after Escape dismisses it", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    // Move focus to a control inside the popover.
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Dismiss the popover with Escape.
    await page.keyboard.press("Escape");

    // Popover is gone.
    await expect(typeCombo).toHaveCount(0);

    // Focus is back on the trigger.
    await expect(trigger).toBeFocused();

    // A subsequent Tab moves focus away from the trigger to the next
    // page element, proving focus has truly exited the popover surface.
    await page.keyboard.press("Tab");
    await expect(trigger).not.toBeFocused();
  });
});
