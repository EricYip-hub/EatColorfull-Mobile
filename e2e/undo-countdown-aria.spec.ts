import { test, expect } from "@playwright/test";

/**
 * E2E: drive the Undo toast countdown preview on the admin inbox and assert
 * the ARIA live region announces at the right moments.
 *
 * Trigger path:
 *   1. Open the "Export audit history" popover.
 *   2. Change the "Undo toast duration" select — this starts the live
 *      preview countdown and seeds the live regions.
 *   3. Watch the two sr-only `aria-live="polite"` regions:
 *        a. Countdown region — must announce the initial tick and the
 *           final (≤1s) tick, but NOT every intermediate second.
 *        b. Expiration region — must contain the exact copy
 *           "Undo window expired. Reset is now permanent." after 0.
 */
test("Undo countdown preview drives ARIA live region announcements at expected moments", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // Force the debounce to its max so we can verify suppression of mid-ticks
  // on a 3-second countdown (3s debounce, 3s timer → first + final only).
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

  // Open the export popover.
  await page.getByRole("button", { name: /export audit history/i }).click();

  // Locate both sr-only live regions inside the popover.
  const liveRegions = page.locator('[aria-live="polite"].sr-only');
  await expect(liveRegions).toHaveCount(2);
  const countdownRegion = liveRegions.nth(0);
  const expiredRegion = liveRegions.nth(1);

  // Both start empty.
  await expect(countdownRegion).toHaveText("");
  await expect(expiredRegion).toHaveText("");

  // Snapshot every distinct value the countdown region takes on so we can
  // assert announcements were debounced (not one-per-second).
  const announcements: string[] = [];
  let lastSeen = "";
  const sampler = setInterval(async () => {
    try {
      const txt = (await countdownRegion.textContent())?.trim() ?? "";
      if (txt !== lastSeen) {
        lastSeen = txt;
        announcements.push(txt);
      }
    } catch {
      /* page closed */
    }
  }, 100);

  // Change the duration from 5s → 3s to kick off a fresh 3-second preview
  // countdown. The first tick should announce immediately ("3 seconds to undo").
  await page
    .getByRole("combobox", { name: /undo toast duration/i })
    .selectOption("3");

  // a) Initial announcement appears.
  await expect(countdownRegion).toHaveText(/3 seconds to undo/, {
    timeout: 2000,
  });

  // b) Final-tick announcement appears (always announced regardless of debounce).
  await expect(countdownRegion).toHaveText(/1 seconds to undo/, {
    timeout: 4000,
  });

  // c) Expiration region carries the exact screen-reader copy.
  await expect(expiredRegion).toHaveText(
    "Undo window expired. Reset is now permanent.",
    { timeout: 3000 },
  );

  // d) After expiration the countdown region clears.
  await expect(countdownRegion).toHaveText("", { timeout: 2000 });

  clearInterval(sampler);

  // Debounce assertion: the *distinct* non-empty announcements during the
  // 3-second window must be a small, sensible set — NOT one per second.
  // With a 3s debounce and a 3s countdown we expect:
  //   "" → "3 seconds to undo" → "1 seconds to undo" → ""
  // i.e. exactly two non-empty values, and "2 seconds to undo" must NEVER
  // have been announced (it falls inside the debounce window).
  const nonEmpty = announcements.filter((a) => a.length > 0);
  expect(
    nonEmpty,
    `Expected debounced announcements, got: ${JSON.stringify(announcements)}`,
  ).toEqual(["3 seconds to undo", "1 seconds to undo"]);
  expect(announcements).not.toContain("2 seconds to undo");

  // No render-loop / runtime errors fired during the flow.
  const fatal = errors.find((e) =>
    /Maximum update depth|Too many re-renders/i.test(e),
  );
  expect(fatal, `Render loop detected: ${fatal}`).toBeUndefined();
});
