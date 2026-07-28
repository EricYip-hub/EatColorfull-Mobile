import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listMolinoOrders,
  updateMolinoOrderStatus,
  type MolinoOrderRow,
} from "@/lib/admin-molino.functions";

export const Route = createFileRoute("/admin/molino")({
  head: () => ({
    meta: [
      { title: "Admin Molino Orders — Colorfull" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMolinoPage,
});

const STATUSES = [
  "all",
  "pending",
  "confirmed",
  "ready",
  "picked_up",
  "paid",
  "cancelled",
] as const;
type StatusFilter = (typeof STATUSES)[number];

const EDITABLE_STATUSES = [
  "pending",
  "confirmed",
  "ready",
  "picked_up",
  "paid",
  "cancelled",
] as const;

function escapeCsv(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: MolinoOrderRow[]) {
  const header = [
    "created_at",
    "status",
    "name",
    "email",
    "phone",
    "pickup_time",
    "margherita_qty",
    "margherita_addons",
    "bianca_qty",
    "bianca_addons",
    "total_pizzas",
    "amount_due",
    "dietary_notes",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.payment_status,
        r.full_name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.pickup_time ?? "",
        String(r.margherita_qty),
        r.margherita_addons ?? "",
        String(r.bianca_qty),
        r.bianca_addons ?? "",
        String(r.guest_count),
        `$${(r.amount_due_cents / 100).toFixed(2)}`,
        r.dietary_notes ?? "",
      ]
        .map((v) => escapeCsv(String(v)))
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `molino-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AdminMolinoPage() {
  const fetchOrders = useServerFn(listMolinoOrders);
  const updateStatus = useServerFn(updateMolinoOrderStatus);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<MolinoOrderRow[]>({
    queryKey: ["admin", "molino-orders"],
    queryFn: () => fetchOrders() as Promise<MolinoOrderRow[]>,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; payment_status: (typeof EDITABLE_STATUSES)[number] }) =>
      updateStatus({ data: vars }) as Promise<{ success: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "molino-orders"] });
      toast.success("Order updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [status, setStatus] = useState<StatusFilter>("all");
  const [pickup, setPickup] = useState<string>("all");
  const [query, setQuery] = useState("");

  const pickupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.pickup_time) set.add(r.pickup_time);
    }
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.payment_status !== status) return false;
      if (pickup !== "all" && r.pickup_time !== pickup) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.phone, r.notes, r.dietary_notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [data, status, pickup, query]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const totalPizzas = rows
      .filter((r) => r.payment_status !== "cancelled")
      .reduce((sum, r) => sum + r.guest_count, 0);
    const margherita = rows
      .filter((r) => r.payment_status !== "cancelled")
      .reduce((s, r) => s + r.margherita_qty, 0);
    const bianca = rows
      .filter((r) => r.payment_status !== "cancelled")
      .reduce((s, r) => s + r.bianca_qty, 0);
    const revenue = rows
      .filter((r) => r.payment_status !== "cancelled")
      .reduce((s, r) => s + r.amount_due_cents, 0);
    return { total: rows.length, totalPizzas, margherita, bianca, revenue };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <p className="eyebrow">Admin · Molino Pop-Up</p>
      <h1 className="mt-3 font-serif text-4xl">Molino pizza orders</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every pre-order for the Molino Neapolitan Pizza Pop-Up. Update status as orders move
        from pending → confirmed → ready → picked up.{" "}
        <Link to="/admin/contacts" className="underline">
          View all contacts
        </Link>
        .
      </p>

      {error && (
        <p className="mt-6 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Orders" value={stats.total} />
        <Stat label="Pizzas" value={stats.totalPizzas} />
        <Stat label="Margherita" value={stats.margherita} />
        <Stat label="La Bianca" value={stats.bianca} />
        <Stat label="Revenue" value={`$${(stats.revenue / 100).toFixed(0)}`} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="h-10 border border-border bg-background px-3 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          className="h-10 border border-border bg-background px-3 text-sm"
        >
          <option value="all">All pickup windows</option>
          {pickupOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, notes…"
          className="h-10 min-w-[260px] flex-1 border border-border bg-background px-3 text-sm"
        />
        <button
          onClick={() => downloadCsv(filtered)}
          disabled={!filtered.length}
          className="inline-flex h-10 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background disabled:opacity-50"
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      <div className="mt-8 overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Pickup</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !filtered.length && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  No orders match these filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{r.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {r.email ? (
                    <div>
                      <a className="underline" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                    </div>
                  ) : null}
                  {r.phone ? (
                    <div className="text-muted-foreground">
                      <a className="underline" href={`tel:${r.phone}`}>
                        {r.phone}
                      </a>
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">{r.pickup_time ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {r.margherita_qty > 0 && (
                    <div>
                      <strong>{r.margherita_qty}×</strong> Margherita
                      {r.margherita_addons && (
                        <span className="text-muted-foreground"> · {r.margherita_addons}</span>
                      )}
                    </div>
                  )}
                  {r.bianca_qty > 0 && (
                    <div>
                      <strong>{r.bianca_qty}×</strong> La Bianca
                      {r.bianca_addons && (
                        <span className="text-muted-foreground"> · {r.bianca_addons}</span>
                      )}
                    </div>
                  )}
                  {r.dietary_notes && (
                    <div className="mt-1 text-muted-foreground">
                      Dietary: {r.dietary_notes}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">${(r.amount_due_cents / 100).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.payment_status}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({
                        id: r.id,
                        payment_status: e.target
                          .value as (typeof EDITABLE_STATUSES)[number],
                      })
                    }
                    className="h-8 border border-border bg-background px-2 text-xs"
                  >
                    {EDITABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
