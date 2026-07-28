import { test, expect } from "@playwright/test";

/**
 * E2E: focus must return to the "Export audit history" trigger when
 * the Undo countdown preview completes.
 *
 * This keeps keyboard users anchored on a known control after the
 * transient countdown UI tears itself down.
 */
test.describe("Undo countdown — focus returns to Export trigger", () => {
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

  test("focus returns to trigger after countdown expires", async ({ page }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Start a fresh 3s countdown (5s → 3s).
    await page
      .getByRole("combobox", { name: /undo toast duration/i })
      .selectOption("3");

    // Move focus elsewhere inside the popover so the assertion is
    // meaningful — focus must be actively moved BACK to the trigger.
    await page.getByRole("combobox", { name: /^type$/i }).focus();
    await expect(
      page.getByRole("combobox", { name: /^type$/i }),
    ).toBeFocused();

    // Wait for the expiration announcement, confirming the countdown
    // finished and the focus-return effect has run.
    const expiredRegion = page
      .locator('[aria-live="polite"].sr-only')
      .nth(1);
    await expect(expiredRegion).toHaveText(
      "Undo window expired. Reset is now permanent.",
      { timeout: 4000 },
    );

    await expect(trigger).toBeFocused();
  });

});
