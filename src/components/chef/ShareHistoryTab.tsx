import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  getChefAnalytics,
  listShareEventsForChef,
  type ChefListing,
  type ChefShareEvent,
} from "@/lib/chef-kitchen";

type Props = {
  chefId: string;
  listings: ChefListing[];
};

type ClickRow = {
  listing_id: string;
  created_at: string;
  utm_source?: string | null;
};

export function ShareHistoryTab({ chefId, listings }: Props) {
  const [events, setEvents] = useState<ChefShareEvent[] | null>(null);
  const [clicks, setClicks] = useState<ClickRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listShareEventsForChef(chefId),
      getChefAnalytics(chefId),
    ])
      .then(([ev, an]) => {
        setEvents(ev);
        setClicks(an.clicks as ClickRow[]);
      })
      .finally(() => setLoading(false));
  }, [chefId]);

  const listingTitle = useMemo(
    () => Object.fromEntries(listings.map((l) => [l.id, l.title])),
    [listings],
  );

  // Pre-bucket clicks by (listing_id, utm_source) for fast lookups.
  const clicksByKey = useMemo(() => {
    const m = new Map<string, ClickRow[]>();
    for (const c of clicks ?? []) {
      const utm = c.utm_source ?? "direct";
      const key = `${c.listing_id ?? "_"}|${utm}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return m;
  }, [clicks]);

  const summary = useMemo(() => {
    if (!events) return null;
    const byUrl = new Map<
      string,
      {
        url: string;
        listing_id: string | null;
        platform: string;
        utm_source: string;
        first: string;
        last: string;
        shares: number;
        clicks: number;
      }
    >();
    for (const e of events) {
      const utm = extractUtm(e.share_url) ?? "direct";
      const key = e.share_url;
      const existing = byUrl.get(key);
      const clicksForKey =
        clicksByKey.get(`${e.listing_id ?? "_"}|${utm}`) ?? [];
      // Count clicks that happened after the FIRST share of this url
      const firstShareAt = existing
        ? new Date(existing.first).getTime()
        : new Date(e.created_at).getTime();
      const cnt = clicksForKey.filter(
        (c) => new Date(c.created_at).getTime() >= firstShareAt,
      ).length;

      if (existing) {
        existing.shares += 1;
        existing.first =
          existing.first < e.created_at ? existing.first : e.created_at;
        existing.last =
          existing.last > e.created_at ? existing.last : e.created_at;
        existing.clicks = cnt;
      } else {
        byUrl.set(key, {
          url: e.share_url,
          listing_id: e.listing_id,
          platform: e.platform,
          utm_source: utm,
          first: e.created_at,
          last: e.created_at,
          shares: 1,
          clicks: cnt,
        });
      }
    }
    return Array.from(byUrl.values()).sort(
      (a, b) => new Date(b.last).getTime() - new Date(a.last).getTime(),
    );
  }, [events, clicksByKey]);

  if (loading || !summary)
    return <p className="text-sm text-muted-foreground">Loading share history…</p>;

  const totalShares = summary.reduce((s, r) => s + r.shares, 0);
  const totalClicks = summary.reduce((s, r) => s + r.clicks, 0);
  const ctr =
    totalShares === 0
      ? "—"
      : `${((totalClicks / totalShares) * 100).toFixed(0)}%`;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif text-2xl">Share history</h3>
        <p className="text-sm text-muted-foreground">
          Every shoppable link you've generated and how it has performed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Unique links" value={summary.length.toLocaleString()} />
        <Stat label="Times shared" value={totalShares.toLocaleString()} />
        <Stat
          label="Clicks since first share"
          value={`${totalClicks.toLocaleString()} · ${ctr}`}
        />
      </div>

      {summary.length === 0 ? (
        <div className="rounded-2xl border border-foreground/10 bg-card p-8 text-center text-sm text-muted-foreground">
          No share links yet. Generate one from a listing's “Share to Social”
          button or from your storefront's “Share Kitchen” button.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-foreground/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/[0.03] text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3">Last shared</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {summary.map((r) => {
                const dest =
                  r.listing_id != null
                    ? (listingTitle[r.listing_id] ?? "Listing")
                    : "Storefront";
                const rowCtr =
                  r.shares === 0
                    ? "—"
                    : `${((r.clicks / r.shares) * 100).toFixed(0)}%`;
                return (
                  <tr key={r.url} className="hover:bg-foreground/[0.02]">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium">
                      {dest}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.platform}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.utm_source}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.shares}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.clicks}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {rowCtr}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {timeAgo(r.last)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(r.url);
                            toast.success("Link copied");
                          }}
                          className="rounded-md border border-foreground/20 p-1.5 text-muted-foreground hover:text-foreground"
                          title="Copy link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-foreground/20 p-1.5 text-muted-foreground hover:text-foreground"
                          title="Open link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}

function extractUtm(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("utm_source");
  } catch {
    const m = url.match(/[?&]utm_source=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
