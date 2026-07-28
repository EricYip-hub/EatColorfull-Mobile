# Colorfull

## Property-based Testing & Failure Replay

This project uses [fast-check](https://github.com/dubzzz/fast-check) for property-based tests alongside regular unit tests. When a property test fails, the counterexample is automatically written to a JSON replay file for deterministic reproduction.

### Capturing Failures

When a fast-check property test fails, a replay file is automatically created in `.fast-check-failures/` (controlled by `FAST_CHECK_FAILURE_FILE`). Only the **first** failure per test run is captured, so you can focus on fixing one regression at a time.

### Replaying Failures

Use the provided script to deterministically replay a captured failure with the same `seed` and `path` values that produced it.

```bash
# Replay the default captured failure
bun run scripts/replay-fast-check.ts

# Replay a specific file
bun run scripts/replay-fast-check.ts path/to/failure.json

# List all failures in a file
bun run scripts/replay-fast-check.ts --list

# Pick by index (0-based)
bun run scripts/replay-fast-check.ts -i 1

# Pick by label substring match (case-insensitive)
bun run scripts/replay-fast-check.ts -m "guard has expired"

# Replay every captured failure sequentially until one fails
bun run scripts/replay-fast-check.ts --all
```

### CLI Options

| Flag | Description |
|------|-------------|
| `-i, --index <n>` | Select the failure at index `n` from the JSON file. Defaults to `0`. |
| `-m, --match <str>` | Select the first failure whose `label` contains `str` (case-insensitive). Overrides `--index`. |
| `-l, --list` | Print all failures in the file and exit without replaying. |
| `-a, --all` | Replay every `.json` failure in `.fast-check-failures/` sequentially. Stops at the first failure. |
| `--label <label>` | Override the test label used for `vitest -t`. |
| `--seed <seed>` | Override the replay seed. |
| `--path <path>` | Override the replay fast-check path. |
| `-h, --help` | Show help. |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FAST_CHECK_FAILURE_FILE` | `.fast-check-failures/stale-chunk-guard.json` | Path to the captured failure JSON file when not using `--all`. |
| `FAST_CHECK_FAILURE_DIR` | `.fast-check-failures` | Directory to scan for failure files when using `--all`. |
| `FAST_CHECK_REPLAY_LABEL` | *(from JSON)* | Test label override passed into the test environment. |
| `FAST_CHECK_REPLAY_SEED` | *(from JSON)* | Seed override passed into the test environment. |
| `FAST_CHECK_REPLAY_PATH` | *(from JSON)* | Path override passed into the test environment. |

The `FAST_CHECK_REPLAY_*` variables are set automatically by the script; you only need to set them manually if you are debugging or want to force specific values.

### How Reproduction Works

When the replay script runs, it sets three environment variables that the property test file reads during setup:

1. `FAST_CHECK_REPLAY_LABEL` — tells the test which property to run.
2. `FAST_CHECK_REPLAY_SEED` — the deterministic seed.
3. `FAST_CHECK_REPLAY_PATH` — the path within the seed's search space that leads to the counterexample.

The property test sees these values and runs with:

```ts
{ numRuns: 1, seed: <seed>, path: <path>, endOnFailure: true }
```

This guarantees the exact same counterexample is reproduced in a single run.

### Example Workflow

```bash
# 1. Run the property tests — one fails
bunx vitest run src/__tests__/stale-chunk-guard.property.test.ts

# 2. The failure is written to .fast-check-failures/stale-chunk-guard.json

# 3. Replay the exact failing case
bun run scripts/replay-fast-check.ts

# 4. Fix the bug, then replay again to confirm the fix
bun run scripts/replay-fast-check.ts

# 5. Re-run the full suite
bunx vitest run src/__tests__/stale-chunk-guard.property.test.ts
```
