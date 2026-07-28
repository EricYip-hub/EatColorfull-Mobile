// Shared helper for marking events as ENDED once their end time has passed.
// Keep all event end timestamps in one place so the UI updates automatically
// without manual edits as time moves forward.

import { useEffect, useState } from "react";

export function isEventEnded(endsAt: Date | string | number, now: Date = new Date()): boolean {
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  if (isNaN(end.getTime())) return false;
  return end.getTime() <= now.getTime();
}

/**
 * Reactive version of `isEventEnded` that auto-flips to `true` the moment
 * an event's end time passes — no page reload required. Schedules a single
 * timeout for the exact crossover, and also re-checks when the tab regains
 * focus (handles laptops waking from sleep).
 */
export function useIsEventEnded(endsAt: Date | string | number): boolean {
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const endTime = end.getTime();
  const [ended, setEnded] = useState<boolean>(() =>
    isNaN(endTime) ? false : endTime <= Date.now(),
  );

  useEffect(() => {
    if (isNaN(endTime)) return;
    const check = () => {
      const isEnded = endTime <= Date.now();
      setEnded(isEnded);
      return isEnded;
    };
    if (check()) return;

    // setTimeout maxes out around ~24.8 days; clamp and re-arm if further.
    const MAX_DELAY = 2_147_483_000;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        setEnded(true);
        return;
      }
      timer = setTimeout(() => {
        if (!check()) schedule();
      }, Math.min(remaining, MAX_DELAY));
    };
    schedule();

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [endTime]);

  return ended;
}

// Pacific Time (America/Los_Angeles) offsets. We use explicit ISO strings with
// the correct PDT (-07:00) / PST (-08:00) offset for each event so the cutoff
// is unambiguous across server SSR and client renders.
export const EVENT_END = {
  // Molino Wednesday Pop-Up — Wed, June 3, 2026, 4:30 PM PT
  molinoWednesdayJune3: new Date("2026-06-03T16:30:00-07:00"),
  // Molino Saturday Night Pop-Up — Sat, June 6, 2026 → ends Sun, June 7, 12:30 AM PT
  molinoSaturdayJune6: new Date("2026-06-07T00:30:00-07:00"),
  // Irie Supper Club — Wed, June 3, 2026 (evening rooftop dinner). End at midnight PT.
  irieSupperClubJune3: new Date("2026-06-04T00:00:00-07:00"),
  // A Night with Richie Million Jr. — Tue, June 2, 2026. End at midnight PT.
  richieTuesdayJune2: new Date("2026-06-03T00:00:00-07:00"),
  // Vintage 1986 — Mon, June 8, 2026, 8 PM PT. End ~3 AM Tue Jun 9 PT.
  vintage1986June8: new Date("2026-06-09T03:00:00-07:00"),
} as const;
