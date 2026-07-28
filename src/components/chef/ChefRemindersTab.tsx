import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, RefreshCw, X } from "lucide-react";
import { ScheduleReminderDialog } from "@/components/chef/ScheduleReminderDialog";
import { cancelOrderReminder } from "@/lib/order-reminders.functions";

type Order = {
  id: string;
  created_at: string;
  total_cents: number;
  quantity: number;
  fulfillment: string;
  fulfillment_date: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  listing: { title: string | null } | null;
};

type Reminder = {
  id: string;
  order_id: string;
  scheduled_at: string;
  title: string;
  message: string;
  channel: "in_app" | "sms" | "both";
  status: "pending" | "sent" | "cancelled" | "failed";
  sms_error: string | null;
};

function money(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

export function ChefRemindersTab({ chefId }: { chefId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const cancelFn = useServerFn(cancelOrderReminder);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, remindersRes] = await Promise.all([
      supabase
        .from("chef_orders")
        .select("id, created_at, total_cents, quantity, fulfillment, fulfillment_date, guest_phone, guest_email, listing:chef_listings(title)")
        .eq("chef_id", chefId)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("order_reminders")
        .select("id, order_id, scheduled_at, title, message, channel, status, sms_error")
        .eq("chef_id", chefId)
        .order("scheduled_at", { ascending: false })
        .limit(200),
    ]);
    if (ordersRes.error) toast.error(ordersRes.error.message);
    if (remindersRes.error) toast.error(remindersRes.error.message);
    setOrders((ordersRes.data ?? []) as unknown as Order[]);
    setReminders((remindersRes.data ?? []) as Reminder[]);
    setLoading(false);
  }, [chefId]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    try {
      await cancelFn({ data: { id } });
      toast.success("Reminder cancelled.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not cancel.");
    }
  }

  const byOrder = new Map<string, Reminder[]>();
  for (const r of reminders) {
    const arr = byOrder.get(r.order_id) ?? [];
    arr.push(r);
    byOrder.set(r.order_id, arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">Guest reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule timed alerts for guests — in-app notification and optional SMS.
            SMS only sends when the guest provided a phone number at checkout.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          No paid orders yet. Reminders show up here once guests pay.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const rs = byOrder.get(o.id) ?? [];
            const pending = rs.filter((r) => r.status === "pending");
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="outline" className="capitalize">{o.fulfillment}</Badge>
                      {o.guest_phone ? (
                        <Badge variant="secondary">SMS ok</Badge>
                      ) : (
                        <Badge variant="outline">No phone</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium">{o.listing?.title ?? "Listing"}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {o.quantity}
                      {o.fulfillment_date ? ` · ${new Date(o.fulfillment_date).toLocaleDateString()}` : ""}
                      {" · "}{money(o.total_cents)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setSelectedOrder(o)}>
                    <Bell className="mr-2 h-3.5 w-3.5" />
                    Schedule reminder
                  </Button>
                </div>

                {rs.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-border pt-3">
                    {rs.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <BellRing className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{r.title}</span>
                            <StatusBadge status={r.status} />
                            <span className="text-muted-foreground">· {r.channel}</span>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            {new Date(r.scheduled_at).toLocaleString()} — {r.message}
                          </p>
                          {r.sms_error && (
                            <p className="mt-1 text-amber-600">SMS issue: {r.sms_error}</p>
                          )}
                        </div>
                        {r.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(r.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {pending.length === 0 && rs.length > 0 && null}
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <ScheduleReminderDialog
          open={!!selectedOrder}
          onOpenChange={(o) => { if (!o) setSelectedOrder(null); }}
          orderId={selectedOrder.id}
          orderLabel={`#${selectedOrder.id.slice(0, 8).toUpperCase()} · ${selectedOrder.listing?.title ?? ""}`}
          onScheduled={load}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Reminder["status"] }) {
  const map: Record<Reminder["status"], string> = {
    pending: "bg-amber-100 text-amber-700",
    sent: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-red-100 text-red-700",
  };
  return <Badge className={`${map[status]} hover:${map[status]}`} variant="secondary">{status}</Badge>;
}
