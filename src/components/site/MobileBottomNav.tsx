import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Heart, CalendarPlus, Bot, User } from "lucide-react";
import { ColorfullMark } from "@/components/brand/ColorfullMark";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Compass;
  match: string[];
  brand?: boolean;
  authReason?: "favorites" | "chefbot";
};

const ITEMS: NavItem[] = [
  { to: "/discover", label: "Explore", icon: Compass, match: ["/discover", "/tables"] },
  { to: "/dashboard", label: "Saved", icon: Heart, match: ["/saved", "/dashboard", "/favorites"], authReason: "favorites" },
  { to: "/discover", label: "Book", icon: CalendarPlus, brand: true, match: ["/book"] },
  { to: "/chefbot", label: "Chefbot", icon: Bot, match: ["/chefbot"], authReason: "chefbot" },
  { to: "/settings", label: "Profile", icon: User, match: ["/settings", "/login"] },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end justify-between px-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match.some((m) => pathname.startsWith(m));
          const needsAuth = !user && item.authReason;
          const to = needsAuth ? "/login" : item.to;
          const search = needsAuth
            ? { redirect: item.to, reason: item.authReason as string }
            : undefined;
          if (item.brand) {
            return (
              <li key={item.label} className="flex flex-1 justify-center">
                <Link
                  to={item.to as any}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-transform active:scale-95"
                  aria-label={item.label}
                >
                  <ColorfullMark className="h-7 w-7" />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.label} className="flex-1">
              <Link
                to={to as any}
                search={search as any}
                className={`flex flex-col items-center gap-1 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-foreground" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
