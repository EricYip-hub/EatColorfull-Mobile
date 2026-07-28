import { describe, it, expect } from "vitest";
import {
  GUARD_MS,
  computeGuardRemainingMs,
} from "@/lib/stale-chunk-guard";

describe("computeGuardRemainingMs", () => {
  it("clamps negative deltas to 0", () => {
    expect(computeGuardRemainingMs(1_000, 5_000)).toBe(0);
    expect(computeGuardRemainingMs(0, 1_000_000)).toBe(0);
  });

  it("clamps values above GUARD_MS to GUARD_MS", () => {
    expect(computeGuardRemainingMs(GUARD_MS * 10, 0)).toBe(GUARD_MS);
    expect(computeGuardRemainingMs(100_000, 0)).toBe(GUARD_MS);
  });

  it("rounds to the nearest 100 ms", () => {
    expect(computeGuardRemainingMs(1_049, 0)).toBe(1_000);
    expect(computeGuardRemainingMs(1_050, 0)).toBe(1_100);
    expect(computeGuardRemainingMs(1_099, 0)).toBe(1_100);
    expect(computeGuardRemainingMs(12_345, 0)).toBe(12_300);
    expect(computeGuardRemainingMs(12_355, 0)).toBe(12_400);
  });

  it("returns 0 for an exactly-expired guard", () => {
    expect(computeGuardRemainingMs(1_000, 1_000)).toBe(0);
  });

  it("returns GUARD_MS for a fresh guard", () => {
    const now = 1_000_000;
    expect(computeGuardRemainingMs(now + GUARD_MS, now)).toBe(GUARD_MS);
  });

  it("monotonically decreases across repeat suppressions and never goes negative", () => {
    const guardUntil = 30_000;
    let prev = Number.POSITIVE_INFINITY;
    for (let now = 0; now <= 35_000; now += 250) {
      const v = computeGuardRemainingMs(guardUntil, now);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(GUARD_MS);
      expect(v % 100).toBe(0);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    // After the guard fully expires, value stays clamped at 0.
    expect(computeGuardRemainingMs(guardUntil, 1_000_000)).toBe(0);
  });

  it("handles a missing guard (guardUntil = 0)", () => {
    expect(computeGuardRemainingMs(0, 0)).toBe(0);
    expect(computeGuardRemainingMs(0, 5_000)).toBe(0);
  });
});
