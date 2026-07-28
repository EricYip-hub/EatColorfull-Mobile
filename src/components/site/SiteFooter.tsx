import { Link } from "@tanstack/react-router";
import { ColorfullLockup } from "@/components/brand/ColorfullMark";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div>
          <ColorfullLockup size="lg" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Curated tables. Private locations. Limited seats. One shared table.
          </p>
        </div>
        <div>
          <div className="eyebrow">Discover</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/discover" className="hover:text-foreground">All tables</Link></li>
            <li><Link to="/founding-salon" className="hover:text-foreground">Founding Salon</Link></li>
            <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">Hosts</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/hosts" className="hover:text-foreground">Meet the hosts</Link></li>
            <li><Link to="/host" className="hover:text-foreground">Apply to host</Link></li>
            <li><Link to="/community" className="hover:text-foreground">Community standards</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">Community & Safety</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/apply" className="hover:text-foreground">Apply to attend</Link></li>
            <li><Link to="/safety-report" className="hover:text-foreground">Report a Food Safety or Safety Concern</Link></li>
            <li><a className="hover:text-foreground" href="mailto:info@eatcolorfull.com">info@eatcolorfull.com</a></li>
            <li><a className="hover:text-foreground" href="mailto:safety@eatcolorfull.com">safety@eatcolorfull.com</a></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl space-y-3 px-6 py-6 text-xs leading-relaxed text-muted-foreground">
          <p className="max-w-4xl">
            <span className="brand-wordmark">Colorfull</span> is a curated platform for private dining, chef-led gatherings, and
            social table experiences. Experiences are hosted and operated by independent hosts,
            chefs, caterers, venues, permitted home kitchen operators, or other third-party
            providers. <span className="brand-wordmark">Colorfull</span> does not prepare food, operate kitchens, sell alcohol, control
            private venues, or guarantee legal compliance by any host or provider unless expressly
            stated in writing. Hosts and providers are solely responsible for all required permits,
            food safety, insurance, zoning, business licensing, alcohol compliance, taxes, and local
            approvals.
          </p>
          <p>© {new Date().getFullYear()} <span className="brand-wordmark">Colorfull</span>. Curated communal dining.</p>
        </div>
      </div>
    </footer>
  );
}
