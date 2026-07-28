import { test, expect } from "@playwright/test";

/**
 * E2E: verify the Undo toast countdown preview's accessibility shape:
 *
 *  1. Focus order inside the "Export audit history" popover is the
 *     natural top-to-bottom reading order of the controls.
 *  2. While the countdown is running, the ONLY DOM nodes carrying
 *     the screen-reader announcement strings ("N seconds to undo",
 *     "Undo window expired. Reset is now permanent.") are the two
 *     sr-only aria-live="polite" regions — no other element on the
 *     page duplicates that announceable text.
 */

test.describe("Undo countdown preview — focus + ARIA isolation", () => {
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
    await page
      .getByRole("button", { name: /export audit history/i })
      .click();
  });

  test("focus order walks the popover controls top-to-bottom", async ({
    page,
  }) => {
    // Seed focus on the trigger (it stays focused after click).
    const trigger = page.getByRole("button", {
      name: /export audit history/i,
    });
    await trigger.focus();
    await expect(trigger).toBeFocused();

    // Helper: tab and return the accessible signature of the focused element.
    const tabAndDescribe = async () => {
      await page.keyboard.press("Tab");
      return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role");
        // Prefer the associated <label> text for form controls.
        let name = "";
        const id = el.id;
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) name = lbl.textContent?.trim() ?? "";
        }
        if (!name) {
          const parentLabel = el.closest("label");
          if (parentLabel) name = parentLabel.textContent?.trim() ?? "";
        }
        if (!name) name = (el.textContent ?? "").trim();
        return { tag, role, name };
      });
    };

    const expected = [
      { tag: "select", match: /type/i },
      { tag: "input", match: /from/i },
      { tag: "input", match: /to/i },
      { tag: "select", match: /undo toast duration/i },
      { tag: "button", match: /^reset$/i },
      { tag: "button", match: /download csv|exporting/i },
    ];

    let lastName = "";
    for (const step of expected) {
      let focused = await tabAndDescribe();
      // Chrome date inputs have internal spinners that each consume a Tab
      // stop but keep document.activeElement on the same <input>. Skip
      // duplicates so we only assert when focus lands on a *new* control.
      while (focused && focused.name === lastName) {
        focused = await tabAndDescribe();
      }
      lastName = focused?.name ?? "";
      expect(focused, "focused element should exist").not.toBeNull();
      expect(focused!.tag).toBe(step.tag);
      expect(focused!.name).toMatch(step.match);
    }
  });

  test("aria-live regions are the only announceable countdown text", async ({
    page,
  }) => {
    const liveRegions = page.locator('[aria-live="polite"].sr-only');
    await expect(liveRegions).toHaveCount(2);

    // Kick off a fresh 3-second countdown.
    await page
      .getByRole("combobox", { name: /undo toast duration/i })
      .selectOption("3");

    // Wait until the live region has announced the initial tick so we
    // know the preview is actively running.
    await expect(liveRegions.nth(0)).toHaveText(/3 seconds to undo/, {
      timeout: 2000,
    });

    // Sample the DOM repeatedly during the countdown: every node that
    // matches the announceable copy MUST be one of the two sr-only
    // live regions. The visible countdown chip renders "3s" / "Undo
    // window" — never the full SR string — so any match elsewhere is
    // a duplicated announcement (e.g. an extra toast, a stray aria-live).
    const screenReaderRe =
      /\d+\s+seconds\s+to\s+undo|Undo window expired\. Reset is now permanent\./;

    const sampleStart = Date.now();
    while (Date.now() - sampleStart < 3500) {
      const offenders = await page.evaluate((reSrc) => {
        const re = new RegExp(reSrc);
        const out: Array<{ tag: string; text: string; sr: boolean }> = [];
        const walk = (node: Element) => {
          // Only consider elements that themselves carry text (not via
          // descendants) so we don't double-count ancestors.
          const own = Array.from(node.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => (n.textContent ?? "").trim())
            .join(" ")
            .trim();
          if (own && re.test(own)) {
            out.push({
              tag: node.tagName.toLowerCase(),
              text: own,
              sr:
                node.getAttribute("aria-live") === "polite" &&
                node.classList.contains("sr-only"),
            });
          }
          for (const child of Array.from(node.children)) walk(child);
        };
        walk(document.body);
        return out;
      }, screenReaderRe.source);

      // Every match must come from one of the two sr-only live regions.
      const nonLive = offenders.filter((o) => !o.sr);
      expect(
        nonLive,
        `Found announceable countdown text outside aria-live regions: ${JSON.stringify(nonLive)}`,
      ).toEqual([]);

      await page.waitForTimeout(250);
    }

    // After the window expires, the expiration copy is the exact SR
    // string and lives only in the second sr-only region.
    await expect(liveRegions.nth(1)).toHaveText(
      "Undo window expired. Reset is now permanent.",
      { timeout: 3000 },
    );
    const expiredMatches = await page.evaluate(() => {
      const target = "Undo window expired. Reset is now permanent.";
      const matches: Array<{ tag: string; sr: boolean }> = [];
      document.querySelectorAll("*").forEach((el) => {
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => (n.textContent ?? "").trim())
          .join(" ")
          .trim();
        if (own === target) {
          matches.push({
            tag: el.tagName.toLowerCase(),
            sr:
              el.getAttribute("aria-live") === "polite" &&
              el.classList.contains("sr-only"),
          });
        }
      });
      return matches;
    });
    expect(expiredMatches.length).toBeGreaterThanOrEqual(1);
    expect(expiredMatches.every((m) => m.sr)).toBe(true);
  });
});
