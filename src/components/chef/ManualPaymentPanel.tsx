import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Method = "zelle" | "venmo";

type Props = {
  orderId: string;
  method: Method;
  handle: string;
  amountCents: number;
};

export function ManualPaymentPanel({ orderId, method, handle, amountCents }: Props) {
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const label = method === "zelle" ? "Zelle" : "Venmo";
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  const memo = `Order ${orderId.slice(0, 8)}`;

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error("Add the confirmation # or your handle so we can match it.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_manual_chef_payment", {
      _order_id: orderId,
      _method: method,
      _reference: reference,
      _note: note,
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Payment submitted. The chef will verify and confirm shortly.");
    navigate({ to: "/orders/$orderId", params: { orderId }, search: {} });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Send <span className="font-semibold text-foreground">{amount}</span> via {label} to:
        </p>
        <CopyRow label={`${label} handle`} value={handle} onCopy={() => copy(handle, "handle")} copied={copied === "handle"} />
        <CopyRow label="Amount" value={amount} onCopy={() => copy(amount, "amount")} copied={copied === "amount"} />
        <CopyRow label="Memo / note" value={memo} onCopy={() => copy(memo, "memo")} copied={copied === "memo"} />
        <p className="text-xs text-muted-foreground">
          Include the memo so the chef can match your payment to this order.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ref">Confirmation # or your {label} handle</Label>
        <Input
          id="ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={method === "zelle" ? "e.g. ZL123456 or your email" : "e.g. @yourname"}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Sent from Jane Doe — let me know if anything's off."
          maxLength={400}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : `I've sent the ${label} payment`}
      </Button>
      <p className="text-xs text-muted-foreground">
        Your order will sit at <strong>Pending verification</strong> until the chef confirms receipt.
        Every step is logged for our records.
      </p>
    </form>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 text-xs text-foreground hover:opacity-70"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
