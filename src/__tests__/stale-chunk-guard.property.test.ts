import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  GUARD_MS,
  GUARD_ROUND_MS,
  computeGuardRemainingMs,
} from "@/lib/stale-chunk-guard";

const SEED = 0xc0ffee;

// Where to dump the first failing counterexample for later replay.
// Override with FAST_CHECK_FAILURE_FILE=/path/to/file.json.
const FAILURE_FILE = resolve(
  process.env.FAST_CHECK_FAILURE_FILE ??
    ".fast-check-failures/stale-chunk-guard.json",
);

// Module-level latch: only the FIRST failure across the whole test run is
// exported. Subsequent failures still print their reporter output but won't
// overwrite the captured counterexample.
let captured = false;

function exportFailure<T extends unknown[]>(label: string, out: fc.RunDetails<T>) {
  if (captured) return;
  captured = true;
  const payload = {
    label,
    file: "src/__tests__/stale-chunk-guard.property.test.ts",
    capturedAt: new Date().toISOString(),
    seed: out.seed,
    seedHex: `0x${(out.seed >>> 0).toString(16).toUpperCase()}`,
    path: out.counterexamplePath,
    numRuns: out.numRuns,
    numShrinks: out.numShrinks,
    counterexample: out.counterexample,
    errorMessage:
      out.errorInstance instanceof Error
        ? out.errorInstance.message
        : String(out.errorInstance ?? ""),
    replay: {
      seed: out.seed,
      path: out.counterexamplePath,
      endOnFailure: true,
    },
    cli: `bunx vitest run src/__tests__/stale-chunk-guard.property.test.ts -t ${JSON.stringify(label)}`,
  };
  try {
    mkdirSync(dirname(FAILURE_FILE), { recursive: true });
    writeFileSync(FAILURE_FILE, JSON.stringify(payload, null, 2) + "\n");
    // eslint-disable-next-line no-console
    console.error(`  wrote replay file: ${FAILURE_FILE}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`  failed to write ${FAILURE_FILE}:`, e);
  }
}

/**
 * Custom fast-check reporter that, on failure, prints a copy-pasteable
 * reproduction line (seed, path, counterexample, failing run #) and a
 * ready-to-run vitest command, exports the first failure to a JSON replay
 * file, then throws the original error so vitest marks the test as failed.
 */
function reproReporter(label: string) {
  return <T extends unknown[]>(out: fc.RunDetails<T>) => {
    if (!out.failed) return;
    const seedHex = `0x${(out.seed >>> 0).toString(16).toUpperCase()}`;
    const counter = JSON.stringify(out.counterexample);
    const lines = [
      "",
      `  ── fast-check failure: ${label} ──`,
      `  seed:           ${out.seed}  (${seedHex})`,
      `  path:           "${out.counterexamplePath}"`,
      `  failing run #:  ${out.numRuns}`,
      `  shrinks:        ${out.numShrinks}`,
      `  counterexample: ${counter}`,
      `  reproduce:      { seed: ${out.seed}, path: "${out.counterexamplePath}", endOnFailure: true }`,
      `  cli:            bunx vitest run src/__tests__/stale-chunk-guard.property.test.ts -t ${JSON.stringify(label)}`,
      "",
    ];
    // eslint-disable-next-line no-console
    console.error(lines.join("\n"));
    exportFailure(label, out);
    throw out.errorInstance ?? new Error(`Property "${label}" failed (seed=${out.seed}, path=${out.counterexamplePath})`);
  };
}

const params = (label: string, numRuns: number) => {
  // Replay override: when FAST_CHECK_REPLAY_LABEL matches this property,
  // use the stored seed/path instead of the default. Set by scripts/replay-fast-check.ts.
  const replayLabel = process.env.FAST_CHECK_REPLAY_LABEL;
  const replaySeed = process.env.FAST_CHECK_REPLAY_SEED;
  const replayPath = process.env.FAST_CHECK_REPLAY_PATH;
  const isReplay = replayLabel === label && replaySeed && replayPath;
  return {
    numRuns: isReplay ? 1 : numRuns,
    seed: isReplay ? Number(replaySeed) : SEED,
    path: isReplay ? replayPath! : "0",
    endOnFailure: isReplay ? true : undefined,
    reporter: reproReporter(label),
  };
};




describe("computeGuardRemainingMs — property-based", () => {
  it("is always in [0, GUARD_MS] and a multiple of GUARD_ROUND_MS", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 42 }),
        fc.integer({ min: 0, max: 2 ** 42 }),
        (guardUntil, now) => {
          const v = computeGuardRemainingMs(guardUntil, now);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(GUARD_MS);
          expect(v % GUARD_ROUND_MS).toBe(0);
        },
      ),
      params('is always in [0, GUARD_MS] and a multiple of GUARD_ROUND_MS', 500),
    );
  });

  it("is 0 whenever the guard has expired (guardUntil <= now)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 42 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (guardUntil, delta) => {
          // now >= guardUntil → expired
          const now = guardUntil + delta;
          expect(computeGuardRemainingMs(guardUntil, now)).toBe(0);
        },
      ),
      params('is 0 whenever the guard has expired (guardUntil <= now)', 500),
    );
  });

  it("approximates the raw delta within half a rounding step when in range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: GUARD_MS }),
        (raw) => {
          const v = computeGuardRemainingMs(raw, 0);
          // Rounded to nearest GUARD_ROUND_MS, so error ≤ GUARD_ROUND_MS/2.
          expect(Math.abs(v - raw)).toBeLessThanOrEqual(GUARD_ROUND_MS / 2);
        },
      ),
      params('approximates the raw delta within half a rounding step when in range', 500),
    );
  });

  it("clamps to GUARD_MS for any raw delta >= GUARD_MS + half-step", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: GUARD_MS + GUARD_ROUND_MS, max: 2 ** 42 }),
        (raw) => {
          expect(computeGuardRemainingMs(raw, 0)).toBe(GUARD_MS);
        },
      ),
      params('clamps to GUARD_MS for any raw delta >= GUARD_MS + half-step', 500),
    );
  });

  it("is monotonically non-increasing as `now` advances for fixed guardUntil", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 40 }),
        fc.array(fc.integer({ min: 0, max: 10 * GUARD_MS }), {
          minLength: 2,
          maxLength: 25,
        }),
        (guardUntil, deltas) => {
          const sortedNows = deltas
            .map((d) => guardUntil + d - 5 * GUARD_MS)
            .sort((a, b) => a - b);
          let prev = Number.POSITIVE_INFINITY;
          for (const now of sortedNows) {
            const v = computeGuardRemainingMs(guardUntil, now);
            expect(v).toBeLessThanOrEqual(prev);
            prev = v;
          }
        },
      ),
      params('is monotonically non-increasing as `now` advances for fixed guardUntil', 200),
    );
  });

  // ---- Numeric-limit edge cases ----
  // sessionStorage values are strings, so guardUntil/now arrive as parsed
  // numbers. Make sure nothing overflows or loses invariants around common
  // boundaries: signed 32-bit (2^31), unsigned 32-bit (2^32), the legacy
  // 2038 epoch boundary, and Number.MAX_SAFE_INTEGER.

  const BOUNDARIES = [
    0,
    1,
    GUARD_MS,
    2 ** 31 - 1, // INT32_MAX
    2 ** 31, // INT32_MAX + 1
    2 ** 32 - 1, // UINT32_MAX
    2 ** 32, // UINT32_MAX + 1
    2 ** 53 - 1, // MAX_SAFE_INTEGER
  ];

  it("holds invariants at numeric boundaries (cartesian)", () => {
    for (const guardUntil of BOUNDARIES) {
      for (const now of BOUNDARIES) {
        const v = computeGuardRemainingMs(guardUntil, now);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(GUARD_MS);
        expect(v % GUARD_ROUND_MS).toBe(0);
        if (guardUntil <= now) expect(v).toBe(0);
      }
    }
  });

  it("holds invariants for values jittered around boundaries", () => {
    const boundary = fc.constantFrom(...BOUNDARIES);
    const jitter = fc.integer({ min: -GUARD_MS * 2, max: GUARD_MS * 2 });
    fc.assert(
      fc.property(boundary, jitter, boundary, jitter, (gb, gj, nb, nj) => {
        // Clamp to MAX_SAFE_INTEGER to avoid feeding unsafe floats.
        const guardUntil = Math.max(
          0,
          Math.min(Number.MAX_SAFE_INTEGER, gb + gj),
        );
        const now = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, nb + nj));
        const v = computeGuardRemainingMs(guardUntil, now);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(GUARD_MS);
        expect(v % GUARD_ROUND_MS).toBe(0);
      }),
      params('holds invariants for values jittered around boundaries', 1000),
    );
  });

  it("never produces NaN/Infinity even when guardUntil exceeds MAX_SAFE_INTEGER", () => {
    const cases: Array<[number, number, number]> = [
      [Number.MAX_SAFE_INTEGER, 0, GUARD_MS],
      [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0],
      [Number.MAX_SAFE_INTEGER + 1, 0, GUARD_MS], // unsafe but finite
      [Number.MAX_VALUE, 0, GUARD_MS],
    ];
    for (const [g, n, expected] of cases) {
      const v = computeGuardRemainingMs(g, n);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(expected);
    }
  });
});


