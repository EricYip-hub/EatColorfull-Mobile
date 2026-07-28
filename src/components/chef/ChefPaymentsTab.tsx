import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react";

type ManualOrder = {
  id: string;
  created_at: string;
  total_cents: number;
  quantity: number;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  payment_proof_note: string | null;
  fulfillment: string;
  fulfillment_date: string | null;
  listing: { title: string | null } | null;
};

const SELECT =
  "id, created_at, total_cents, quantity, payment_method, payment_status, payment_reference, payment_proof_note, fulfillment, fulfillment_date, listing:chef_listings(title)";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function ChefPaymentsTab({ chefId }: { chefId: string }) {
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chef_orders")
      .select(SELECT)
      .eq("chef_id", chefId)
      .in("payment_method", ["zelle", "venmo"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setOrders((data ?? []) as unknown as ManualOrder[]);
    setLoading(false);
  }, [chefId]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirm(orderId: string) {
    if (!confirm) return;
    setConfirmingId(orderId);
    const { error } = await supabase.rpc("confirm_manual_chef_payment", {
      _order_id: orderId,
      _note: undefined,
    });
    setConfirmingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payment marked as received. The guest has been confirmed.");
    load();
  }

  const pending = orders.filter((o) => o.payment_status === "pending_verification");
  const recent = orders.filter((o) => o.payment_status !== "pending_verification").slice(0, 20);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl">Zelle &amp; Venmo payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify the funds in your bank or Venmo app, then mark the order as received.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Awaiting your confirmation ({pending.length})
        </h3>
        <div className="mt-3 space-y-3">
          {loading && pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              No manual payments waiting. New Zelle/Venmo submissions will appear here.
            </p>
          ) : (
            pending.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                action={
                  <Button
                    onClick={() => confirm(o.id)}
                    disabled={confirmingId === o.id}
                    size="sm"
                  >
                    {confirmingId === o.id ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Confirming…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Mark payment received
                      </>
                    )}
                  </Button>
                }
              />
            ))
          )}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Recently confirmed
          </h3>
          <div className="mt-3 space-y-3">
            {recent.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderCard({ order, action }: { order: ManualOrder; action?: React.ReactNode }) {
  const isPaid = order.payment_status === "paid";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="outline" className="capitalize">
              {order.payment_method}
            </Badge>
            <Badge
              variant={isPaid ? "default" : "secondary"}
              className={
                isPaid
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-100"
              }
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Paid
                </>
              ) : (
                <>
                  <Clock3 className="mr-1 h-3 w-3" />
                  Pending verification
                </>
              )}
            </Badge>
          </div>
          <p className="mt-2 text-sm font-medium">{order.listing?.title ?? "Listing"}</p>
          <p className="text-xs text-muted-foreground">
            Qty {order.quantity} · {order.fulfillment}
            {order.fulfillment_date
              ? ` · ${new Date(order.fulfillment_date).toLocaleDateString()}`
              : ""}
            {" · "}
            Submitted {new Date(order.created_at).toLocaleString()}
          </p>
          {order.payment_reference && (
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">Reference: </span>
              <span className="font-mono">{order.payment_reference}</span>
            </p>
          )}
          {order.payment_proof_note && (
            <p className="mt-1 text-xs text-muted-foreground">"{order.payment_proof_note}"</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-medium">{money(order.total_cents)}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
