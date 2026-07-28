import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-context";
import {
  createOrder,
  LISTING_KIND_LABEL,
  type ChefFulfillment,
  type ChefListing,
  type ChefProfile,
} from "@/lib/chef-kitchen";
import { StripeEmbeddedCheckoutPanel } from "@/components/chef/StripeEmbeddedCheckout";
import { ManualPaymentPanel } from "@/components/chef/ManualPaymentPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInNotice } from "@/components/site/SignInNotice";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ChefListing & { chef: ChefProfile };
  sourceVideoId?: string | null;
};

export function CheckoutDialog({ open, onOpenChange, listing, sourceVideoId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState<ChefFulfillment>("pickup");
  const [fulfillmentDate, setFulfillmentDate] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [waiverAgreed, setWaiverAgreed] = useState(false);

  const unitPrice = listing.price_cents ?? 0;
  const totalCents = unitPrice * quantity;
  const inventoryCap = listing.inventory_remaining ?? null;

  function reset() {
    setOrderId(null);
    setSubmitting(false);
    setWaiverAgreed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to shop this meal plan.");
      onOpenChange(false);
      navigate({
        to: "/login",
        search: { redirect: `/listings/${listing.slug}` } as any,
      });
      return;
    }
    if (inventoryCap != null && quantity > inventoryCap) {
      toast.error(`Only ${inventoryCap} left this week.`);
      return;
    }
    if (!waiverAgreed) {
      toast.error("Please read and agree to the guest waiver to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        user_id: user.id,
        chef_id: listing.chef.id,
        listing_id: listing.id,
        quantity,
        fulfillment,
        fulfillment_date: fulfillmentDate || null,
        dietary_notes: dietaryNotes || null,
        total_cents: totalCents,
        source_video_id: sourceVideoId ?? null,
      });
      setOrderId(order.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start checkout.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {LISTING_KIND_LABEL[listing.kind]} · {listing.title}
          </DialogTitle>
          <DialogDescription>
            {orderId
              ? "Complete payment below to confirm your order."
              : "Pay now to reserve. All food is purchased and curated with the intention you will show up — no refunds."}
          </DialogDescription>
        </DialogHeader>

        {orderId ? (
          <PaymentMethodTabs
            orderId={orderId}
            totalCents={totalCents}
            zelle={listing.chef.zelle_handle ?? null}
            venmo={listing.chef.venmo_handle ?? null}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignInNotice reason="checkout" redirect={`/listings/${listing.slug}`} />
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={inventoryCap ?? 99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              />
              {inventoryCap != null && (
                <p className="text-xs text-muted-foreground">{inventoryCap} remaining</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fulfillment</Label>
              <RadioGroup
                value={fulfillment}
                onValueChange={(v) => setFulfillment(v as ChefFulfillment)}
                className="grid grid-cols-2 gap-2"
              >
                <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 has-[[data-state=checked]]:border-foreground">
                  <RadioGroupItem value="pickup" />
                  Pickup
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 has-[[data-state=checked]]:border-foreground">
                  <RadioGroupItem value="delivery" />
                  Delivery
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                {listing.kind === "hosted_table" || listing.kind === "private_dining"
                  ? "Preferred date"
                  : "Pickup / delivery date"}
              </Label>
              <Input
                id="date"
                type="date"
                value={fulfillmentDate}
                onChange={(e) => setFulfillmentDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Dietary notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Allergies, preferences, anything the chef should know."
                maxLength={500}
              />
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-serif text-2xl">${(totalCents / 100).toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sales tax calculated at checkout.</p>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Allergy & dietary disclaimer</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Unless expressly stated in the event description, Colorfull does not represent that
                any experience is kosher, halal, vegan, vegetarian, gluten-free, organic,
                allergen-free, medically appropriate, or free from cross-contamination. Guests are
                responsible for disclosing allergies and dietary restrictions before attending.
              </p>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guest waiver</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                I understand that Colorfull experiences may take place in private residences,
                third-party venues, restaurants, commercial kitchens, permitted home kitchens, or
                other locations operated by independent hosts, chefs, caterers, venues, or
                providers. I understand that Colorfull does not prepare food, operate kitchens,
                inspect venues, sell alcohol, guarantee allergen-free food, or guarantee the conduct
                of any host, chef, guest, or provider. I agree to disclose allergies, dietary
                restrictions, medical conditions, and sensitivities before attending. I voluntarily
                assume the ordinary risks associated with dining, private events, travel to and
                from locations, social interaction, food consumption, and alcohol if present.
              </p>
              <label className="flex cursor-pointer items-start gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={waiverAgreed}
                  onChange={(e) => setWaiverAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
                />
                <span>I have read and agree.</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !waiverAgreed}>
                {submitting ? "Starting…" : "Continue to payment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodTabs({
  orderId,
  totalCents,
  zelle,
  venmo,
}: {
  orderId: string;
  totalCents: number;
  zelle: string | null;
  venmo: string | null;
}) {
  const methods: { value: string; label: string }[] = [
    { value: "card", label: "Card" },
  ];
  if (zelle) methods.push({ value: "zelle", label: "Zelle" });
  if (venmo) methods.push({ value: "venmo", label: "Venmo" });

  return (
    <Tabs defaultValue="card" className="w-full">
      <TabsList
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}
      >
        {methods.map((m) => (
          <TabsTrigger key={m.value} value={m.value}>
            {m.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="card" className="pt-3">
        <StripeEmbeddedCheckoutPanel
          orderId={orderId}
          returnUrl={`${window.location.origin}/orders/${orderId}?paid=1`}
        />
      </TabsContent>
      {zelle && (
        <TabsContent value="zelle" className="pt-3">
          <ManualPaymentPanel
            orderId={orderId}
            method="zelle"
            handle={zelle}
            amountCents={totalCents}
          />
        </TabsContent>
      )}
      {venmo && (
        <TabsContent value="venmo" className="pt-3">
          <ManualPaymentPanel
            orderId={orderId}
            method="venmo"
            handle={venmo}
            amountCents={totalCents}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

