import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LISTING_KIND_LABEL } from "@/lib/chef-kitchen";
import { RateChefForm } from "@/components/chef/RateChefForm";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, Clock3, Mail, Receipt, MapPin, CalendarDays, ChefHat, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  validateSearch: (s: Record<string, unknown>) => ({
    paid: s.paid === "1" || s.paid === 1 ? 1 : undefined,
  }),
  component: OrderConfirmation,
});

type OrderRow = {
  id: string;
  quantity: number;
  fulfillment: string;
  fulfillment_date: string | null;
  dietary_notes: string | null;
  address: { line1?: string; city?: string; region?: string; postal_code?: string } | null;
  total_cents: number;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_reference: string | null;
  payment_proof_note: string | null;
  paid_at: string | null;
  created_at: string;
  coupon_code: string | null;
  listing: {
    title: string;
    slug: string;
    kind: keyof typeof LISTING_KIND_LABEL;
    currency: string | null;
  } | null;
  chef: {
    id: string;
    display_name: string | null;
    service_area: string | null;
    tastemaker_id: string | null;
  } | null;
};

const SELECT =
  "id, quantity, fulfillment, fulfillment_date, dietary_notes, address, total_cents, status, payment_status, payment_method, payment_reference, payment_proof_note, paid_at, created_at, coupon_code, listing:chef_listings(title, slug, kind, currency), chef:chef_profiles(id, display_name, service_area, tastemaker_id)";

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function OrderConfirmation() {
  const { orderId } = Route.useParams();
  const { paid } = Route.useSearch();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      const { data } = await supabase
        .from("chef_orders")
        .select(SELECT)
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      setOrder(data as unknown as OrderRow);
      setLoading(false);
      return data as unknown as OrderRow | null;
    };

    fetchOnce().then((row) => {
      // If the user just returned from Stripe with ?paid=1 but the webhook
      // hasn't marked the order paid yet, poll briefly so the UI catches up.
      if (paid === 1 && row && row.payment_status !== "paid") {
        setWaitingForWebhook(true);
        let attempts = 0;
        pollRef.current = window.setInterval(async () => {
          attempts += 1;
          const next = await fetchOnce();
          if (next?.payment_status === "paid" || attempts >= 10) {
            setWaitingForWebhook(false);
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        }, 1500);
      } else if (row && row.payment_status === "pending_verification") {
        // Manual Zelle/Venmo: poll quietly so the page flips to "Paid" the
        // moment the chef confirms receipt.
        let attempts = 0;
        pollRef.current = window.setInterval(async () => {
          attempts += 1;
          const next = await fetchOnce();
          if (next?.payment_status === "paid" || attempts >= 120) {
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        }, 5000);
      }
    });

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [orderId, paid]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center text-sm text-muted-foreground">
        Loading your order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="font-serif text-3xl">Order not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This order may belong to another account.
        </p>
        <Link to="/meal-prep" className="mt-6 inline-block underline">
          Browse meal prep
        </Link>
      </div>
    );
  }

  const isPaid = order.payment_status === "paid";
  const isPendingVerification = order.payment_status === "pending_verification";
  const isManual = order.payment_method === "zelle" || order.payment_method === "venmo";
  const methodLabel = order.payment_method === "zelle" ? "Zelle" : order.payment_method === "venmo" ? "Venmo" : "card";
  const currency = order.listing?.currency ?? "USD";
  const kindLabel = order.listing?.kind ? LISTING_KIND_LABEL[order.listing.kind] : "";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      {/* Hero status */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-8 ${
          isPaid
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-background"
            : waitingForWebhook || isPendingVerification
              ? "border-amber-200 bg-gradient-to-br from-amber-50 via-background to-background"
              : "border-border bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-3">
          {isPaid ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          ) : waitingForWebhook || isPendingVerification ? (
            <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
          ) : (
            <Clock3 className="h-7 w-7 text-muted-foreground" />
          )}
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            {isPaid
              ? "Payment confirmed"
              : isPendingVerification
                ? `${methodLabel} payment sent`
                : waitingForWebhook
                  ? "Finalizing payment"
                  : "Order pending payment"}
          </p>
        </div>

        <h1 className="mt-4 font-serif text-3xl sm:text-4xl leading-tight">
          {isPaid
            ? "You're in. The chef is on it."
            : isPendingVerification
              ? "Thanks — we've logged your payment."
              : waitingForWebhook
                ? "Almost there — confirming with our payment processor."
                : "Your order is reserved."}
        </h1>

        <p className="mt-3 text-foreground/70">
          {isPaid ? (
            <>
              Thanks{user?.email ? `, ${user.email}` : ""}. We've notified{" "}
              <span className="font-medium text-foreground">
                {order.chef?.display_name ?? "the chef"}
              </span>{" "}
              and emailed you a receipt. All food is curated with the intention you'll show up — no refunds.
            </>
          ) : isPendingVerification ? (
            <>
              <span className="font-medium text-foreground">
                {order.chef?.display_name ?? "The chef"}
              </span>{" "}
              will verify the {methodLabel} transfer in their account and confirm your order. This page
              will update automatically the moment they do — usually within a few hours.
            </>
          ) : waitingForWebhook ? (
            <>This usually takes a few seconds. You can safely stay on this page.</>
          ) : (
            <>Complete payment to confirm your spot with the chef.</>
          )}
        </p>

        {isPendingVerification && (
          <div className="mt-6 rounded-xl border border-amber-200/60 bg-background/70 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Payment details we received
            </p>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Method</dt>
                <dd className="font-medium">{methodLabel}</dd>
              </div>
              {order.payment_reference && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Reference / handle</dt>
                  <dd className="font-mono text-xs">{order.payment_reference}</dd>
                </div>
              )}
              {order.payment_proof_note && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Your note</dt>
                  <dd className="text-right text-foreground/80">"{order.payment_proof_note}"</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Need to add proof or fix a detail? Reply to your order email and we'll forward it to the chef.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NextStep
              icon={<Mail className="h-4 w-4" />}
              title="Receipt sent"
              detail="Check your inbox for confirmation"
            />
            <NextStep
              icon={<ChefHat className="h-4 w-4" />}
              title={isManual ? "Chef confirmed receipt" : "Chef notified"}
              detail={isManual ? `${methodLabel} payment verified` : "They'll reach out with prep details"}
            />
            <NextStep
              icon={<CalendarDays className="h-4 w-4" />}
              title={order.fulfillment === "pickup" ? "Pickup details" : "Delivery details"}
              detail={
                order.fulfillment_date
                  ? new Date(order.fulfillment_date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "Coordinated by chef"
              }
            />
          </div>
        )}
      </div>


      {/* Order summary */}
      <section className="mt-10 rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Order summary
            </h2>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </header>

        <div className="divide-y divide-border">
          <Row label="Item">
            <div className="text-right">
              <div className="text-foreground">{order.listing?.title ?? "Listing"}</div>
              {kindLabel && (
                <div className="text-xs text-muted-foreground">{kindLabel}</div>
              )}
            </div>
          </Row>
          <Row label="Quantity">{order.quantity}</Row>
          <Row label="Fulfillment">
            <span className="capitalize">{order.fulfillment}</span>
            {order.fulfillment_date && (
              <span className="text-muted-foreground">
                {" · "}
                {new Date(order.fulfillment_date).toLocaleDateString()}
              </span>
            )}
          </Row>
          {order.address?.line1 && (
            <Row label="Address">
              <span className="inline-flex items-start gap-1 text-right">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>
                  {order.address.line1}
                  {order.address.city ? `, ${order.address.city}` : ""}
                  {order.address.region ? `, ${order.address.region}` : ""}
                  {order.address.postal_code ? ` ${order.address.postal_code}` : ""}
                </span>
              </span>
            </Row>
          )}
          {order.dietary_notes && <Row label="Notes">{order.dietary_notes}</Row>}
          {order.coupon_code && (
            <Row label="Coupon">
              <span className="font-mono text-xs uppercase">{order.coupon_code}</span>
            </Row>
          )}
          <Row label="Payment">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isPaid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isPaid ? "Paid" : "Pending"}
              {isPaid && order.paid_at && (
                <span className="font-normal text-emerald-700/70">
                  · {new Date(order.paid_at).toLocaleDateString()}
                </span>
              )}
            </span>
          </Row>
          <Row label="Total">
            <span className="text-base font-medium text-foreground">
              {formatMoney(order.total_cents, currency)}
            </span>
          </Row>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {order.chef?.tastemaker_id && (
          <Link
            to="/chefs/$chefId"
            params={{ chefId: order.chef.tastemaker_id }}
            className="inline-flex h-11 items-center justify-center rounded-md border border-input px-5 text-[12px] uppercase tracking-[0.22em] hover:bg-accent"
          >
            Visit chef
          </Link>
        )}
        {order.listing?.slug && (
          <Link
            to="/listings/$slug"
            params={{ slug: order.listing.slug }}
            className="inline-flex h-11 items-center justify-center rounded-md border border-input px-5 text-[12px] uppercase tracking-[0.22em] hover:bg-accent"
          >
            View listing
          </Link>
        )}
        <Link
          to="/meal-prep"
          className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-[12px] uppercase tracking-[0.22em] text-background hover:bg-foreground/85"
        >
          Browse more
        </Link>
      </div>

      {isPaid && <RateChefForm orderId={order.id} orderStatus={order.status} />}
    </div>
  );
}

function NextStep({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-3.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm text-foreground">{children}</span>
    </div>
  );
}
