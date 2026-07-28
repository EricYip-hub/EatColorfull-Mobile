import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REMINDER_TEMPLATES = {
  prep_starting: {
    label: "We're starting to prep your order",
    title: "Your chef is prepping your order",
    body: "Good news — your chef is starting on your order now.",
  },
  ready_soon: {
    label: "Your order is almost ready",
    title: "Almost ready",
    body: "Your order will be ready in about 30 minutes. Get on your way!",
  },
  ready_now: {
    label: "Your order is ready",
    title: "Your order is ready",
    body: "Your order is ready for pickup. Come grab it while it's hot!",
  },
  pickup_one_hour: {
    label: "Pickup reminder (1 hour out)",
    title: "Pickup in 1 hour",
    body: "Reminder: your pickup is in about 1 hour.",
  },
  pickup_today: {
    label: "Pickup reminder (day-of)",
    title: "Pickup today",
    body: "Just a reminder — your pickup is today. We can't wait to see you.",
  },
  running_late: {
    label: "Running a little late",
    title: "Heads up — running ~15 min late",
    body: "We're running about 15 minutes behind. Thank you for your patience.",
  },
  custom: {
    label: "Custom message",
    title: "A note from your chef",
    body: "",
  },
} as const;

export type ReminderTemplateKey = keyof typeof REMINDER_TEMPLATES;

const scheduleSchema = z.object({
  orderId: z.string().uuid(),
  template: z.enum(Object.keys(REMINDER_TEMPLATES) as [ReminderTemplateKey, ...ReminderTemplateKey[]]),
  scheduledAt: z.string().datetime(),
  customMessage: z.string().trim().min(1).max(500).optional(),
  channel: z.enum(["in_app", "sms", "both"]).default("both"),
});

export const scheduleOrderReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scheduleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify chef owns this order
    const { data: order, error: orderErr } = await supabase
      .from("chef_orders")
      .select("id, user_id, chef_id, chef:chef_profiles!inner(user_id)")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");
    if ((order as any).chef.user_id !== userId) {
      throw new Error("Only the chef can schedule reminders for this order");
    }

    const tpl = REMINDER_TEMPLATES[data.template];
    const message = data.customMessage?.trim() || tpl.body;
    if (!message) throw new Error("Message required");

    const scheduled = new Date(data.scheduledAt);
    if (isNaN(scheduled.getTime())) throw new Error("Invalid time");

    const { data: reminder, error } = await supabase
      .from("order_reminders")
      .insert({
        order_id: order.id,
        chef_id: order.chef_id,
        guest_user_id: order.user_id,
        scheduled_at: scheduled.toISOString(),
        template: data.template,
        title: tpl.title,
        message,
        channel: data.channel,
        created_by: userId,
        // fire immediately if scheduled in the past
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return { reminder };
  });

export const listOrderReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("order_reminders")
      .select("*")
      .eq("order_id", data.orderId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return { reminders: rows ?? [] };
  });

export const cancelOrderReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("order_reminders")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });
