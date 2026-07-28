/**
 * Router-level integration test.
 *
 * Builds an in-memory TanStack Router that mounts the SAME `validateSearch`
 * exported by /bring-this-home, navigates to ?table=ember-supper, and asserts
 * the validator is not called in a runaway loop during match + render.
 *
 * A regression to a non-memoized validator (e.g. plain `(s) => schema.parse(s)`)
 * causes call counts in the hundreds/thousands here because the router keeps
 * re-matching when the parsed search ref keeps changing identity.
 */
import { describe, it, expect, vi } from "vitest";
import { StrictMode } from "react";
import { render, waitFor, cleanup, act } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Route as BringThisHomeRoute } from "@/routes/_authenticated/bring-this-home";

function buildRouter(initialUrl = "/bring-this-home?table=ember-supper") {
  const originalValidator = BringThisHomeRoute.options.validateSearch as {
    parse: (s: unknown) => unknown;
  };
  const parseSpy = vi.fn((s: unknown) => originalValidator.parse(s));

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/bring-this-home",
    validateSearch: { parse: parseSpy },
    component: () => <div data-testid="page">Bring This Home</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  });

  return { router, parseSpy };
}

describe("/bring-this-home router integration", () => {
  it("does not loop validateSearch on render under StrictMode", async () => {
    const { router, parseSpy } = buildRouter();

    const { getByTestId } = render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );

    await waitFor(() => expect(getByTestId("page")).toBeTruthy());

    // Snapshot after mount and confirm it stabilizes — no further calls
    // happen on subsequent ticks.
    const afterMount = parseSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    const afterIdle = parseSpy.mock.calls.length;

    // Bounded call count: a healthy router parses search a small number of
    // times per navigation (typically 1-6 including StrictMode double-invoke
    // and post-match revalidation). A regression to the non-memoized
    // validator pushes this into the hundreds.
    expect(afterMount).toBeLessThan(20);
    expect(afterIdle).toBe(afterMount); // no ongoing loop
    expect(router.state.location.search).toEqual({ table: "ember-supper" });

    cleanup();
  });

  it("does not loop validateSearch on repeated identical navigation", async () => {
    const { router, parseSpy } = buildRouter();
    render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );
    await waitFor(() => expect(router.state.status).toBe("idle"));
    const baseline = parseSpy.mock.calls.length;

    // Navigate to the same URL several times — should be a no-op for parsing.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await router.navigate({
          to: "/bring-this-home",
          search: { table: "ember-supper" },
        });
      }
      await new Promise((r) => setTimeout(r, 50));
    });

    // Allow a few extra calls per navigation, but reject runaway behavior.
    expect(parseSpy.mock.calls.length - baseline).toBeLessThan(40);
    cleanup();
  });

  it("falls back safely for invalid ?table without looping", async () => {
    // `table` is typed as string. Pass a JSON-object value so zod rejects it
    // and `fallback("")` kicks in. Router must not loop while recovering.
    const url = `/bring-this-home?table=${encodeURIComponent('{"x":1}')}`;
    const { router, parseSpy } = buildRouter(url);

    const { getByTestId } = render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );
    await waitFor(() => expect(getByTestId("page")).toBeTruthy());

    const afterMount = parseSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    const afterIdle = parseSpy.mock.calls.length;

    expect(afterMount).toBeLessThan(20);
    expect(afterIdle).toBe(afterMount); // no ongoing loop on invalid input
    // Validator recovered to the safe default — empty string from fallback().
    expect(router.state.location.search).toEqual({ table: "" });
    cleanup();
  });

  it("returns the safe default when ?table is absent without looping", async () => {
    // `table` is optional — navigating with no search params should resolve
    // to an empty search object and never re-trigger validation.
    const { router, parseSpy } = buildRouter("/bring-this-home");

    const { getByTestId } = render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );
    await waitFor(() => expect(getByTestId("page")).toBeTruthy());

    const afterMount = parseSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    const afterIdle = parseSpy.mock.calls.length;

    expect(afterMount).toBeLessThan(20);
    expect(afterIdle).toBe(afterMount); // no ongoing loop with empty search
    // Optional field omitted → resolved search is empty (no `table` key).
    expect(router.state.location.search).toEqual({});
  });
});
