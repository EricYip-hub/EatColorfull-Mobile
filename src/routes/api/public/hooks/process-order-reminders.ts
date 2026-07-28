import { createFileRoute } from "@tanstack/react-router";

type ReminderRow = {
  id: string;
  order_id: string;
  chef_id: string;
  guest_user_id: string;
  title: string;
  message: string;
  channel: "in_app" | "sms" | "both";
};

async function sendSms(phone: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const FROM = process.env.TWILIO_FROM_NUMBER;
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
    return { ok: false, error: "twilio_not_configured" };
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: FROM, Body: body.slice(0, 1500) }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `twilio_${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200) };
  }
}

export const Route = createFileRoute("/api/public/hooks/process-order-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: due, error } = await supabaseAdmin
          .from("order_reminders")
          .select("id, order_id, chef_id, guest_user_id, title, message, channel")
          .eq("status", "pending")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(50);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        const rows = (due ?? []) as ReminderRow[];
        let sent = 0;
        let failed = 0;

        for (const r of rows) {
          let inAppSentAt: string | null = null;
          let smsSentAt: string | null = null;
          let smsError: string | null = null;

          // In-app notification
          if (r.channel === "in_app" || r.channel === "both") {
            const { error: nErr } = await supabaseAdmin.from("notifications").insert({
              user_id: r.guest_user_id,
              kind: "chef_reminder",
              title: r.title,
              body: r.message,
              link: `/orders/${r.order_id}`,
            });
            if (!nErr) inAppSentAt = new Date().toISOString();
            else smsError = `notif_error: ${nErr.message}`;
          }

          // SMS
          if (r.channel === "sms" || r.channel === "both") {
            const { data: order } = await supabaseAdmin
              .from("chef_orders")
              .select("guest_phone")
              .eq("id", r.order_id)
              .single();
            const phone = (order as any)?.guest_phone as string | null;
            if (!phone) {
              smsError = (smsError ? smsError + "; " : "") + "no_guest_phone";
            } else {
              const result = await sendSms(phone, `${r.title}\n\n${r.message}`);
              if (result.ok) smsSentAt = new Date().toISOString();
              else smsError = (smsError ? smsError + "; " : "") + result.error;
            }
          }

          const success =
            (r.channel === "in_app" && !!inAppSentAt) ||
            (r.channel === "sms" && !!smsSentAt) ||
            (r.channel === "both" && (!!inAppSentAt || !!smsSentAt));

          await supabaseAdmin
            .from("order_reminders")
            .update({
              status: success ? "sent" : "failed",
              in_app_sent_at: inAppSentAt,
              sms_sent_at: smsSentAt,
              sms_error: smsError,
            })
            .eq("id", r.id);

          if (success) sent++;
          else failed++;
        }

        return Response.json({ processed: rows.length, sent, failed });
      },
    },
  },
});
