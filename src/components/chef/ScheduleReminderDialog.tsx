import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REMINDER_TEMPLATES,
  scheduleOrderReminder,
  type ReminderTemplateKey,
} from "@/lib/order-reminders.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderLabel: string;
  onScheduled?: () => void;
};

function defaultDateTimeLocal(minutesFromNow = 60): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ScheduleReminderDialog({ open, onOpenChange, orderId, orderLabel, onScheduled }: Props) {
  const schedule = useServerFn(scheduleOrderReminder);
  const [template, setTemplate] = useState<ReminderTemplateKey>("pickup_one_hour");
  const [customMessage, setCustomMessage] = useState("");
  const [channel, setChannel] = useState<"in_app" | "sms" | "both">("both");
  const [when, setWhen] = useState(defaultDateTimeLocal(60));
  const [sendNow, setSendNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tpl = REMINDER_TEMPLATES[template];
  const messagePreview = template === "custom" ? customMessage : customMessage || tpl.body;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const scheduledAt = sendNow ? new Date().toISOString() : new Date(when).toISOString();
      await schedule({
        data: {
          orderId,
          template,
          scheduledAt,
          channel,
          ...(customMessage.trim() ? { customMessage: customMessage.trim() } : {}),
        },
      });
      toast.success(sendNow ? "Reminder will send within a couple of minutes." : "Reminder scheduled.");
      onOpenChange(false);
      setCustomMessage("");
      setSendNow(false);
      onScheduled?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not schedule reminder.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Schedule reminder</DialogTitle>
          <DialogDescription>For order {orderLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as ReminderTemplateKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REMINDER_TEMPLATES) as ReminderTemplateKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{REMINDER_TEMPLATES[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg">
              Message {template === "custom" ? "(required)" : "(optional override)"}
            </Label>
            <Textarea
              id="msg"
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={tpl.body || "Type your message..."}
              maxLength={500}
              required={template === "custom"}
            />
            {template !== "custom" && messagePreview && (
              <p className="text-xs text-muted-foreground line-clamp-2">Preview: {messagePreview}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">In-app + SMS</SelectItem>
                <SelectItem value="in_app">In-app only</SelectItem>
                <SelectItem value="sms">SMS only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              SMS is sent only if the guest provided a phone number at checkout.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="when">When</Label>
            <div className="flex items-center gap-2">
              <Input
                id="when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                disabled={sendNow}
              />
              <Button type="button" variant={sendNow ? "default" : "outline"} size="sm" onClick={() => setSendNow((v) => !v)}>
                {sendNow ? "Sending now" : "Send now"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Scheduling…" : sendNow ? "Send" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
