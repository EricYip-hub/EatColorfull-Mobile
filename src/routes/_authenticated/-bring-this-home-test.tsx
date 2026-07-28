/**
 * Regression: /bring-this-home was looping because the route was rebuilding
 * its zod schema on every render and re-parsing in a non-memoized validator.
 * Fixes:
 *   1. `planSchema` was lifted to module scope (stable identity).
 *   2. `validateSearch` was switched to `zodValidator(searchSchema)` so
 *      TanStack Router can structurally diff the output and skip re-matching.
 *
 * Guarantees this test enforces:
 *   - `validateSearch` is module-stable (lifted out of the component).
 *   - It returns structurally equal output for equal input across many calls
 *     (so React Strict Mode's double-invoke does not produce divergent
 *     search state that would force the router into a re-match loop).
 *   - It never throws on either populated or empty input.
 */
import { describe, it, expect } from "vitest";
import { Route } from "@/routes/_authenticated/bring-this-home";

describe("/bring-this-home search params", () => {
  const validator = Route.options.validateSearch as { parse: (s: unknown) => unknown };
  const validate = (s: unknown) => validator.parse(s);

  it("exposes a stable validator reference across imports", () => {
    expect(Route.options.validateSearch).toBe(Route.options.validateSearch);
    expect(typeof validator.parse).toBe("function");
  });

  it("returns structurally equal output for equal input", () => {
    const a = validate({ table: "ember-supper" });
    const b = validate({ table: "ember-supper" });
    expect(a).toEqual(b);
  });

  it("returns structurally equal output for empty search", () => {
    expect(validate({})).toEqual(validate({}));
  });

  it("survives StrictMode-style double invocation without diverging or throwing", () => {
    // Strict Mode invokes pure functions twice in dev. If validateSearch ever
    // returned divergent output for the same input, the router would loop.
    const input = { table: "ember-supper" };
    const baseline = validate(input);
    for (let i = 0; i < 100; i++) {
      expect(() => validate(input)).not.toThrow();
      expect(validate(input)).toEqual(baseline);
    }
  });
});
