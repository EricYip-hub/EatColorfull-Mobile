import { test, expect } from "@playwright/test";

/**
 * E2E: clicking outside the Export popover dismisses it and returns
 * focus to the trigger so keyboard users remain anchored.
 */
test.describe("Undo popover — overlay dismiss returns focus", () => {
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

  test("focus returns to trigger after popover is dismissed via overlay", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Focus a control inside the popover so we can detect the return.
    await page.getByRole("combobox", { name: /^type$/i }).focus();
    await expect(
      page.getByRole("combobox", { name: /^type$/i }),
    ).toBeFocused();

    // Click the dismiss overlay (the fixed inset div behind the panel).
    // Use a corner click so we hit the overlay, not the panel itself.
    await page.mouse.click(5, 5);

    // Popover content is gone.
    await expect(
      page.getByRole("combobox", { name: /^type$/i }),
    ).toHaveCount(0);

    // And focus is back on the trigger.
    await expect(trigger).toBeFocused();
  });

  test("focus returns to trigger after clicking the backdrop element directly", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Focus a control inside the popover so the focus-return assertion
    // is meaningful.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Click the actual backdrop element (not just empty coordinates).
    const backdrop = page.getByTestId("popover-backdrop");
    await expect(backdrop).toBeVisible();
    await backdrop.click();

    // Popover content is gone.
    await expect(typeCombo).toHaveCount(0);

    // And focus is back on the trigger.
    await expect(trigger).toBeFocused();
  });
});
