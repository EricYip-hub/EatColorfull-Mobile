import { useEffect, useMemo, useState } from "react";
import { Eye, MousePointerClick, Receipt, DollarSign } from "lucide-react";
import {
  getChefAnalytics,
  type ChefListing,
} from "@/lib/chef-kitchen";

type Props = {
  chefId: string;
  listings: ChefListing[];
};

type AnalyticsData = Awaited<ReturnType<typeof getChefAnalytics>>;

export function AnalyticsTab({ chefId, listings }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    setLoading(true);
    getChefAnalytics(chefId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [chefId]);

  const listingTitle = useMemo(
    () => Object.fromEntries(listings.map((l) => [l.id, l.title])),
    [listings],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const clicks = data.clicks.filter(
      (c) => new Date(c.created_at).getTime() >= cutoff,
    );
    const orders = data.orders.filter(
      (o) => new Date(o.created_at).getTime() >= cutoff,
    );

    const clicksByListing: Record<string, number> = {};
    for (const c of clicks) {
      clicksByListing[c.listing_id] = (clicksByListing[c.listing_id] ?? 0) + 1;
    }
    const ordersByStatus: Record<string, number> = {};
    const clicksBySource: Record<string, number> = {};
    let gross = 0;
    let confirmed = 0;
    for (const c of clicks) {
      const src = (c as { utm_source?: string | null }).utm_source || "direct";
      clicksBySource[src] = (clicksBySource[src] ?? 0) + 1;
    }
    for (const o of orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
      gross += o.total_cents ?? 0;
      if (o.status === "confirmed" || o.status === "fulfilled")
        confirmed += o.total_cents ?? 0;
    }

    // ----- Funnel by utm_source -----
    // Attribute each order to the most recent click on the same listing
    // within 24h before the order. Fallback bucket is "direct".
    const ATTRIB_WINDOW_MS = 24 * 60 * 60 * 1000;
    const clicksByListingSorted: Record<
      string,
      { t: number; src: string }[]
    > = {};
    for (const c of clicks) {
      const src =
        (c as { utm_source?: string | null }).utm_source || "direct";
      const t = new Date(c.created_at).getTime();
      (clicksByListingSorted[c.listing_id] ??= []).push({ t, src });
    }
    for (const arr of Object.values(clicksByListingSorted))
      arr.sort((a, b) => a.t - b.t);

    function attribute(listingId: string, at: number): string {
      const arr = clicksByListingSorted[listingId];
      if (!arr) return "direct";
      let best: string | null = null;
      for (const { t, src } of arr) {
        if (t > at) break;
        if (at - t <= ATTRIB_WINDOW_MS) best = src;
      }
      return best ?? "direct";
    }

    const funnelSources = new Set<string>(Object.keys(clicksBySource));
    const checkoutsBySource: Record<string, number> = {};
    const confirmedBySource: Record<string, number> = {};
    for (const o of orders) {
      const src = attribute(
        (o as { listing_id: string }).listing_id,
        new Date(o.created_at).getTime(),
      );
      funnelSources.add(src);
      checkoutsBySource[src] = (checkoutsBySource[src] ?? 0) + 1;
      if (o.status === "confirmed" || o.status === "fulfilled") {
        confirmedBySource[src] = (confirmedBySource[src] ?? 0) + 1;
      }
    }
    const funnel = Array.from(funnelSources)
      .map((src) => ({
        source: src,
        clicks: clicksBySource[src] ?? 0,
        checkouts: checkoutsBySource[src] ?? 0,
        confirmed: confirmedBySource[src] ?? 0,
      }))
      .sort((a, b) => b.clicks + b.checkouts - (a.clicks + a.checkouts));

    // Build daily series
    const days: { date: string; clicks: number; orders: number }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, clicks: 0, orders: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.date, i]));
    for (const c of clicks) {
      const k = new Date(c.created_at).toISOString().slice(0, 10);
      if (idx[k] != null) days[idx[k]].clicks += 1;
    }
    for (const o of orders) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (idx[k] != null) days[idx[k]].orders += 1;
    }

    return {
      views: data.profile_views,
      clicks: clicks.length,
      ordersCount: orders.length,
      gross,
      confirmed,
      clicksByListing,
      ordersByStatus,
      clicksBySource,
      funnel,
      days,
    };
  }, [data, windowDays]);


  if (loading || !stats)
    return (
      <p className="text-sm text-muted-foreground">Loading analytics…</p>
    );

  const maxDay = Math.max(
    1,
    ...stats.days.map((d) => Math.max(d.clicks, d.orders)),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl">Performance</h3>
          <p className="text-sm text-muted-foreground">
            Profile views are all-time. Other stats reflect the window below.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-foreground/15 p-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                windowDays === d
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Profile views"
          value={stats.views.toLocaleString()}
          hint="All time"
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Listing clicks"
          value={stats.clicks.toLocaleString()}
          hint={`Last ${windowDays} days`}
        />
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label="Orders"
          value={stats.ordersCount.toLocaleString()}
          hint={`Last ${windowDays} days`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue (confirmed)"
          value={`$${(stats.confirmed / 100).toFixed(0)}`}
          hint={`Gross requested $${(stats.gross / 100).toFixed(0)}`}
        />
      </div>

      <section className="rounded-2xl border border-foreground/10 p-5">
        <div className="flex items-baseline justify-between">
          <h4 className="font-serif text-lg">Daily activity</h4>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Clicks · Orders
          </p>
        </div>
        <div className="mt-5 flex h-40 items-end gap-1">
          {stats.days.map((d) => (
            <div
              key={d.date}
              className="group flex flex-1 flex-col items-center gap-0.5"
              title={`${d.date}: ${d.clicks} clicks, ${d.orders} orders`}
            >
              <div className="flex h-32 w-full items-end gap-px">
                <div
                  className="flex-1 rounded-sm bg-foreground/20 group-hover:bg-foreground/40"
                  style={{
                    height: `${(d.clicks / maxDay) * 100}%`,
                  }}
                />
                <div
                  className="flex-1 rounded-sm bg-foreground group-hover:bg-foreground/85"
                  style={{
                    height: `${(d.orders / maxDay) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{stats.days[0]?.date}</span>
          <span>{stats.days[stats.days.length - 1]?.date}</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-foreground/10 p-5">
          <h4 className="font-serif text-lg">Top listings by clicks</h4>
          {Object.keys(stats.clicksByListing).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No clicks in this window yet. Share your shoppable links from
              the Listings tab.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {Object.entries(stats.clicksByListing)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, count]) => {
                  const pct =
                    (count / Math.max(...Object.values(stats.clicksByListing))) *
                    100;
                  return (
                    <li key={id}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="truncate">
                          {listingTitle[id] ?? "Listing"}
                        </span>
                        <span className="ml-3 font-mono text-xs">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full bg-foreground"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-foreground/10 p-5">
          <h4 className="font-serif text-lg">Orders by status</h4>
          {Object.keys(stats.ordersByStatus).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No orders in this window yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {["pending", "confirmed", "fulfilled", "cancelled"].map((s) => {
                const v = stats.ordersByStatus[s] ?? 0;
                return (
                  <li
                    key={s}
                    className="flex items-baseline justify-between border-b border-foreground/5 pb-2 last:border-none"
                  >
                    <span className="text-sm capitalize">{s}</span>
                    <span className="font-mono text-sm">{v}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Conversion: clicks → orders ·{" "}
            {stats.clicks === 0
              ? "—"
              : `${((stats.ordersCount / stats.clicks) * 100).toFixed(1)}%`}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-foreground/10 p-5">
        <h4 className="font-serif text-lg">Traffic by source</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Where your shoppable link clicks come from. Tag shares from the
          listing page to attribute Instagram, TikTok, or YouTube.
        </p>
        {Object.keys(stats.clicksBySource).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No tracked traffic yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {Object.entries(stats.clicksBySource)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => {
                const pct =
                  (count /
                    Math.max(...Object.values(stats.clicksBySource))) *
                  100;
                return (
                  <li key={src}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="capitalize">{src}</span>
                      <span className="ml-3 font-mono text-xs">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-foreground/10 p-5">
        <div className="flex items-baseline justify-between">
          <h4 className="font-serif text-lg">Conversion funnel by source</h4>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Click → Checkout → Confirmed
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders are attributed to the most recent shoppable-link click on the
          same listing within 24 hours.
        </p>
        {stats.funnel.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No tracked activity yet in this window.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {stats.funnel.map((row) => {
              const max = Math.max(row.clicks, row.checkouts, row.confirmed, 1);
              const ckRate =
                row.clicks > 0
                  ? `${((row.checkouts / row.clicks) * 100).toFixed(1)}%`
                  : "—";
              const cvRate =
                row.checkouts > 0
                  ? `${((row.confirmed / row.checkouts) * 100).toFixed(1)}%`
                  : "—";
              return (
                <div key={row.source}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm capitalize">{row.source}</span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      click→checkout {ckRate} · checkout→confirmed {cvRate}
                    </span>
                  </div>
                  <FunnelBar label="Clicks" value={row.clicks} max={max} />
                  <FunnelBar
                    label="Checkout starts"
                    value={row.checkouts}
                    max={max}
                    tone="mid"
                  />
                  <FunnelBar
                    label="Confirmed"
                    value={row.confirmed}
                    max={max}
                    tone="strong"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
  tone = "soft",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "soft" | "mid" | "strong";
}) {
  const pct = max === 0 ? 0 : (value / max) * 100;
  const bar =
    tone === "strong"
      ? "bg-foreground"
      : tone === "mid"
        ? "bg-foreground/60"
        : "bg-foreground/30";
  return (
    <div className="mb-1.5 flex items-center gap-3">
      <span className="w-32 shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-xs">{value}</span>
    </div>
  );
}


function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p className="mt-3 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
