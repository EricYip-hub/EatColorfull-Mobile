import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ColorfullLockup, ColorfullMark } from "@/components/brand/ColorfullMark";
import { useAuth } from "@/lib/auth-context";
import { NotificationsBell } from "./NotificationsBell";

const NAV_LEFT = [
  { to: "/discover", label: "Discover" },
  { to: "/meal-prep", label: "Tastemaker Plans" },
  { to: "/tastemakers", label: "Tastemakers" },
  { to: "/how-it-works", label: "How It Works" },
] as const;

const NAV_RIGHT = [
  { to: "/about", label: "About" },
  { to: "/join", label: "Join" },
] as const;

const ALL_NAV = [...NAV_LEFT, ...NAV_RIGHT];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isHost } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6">
        {/* Left nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LEFT.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-[10.5px] uppercase tracking-[0.26em] text-foreground/70 transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button (left) */}
        <button
          aria-label="Toggle menu"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Centered logo + wordmark */}
        <Link
          to="/"
          className="justify-self-center"
          aria-label="Colorfull — home"
        >
          <span className="hidden sm:inline-flex">
            <ColorfullLockup size="lg" />
          </span>
          <span className="inline-flex sm:hidden">
            <ColorfullMark className="h-14 w-14 text-foreground" />
          </span>
        </Link>

        {/* Right nav */}
        <nav className="hidden items-center justify-end gap-8 md:flex">
          {NAV_RIGHT.slice(0, 2).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-[10.5px] uppercase tracking-[0.26em] text-foreground/70 transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <NotificationsBell />
              <Link
                to="/favorites"
                className="text-[10.5px] uppercase tracking-[0.26em] text-foreground/80 hover:text-foreground"
              >
                Favorites
              </Link>
              {isHost && (
                <Link
                  to="/host/dashboard"
                  className="text-[10.5px] uppercase tracking-[0.26em] text-foreground/80 hover:text-foreground"
                >
                  Host
                </Link>
              )}
              <Link
                to="/settings"
                className="inline-flex h-9 items-center border border-foreground px-5 text-[10.5px] uppercase tracking-[0.26em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Account
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              search={{}}
              className="inline-flex h-9 items-center border border-foreground px-5 text-[10.5px] uppercase tracking-[0.26em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile spacer */}
        <div className="md:hidden" />
      </div>

      {open && (
        <div className="border-t border-foreground/10 bg-background md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {ALL_NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-2 text-sm uppercase tracking-[0.22em] text-foreground/80"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
