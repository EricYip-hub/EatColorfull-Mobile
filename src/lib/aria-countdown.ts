/**
 * Pure helpers for the Undo toast countdown ARIA live-region behaviour.
 *
 * Kept framework-free so the debounce logic and the exact expiration copy
 * can be unit-tested without rendering the admin inbox route.
 */

export const EXPIRED_ANNOUNCEMENT =
  "Undo window expired. Reset is now permanent.";

export interface AriaUpdateInput {
  /** Current visible countdown value, or null when no undo window is active. */
  previewCountdown: number | null;
  /** Configured debounce interval in seconds (1, 3, 5, 10). */
  ariaDebounceSecs: number;
  /** Timestamp (ms) of the last announcement, or null if none yet. */
  lastAnnouncedAt: number | null;
  /** Current time in ms (injected for deterministic tests). */
  now: number;
}

export interface AriaUpdateResult {
  /** Whether the live region should update on this tick. */
  shouldAnnounce: boolean;
  /** New `lastAnnouncedAt` value to persist (unchanged if not announcing). */
  nextLastAnnouncedAt: number | null;
  /** New value for the ARIA countdown state. */
  nextAriaCountdown: number | null;
}

/**
 * Decide whether the ARIA live region should announce the current
 * countdown tick. Announcements fire when:
 *   - The countdown has just reset (no prior announcement), OR
 *   - The debounce interval has elapsed since the last announcement, OR
 *   - The countdown is about to expire (<= 1 second remaining).
 *
 * When `previewCountdown` is null the live region is cleared.
 */
export function computeAriaUpdate(input: AriaUpdateInput): AriaUpdateResult {
  const { previewCountdown, ariaDebounceSecs, lastAnnouncedAt, now } = input;

  if (previewCountdown === null) {
    return {
      shouldAnnounce: false,
      nextLastAnnouncedAt: null,
      nextAriaCountdown: null,
    };
  }

  const debounceMs = ariaDebounceSecs * 1000;
  const shouldAnnounce =
    lastAnnouncedAt === null ||
    now - lastAnnouncedAt >= debounceMs ||
    previewCountdown <= 1;

  return {
    shouldAnnounce,
    nextLastAnnouncedAt: shouldAnnounce ? now : lastAnnouncedAt,
    nextAriaCountdown: shouldAnnounce ? previewCountdown : null,
  };
}
