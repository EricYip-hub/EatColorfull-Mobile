import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";


import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BrandSplash } from "@/components/site/BrandSplash";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { track } from "@/lib/analytics";
import { GUARD_MS, computeGuardRemainingMs } from "@/lib/stale-chunk-guard";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const RELOAD_PENDING_KEY = "__stale_chunk_reload_pending";
const RELOAD_AT_KEY = "__stale_chunk_reload_at";
const GUARD_KEY = "__stale_chunk_guard_until";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Page not found</p>
        <h1 className="mt-4 font-serif text-5xl">This table isn't set.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-10 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const stale = CHUNK_ERROR_RE.test(error?.message ?? "");
  if (stale) {
    if (typeof window !== "undefined") {
      // Fires on every render of this boundary; cheap and dedup'd server-side
      // via session_id + event aggregation if needed.
      void track("stale_chunk_error_screen_shown", {
        message: (error?.message ?? "").slice(0, 200),
      });
    }
    const onReload = () => {
      try {
        sessionStorage.setItem(RELOAD_PENDING_KEY, "1");
        sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      void track("stale_chunk_reload_clicked", { surface: "error_screen" });
      window.location.reload();
    };
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="eyebrow">New version available</p>
          <h1 className="mt-4 font-serif text-4xl">We just updated.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Reload to get the latest version of Colorfull.
          </p>
          <button
            onClick={onReload}
            className="mt-8 inline-flex h-10 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 font-serif text-4xl">This page didn't load.</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-8 inline-flex h-10 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Colorfull" },
      { title: "Colorfull — Curated Communal Dining" },
      { name: "description", content: "Curated tables. Private locations. Limited seats. Discover intimate, hosted dining experiences across California." },
      { property: "og:title", content: "Colorfull — Curated Communal Dining" },
      { property: "og:description", content: "Curated tables. Private locations. Limited seats. Discover intimate, hosted dining experiences across California." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Colorfull — Curated Communal Dining" },
      { name: "twitter:description", content: "Curated tables. Private locations. Limited seats. Discover intimate, hosted dining experiences across California." },
      { property: "og:site_name", content: "Colorfull" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
const CHUNK_ERROR_RE =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;

function isChunkError(msg: string) {
  return CHUNK_ERROR_RE.test(msg);
}

function useStaleChunkBanner() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    // If the previous page reloaded after a stale-chunk banner click, this
    // load means the retry succeeded. Emit the success event once.
    try {
      const pending = sessionStorage.getItem(RELOAD_PENDING_KEY);
      if (pending) {
        const startedAt = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? 0);
        sessionStorage.removeItem(RELOAD_PENDING_KEY);
        sessionStorage.removeItem(RELOAD_AT_KEY);
        sessionStorage.removeItem(GUARD_KEY);
        track("stale_chunk_reload_succeeded", {
          duration_ms: startedAt ? Date.now() - startedAt : null,
        });
      }
    } catch {
      /* sessionStorage unavailable */
    }

    let shown = false;
    const trigger = (msg: string) => {
      if (!isChunkError(msg)) return;
      try {
        const guardUntil = Number(sessionStorage.getItem(GUARD_KEY) ?? 0);
        const now = Date.now();
        if (guardUntil > now) {
          const remaining = computeGuardRemainingMs(guardUntil, now);
          track("stale_chunk_suppressed", {
            message: msg.slice(0, 200),
            guard_remaining_ms: remaining,
          });
          return;
        }
      } catch {
        /* sessionStorage unavailable */
      }
      track("stale_chunk_detected", { message: msg.slice(0, 200) });
      if (!shown) {
        shown = true;
        try {
          sessionStorage.setItem(GUARD_KEY, String(Date.now() + GUARD_MS));
        } catch {
          /* ignore */
        }
        track("stale_chunk_banner_shown", {});
        setStale(true);
      }
    };
    const onError = (e: ErrorEvent) => trigger(e.message ?? "");
    const onRejection = (e: PromiseRejectionEvent) =>
      trigger(String((e.reason as Error)?.message ?? e.reason ?? ""));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return stale;
}

function StaleUpdateBanner() {
  const onReload = () => {
    try {
      sessionStorage.setItem(RELOAD_PENDING_KEY, "1");
      sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    // Fire-and-forget; don't block the reload on the network call.
    void track("stale_chunk_reload_clicked", {});
    window.location.reload();
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 border-b border-foreground/10 bg-foreground px-4 py-2 text-xs text-background shadow-md sm:text-sm"
    >
      <span className="tracking-wide">
        We just updated — please reload to get the latest version.
      </span>
      <button
        onClick={onReload}
        className="inline-flex h-7 items-center border border-background/40 px-3 text-[11px] uppercase tracking-[0.2em] hover:bg-background hover:text-foreground"
      >
        Reload
      </button>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const stale = useStaleChunkBanner();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {stale && <StaleUpdateBanner />}
        <BrandSplash />
        <div className="flex min-h-screen flex-col">
          <PaymentTestModeBanner />
          <AnnouncementBar />
          <SiteHeader />

          <main className="flex-1 pb-24 md:pb-0">
            <Outlet />
          </main>
          <SiteFooter />
          <MobileBottomNav />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
