import { test, expect } from "@playwright/test";

/**
 * E2E: clicking on an actual page element outside the Export popover
 * (the "Inbox" page heading) dismisses the popover and returns focus
 * to the Export trigger.
 *
 * This complements the overlay-corner-click coverage in
 * undo-popover-overlay-dismiss.spec.ts by exercising a click that
 * targets a real, semantic page element a user can see — not an
 * arbitrary empty coordinate. (The popover's dismiss overlay still
 * intercepts the click, which is the intended behavior.)
 */
test.describe("Undo popover — outside-element click returns focus", () => {
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

  test("focus returns to trigger after clicking the Inbox heading outside the popover", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Sanity check: popover is open.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    // Move focus inside the popover so the focus-return assertion is
    // meaningful.
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Click an actual page element outside the popover — the "Inbox"
    // page heading. force:true bypasses the dismiss overlay's
    // pointer-events interception so Playwright dispatches the click
    // at the heading's coordinates; React still receives the bubbled
    // event via the overlay's onClick (since the overlay sits above
    // the heading) and closes the popover.
    const heading = page.getByRole("heading", { name: /^inbox$/i, level: 1 });
    await expect(heading).toBeVisible();
    await heading.click({ force: true });

    // Popover content is gone.
    await expect(typeCombo).toHaveCount(0);

    // And focus is back on the trigger.
    await expect(trigger).toBeFocused();
  });

  test("focus returns to trigger after clicking the Host applications tab outside the popover", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.click();

    // Sanity check: popover is open.
    const typeCombo = page.getByRole("combobox", { name: /^type$/i });
    await expect(typeCombo).toBeVisible({ timeout: 5000 });

    // Move focus inside the popover so the focus-return assertion is
    // meaningful.
    await typeCombo.focus();
    await expect(typeCombo).toBeFocused();

    // Click an interactive page element outside the popover — the
    // "Host applications" tab. force:true bypasses the dismiss overlay's
    // pointer-events interception.
    const hostTab = page.getByRole("button", { name: /host applications/i });
    await expect(hostTab).toBeVisible();
    await hostTab.click({ force: true });

    // Popover content is gone.
    await expect(typeCombo).toHaveCount(0);

    // And focus is back on the trigger.
    await expect(trigger).toBeFocused();
  });
});
