import { describe, it, expect } from "vitest";
import { computeAriaUpdate, EXPIRED_ANNOUNCEMENT } from "./aria-countdown";

describe("computeAriaUpdate — debounced ARIA tick updates", () => {
  it("announces the very first tick when no prior announcement exists", () => {
    const result = computeAriaUpdate({
      previewCountdown: 5,
      ariaDebounceSecs: 3,
      lastAnnouncedAt: null,
      now: 1000,
    });
    expect(result.shouldAnnounce).toBe(true);
    expect(result.nextAriaCountdown).toBe(5);
    expect(result.nextLastAnnouncedAt).toBe(1000);
  });

  it("suppresses intermediate ticks within the debounce window", () => {
    // 3s debounce, last announced 1s ago — should stay silent.
    const result = computeAriaUpdate({
      previewCountdown: 4,
      ariaDebounceSecs: 3,
      lastAnnouncedAt: 1_000,
      now: 2_000,
    });
    expect(result.shouldAnnounce).toBe(false);
    expect(result.nextAriaCountdown).toBe(null);
    expect(result.nextLastAnnouncedAt).toBe(1_000);
  });

  it("re-announces once the debounce interval has elapsed", () => {
    const result = computeAriaUpdate({
      previewCountdown: 7,
      ariaDebounceSecs: 3,
      lastAnnouncedAt: 1_000,
      now: 4_000, // exactly 3s later
    });
    expect(result.shouldAnnounce).toBe(true);
    expect(result.nextAriaCountdown).toBe(7);
    expect(result.nextLastAnnouncedAt).toBe(4_000);
  });

  it("respects different debounce intervals (10s tuning)", () => {
    const within = computeAriaUpdate({
      previewCountdown: 20,
      ariaDebounceSecs: 10,
      lastAnnouncedAt: 0,
      now: 9_000,
    });
    expect(within.shouldAnnounce).toBe(false);

    const after = computeAriaUpdate({
      previewCountdown: 20,
      ariaDebounceSecs: 10,
      lastAnnouncedAt: 0,
      now: 10_000,
    });
    expect(after.shouldAnnounce).toBe(true);
  });

  it("always announces the final tick (<=1s remaining) even mid-debounce", () => {
    const result = computeAriaUpdate({
      previewCountdown: 1,
      ariaDebounceSecs: 10,
      lastAnnouncedAt: 9_500, // only 500ms since last announcement
      now: 10_000,
    });
    expect(result.shouldAnnounce).toBe(true);
    expect(result.nextAriaCountdown).toBe(1);
  });

  it("clears the live region when the countdown reaches null (expired)", () => {
    const result = computeAriaUpdate({
      previewCountdown: null,
      ariaDebounceSecs: 3,
      lastAnnouncedAt: 5_000,
      now: 6_000,
    });
    expect(result.shouldAnnounce).toBe(false);
    expect(result.nextAriaCountdown).toBe(null);
    expect(result.nextLastAnnouncedAt).toBe(null);
  });

  it("only announces a sensible number of ticks across a full 10s countdown", () => {
    // Simulate a 10-second undo window ticking from 10 → 0 with a 3s debounce.
    // We expect roughly: initial (t=0), t>=3s, t>=6s, t>=9s, plus the final
    // <=1s tick — never every single second.
    const ariaDebounceSecs = 3;
    let lastAnnouncedAt: number | null = null;
    const announcements: number[] = [];

    for (let elapsed = 0; elapsed <= 10; elapsed++) {
      const previewCountdown = 10 - elapsed;
      const visible = previewCountdown > 0 ? previewCountdown : null;
      const now = elapsed * 1000;
      const r = computeAriaUpdate({
        previewCountdown: visible,
        ariaDebounceSecs,
        lastAnnouncedAt,
        now,
      });
      lastAnnouncedAt = r.nextLastAnnouncedAt;
      if (r.shouldAnnounce && r.nextAriaCountdown !== null) {
        announcements.push(r.nextAriaCountdown);
      }
    }

    // Way fewer than 10 (one-per-second) but more than just the bookends.
    expect(announcements.length).toBeGreaterThanOrEqual(3);
    expect(announcements.length).toBeLessThanOrEqual(6);
    // The final tick (1s remaining) must always be announced.
    expect(announcements).toContain(1);
  });
});

describe("EXPIRED_ANNOUNCEMENT — exact copy when countdown hits zero", () => {
  it("is the exact message screen readers receive on expiration", () => {
    expect(EXPIRED_ANNOUNCEMENT).toBe(
      "Undo window expired. Reset is now permanent.",
    );
  });
});
