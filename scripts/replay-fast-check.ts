#!/usr/bin/env bun
/**
 * Replay a previously-captured fast-check failure.
 *
 * Usage:
 *   bun run scripts/replay-fast-check.ts [file] [options]
 *
 * Positional:
 *   file                      Path to JSON failure file.
 *                             Default: $FAST_CHECK_FAILURE_FILE or
 *                             .fast-check-failures/stale-chunk-guard.json
 *
 * Selection (when the file contains multiple failures as a JSON array):
 *   -i, --index <n>           Pick failure at index n (0-based). Default: 0.
 *   -m, --match <substr>      Pick first failure whose label includes <substr>
 *                             (case-insensitive). Overrides --index.
 *   -l, --list                Print all failures in the file and exit.
 *
 * Batch:
 *   -a, --all                 Replay every failure in .fast-check-failures/
 *                             sequentially until one fails.
 *
 * Overrides (applied after selection — handy for one-off experiments):
 *       --label <label>       Override the test label used for vitest -t.
 *       --seed <seed>         Override the replay seed.
 *       --path <path>         Override the replay fast-check path.
 *
 *   -h, --help                Show this help.
 *
 * The chosen entry's seed/path/label are passed through FAST_CHECK_REPLAY_*
 * env vars so the property reruns with { seed, path, endOnFailure: true,
 * numRuns: 1 } and reproduces the same case in one shot.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { z, ZodError } from "zod";

// Schema for a single captured failure. Keep this in sync with
// exportFailure() in src/__tests__/stale-chunk-guard.property.test.ts.
const FailureSchema = z
  .object({
    label: z.string().min(1, "label must be a non-empty string"),
    file: z.string().min(1, "file must be a non-empty string"),
    seed: z.number().int("seed must be an integer"),
    path: z.string().min(1, 'path must be a non-empty string (e.g. "0")'),
    counterexample: z.unknown(),
    replay: z
      .object({
        seed: z.number().int(),
        path: z.string().min(1),
        endOnFailure: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough();

const FileSchema = z.union([FailureSchema, z.array(FailureSchema).min(1)]);

type Failure = z.infer<typeof FailureSchema>;

function formatZodError(err: ZodError): string {
  return err.issues
    .map((i) => `    - ${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`)
    .join("\n");
}

/**
 * Parse + validate a failure file. Returns the normalized failure array, or
 * exits with a clear, actionable error message on malformed input.
 */
function loadFailureFile(file: string): Failure[] {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`Failed to read ${file}: ${(e as Error).message}`);
    process.exit(2);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON in ${file}: ${(e as Error).message}`);
    process.exit(2);
  }

  // Branch on shape so zod issue paths point at the actual offending field
  // (e.g. "[2].seed") instead of a generic union mismatch at the root.
  const isArray = Array.isArray(json);
  const schema = isArray ? z.array(FailureSchema).min(1, "array must contain at least one failure") : FailureSchema;
  const result = schema.safeParse(json);
  if (!result.success) {
    console.error(`Failure file ${file} does not match expected schema:`);
    console.error(formatZodError(result.error));
    console.error(
      `\nExpected one failure object or a non-empty array of failure objects with required\n` +
        `fields: label (string), file (string), seed (integer), path (string), counterexample.`,
    );
    process.exit(2);
  }

  return (isArray ? result.data : [result.data]) as Failure[];
}

type FailureEntry = { source: string; index: number; failure: Failure };

function printHelp() {
  console.log(`Usage: bun run scripts/replay-fast-check.ts [file] [options]

Selection:
  -i, --index <n>       Pick failure at index n (0-based). Default: 0.
  -m, --match <substr>  Pick first failure whose label includes <substr>.
  -l, --list            List failures in the file and exit.

Batch:
  -a, --all             Replay every failure in .fast-check-failures/
                        sequentially until one fails.

Overrides:
      --label <label>   Override the test label.
      --seed <seed>     Override the replay seed.
      --path <path>     Override the replay path.

  -h, --help            Show this help.`);
}

function parseArgs(argv: string[]) {
  const opts: {
    file?: string;
    index?: number;
    match?: string;
    list?: boolean;
    all?: boolean;
    label?: string;
    seed?: string;
    path?: string;
    help?: boolean;
  } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-l":
      case "--list":
        opts.list = true;
        break;
      case "-a":
      case "--all":
        opts.all = true;
        break;
      case "-i":
      case "--index":
        opts.index = Number(next());
        break;
      case "-m":
      case "--match":
        opts.match = next();
        break;
      case "--label":
        opts.label = next();
        break;
      case "--seed":
        opts.seed = next();
        break;
      case "--path":
        opts.path = next();
        break;
      default:
        if (a.startsWith("-")) {
          console.error(`Unknown option: ${a}`);
          printHelp();
          process.exit(2);
        }
        if (!opts.file) opts.file = a;
        else {
          console.error(`Unexpected positional: ${a}`);
          process.exit(2);
        }
    }
  }
  return opts;
}

function replayOne(
  f: Failure,
  opts: { label?: string; seed?: string; path?: string },
): number {
  const label = opts.label ?? f.label;
  const seed = String(opts.seed ?? f.replay?.seed ?? f.seed);
  const path = String(opts.path ?? f.replay?.path ?? f.path);

  console.log(`Replaying: ${label}`);
  console.log(`  file:           ${f.file}`);
  console.log(`  seed:           ${seed}`);
  console.log(`  path:           ${path}`);
  console.log(`  counterexample: ${JSON.stringify(f.counterexample)}\n`);

  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const res = spawnSync(
    "bunx",
    ["vitest", "run", f.file, "-t", escaped],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        FAST_CHECK_REPLAY_LABEL: label,
        FAST_CHECK_REPLAY_SEED: seed,
        FAST_CHECK_REPLAY_PATH: path,
      },
    },
  );

  return res.status ?? 1;
}

function discoverFailures(dir: string): FailureEntry[] {
  if (!existsSync(dir)) {
    console.error(`No directory at ${dir}. Run the failing test first.`);
    process.exit(2);
  }

  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => resolve(dir, name));

  if (files.length === 0) {
    console.error(`No .json files in ${dir}.`);
    process.exit(2);
  }

  const entries: FailureEntry[] = [];
  for (const file of files) {
    const failures = loadFailureFile(file);
    failures.forEach((failure, index) => {
      entries.push({ source: file, index, failure });
    });
  }

  return entries;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

// ── Batch mode: replay every failure sequentially ──
if (opts.all) {
  const dir = resolve(
    opts.file ?? process.env.FAST_CHECK_FAILURE_DIR ?? ".fast-check-failures",
  );
  const entries = discoverFailures(dir);

  let passed = 0;
  let failed = 0;
  for (const entry of entries) {
    const status = replayOne(entry.failure, {
      label: opts.label,
      seed: opts.seed,
      path: opts.path,
    });
    if (status !== 0) {
      failed++;
      console.log(`\nFailed at ${entry.source}[${entry.index}] — stopping.`);
      break;
    }
    passed++;
  }

  console.log(`\nReplayed ${passed + failed} failure(s): ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── Single-file / single-failure mode ──
const file = resolve(
  opts.file ??
    process.env.FAST_CHECK_FAILURE_FILE ??
    ".fast-check-failures/stale-chunk-guard.json",
);

if (!existsSync(file)) {
  console.error(`No failure file at ${file}. Run the failing test first.`);
  process.exit(2);
}

const failures = loadFailureFile(file);

if (opts.list) {
  console.log(`${failures.length} failure(s) in ${file}:`);
  failures.forEach((f, i) => {
    console.log(`  [${i}] ${f.label}`);
    console.log(`        seed=${f.seed} path="${f.path}" file=${f.file}`);
  });
  process.exit(0);
}

let idx = 0;
if (opts.match) {
  const needle = opts.match.toLowerCase();
  const found = failures.findIndex((f) => f.label.toLowerCase().includes(needle));
  if (found < 0) {
    console.error(`No failure label matches "${opts.match}". Use --list to inspect.`);
    process.exit(2);
  }
  idx = found;
} else if (opts.index != null) {
  if (!Number.isInteger(opts.index) || opts.index < 0 || opts.index >= failures.length) {
    console.error(`--index ${opts.index} out of range (0..${failures.length - 1}).`);
    process.exit(2);
  }
  idx = opts.index;
}

const f = failures[idx];
const status = replayOne(f, opts);
process.exit(status);
