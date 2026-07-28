/**
 * Router integration test for /login redirect sanitization.
 *
 * Regression guard: a malicious or accidental `?redirect=/login` (or any
 * /login-prefixed value) must NOT round-trip back into the URL. The route's
 * validateSearch should coerce it to "/dashboard", and a subsequent
 * post-login navigation using that value must land on /dashboard with NO
 * accumulating ?redirect chain.
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
import { Route as LoginRoute } from "@/routes/login";

function buildRouter(initialUrl: string) {
  const originalValidator = LoginRoute.options.validateSearch as (
    s: Record<string, unknown>,
  ) => { redirect: string };
  const parseSpy = vi.fn(originalValidator);

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: parseSpy,
    component: () => <div data-testid="login">Login</div>,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/dashboard",
    component: () => <div data-testid="dashboard">Dashboard</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, dashboardRoute]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  });

  return { router, parseSpy };
}

describe("/login redirect sanitization", () => {
  it("coerces ?redirect=/login to /dashboard and does not accumulate", async () => {
    const { router, parseSpy } = buildRouter("/login?redirect=%2Flogin");

    const { getByTestId } = render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );

    await waitFor(() => expect(getByTestId("login")).toBeTruthy());

    // Validator sanitized the unsafe redirect target.
    expect(router.state.location.search).toEqual({ redirect: "/dashboard" });

    // Simulate the post-login navigation the LoginPage component performs:
    // `navigate({ to: redirect })`. With sanitization in place this lands
    // on /dashboard — NOT back on /login with another ?redirect param.
    const { redirect } = router.state.location.search as { redirect: string };
    await act(async () => {
      await router.navigate({ to: redirect });
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(router.state.location.pathname).toBe("/dashboard");
    expect(router.state.location.search).toEqual({});
    // URL must not contain a nested/accumulating redirect chain.
    expect(router.state.location.href).not.toMatch(/redirect=.*redirect=/);
    expect(parseSpy.mock.calls.length).toBeLessThan(20);

    cleanup();
  });

  it("coerces deeper /login?redirect=... payloads to /dashboard", async () => {
    const nested = encodeURIComponent("/login?redirect=%2Flogin");
    const { router } = buildRouter(`/login?redirect=${nested}`);

    render(
      <StrictMode>
        <RouterProvider router={router as never} />
      </StrictMode>,
    );

    await waitFor(() => expect(router.state.status).toBe("idle"));
    expect(router.state.location.search).toEqual({ redirect: "/dashboard" });
    cleanup();
  });
});
