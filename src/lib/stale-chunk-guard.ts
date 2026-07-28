export const GUARD_MS = 30_000;
export const GUARD_ROUND_MS = 100;

/**
 * Clamp the raw `guardUntil - now` delta into the analytics-friendly
 * `guard_remaining_ms` value: bounded to [0, GUARD_MS] and rounded to the
 * nearest GUARD_ROUND_MS so payloads aren't noisy across repeat suppressions.
 */
export function computeGuardRemainingMs(
  guardUntil: number,
  now: number,
  guardMs: number = GUARD_MS,
  roundMs: number = GUARD_ROUND_MS,
): number {
  const raw = guardUntil - now;
  const rounded = Math.round(raw / roundMs) * roundMs;
  return Math.max(0, Math.min(guardMs, rounded));
}
