import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type DeliveryStatus = "sent" | "delivered" | "seen";

export function deliveryStatus(n: Pick<Notification, "read_at" | "delivered_at">): DeliveryStatus {
  if (n.read_at) return "seen";
  if (n.delivered_at) return "delivered";
  return "sent";
}

export async function markNotificationsDelivered(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ delivered_at: new Date().toISOString() })
    .in("id", ids)
    .is("delivered_at", null);
  if (error) throw error;
}

/**
 * Acks delivery with bounded exponential backoff. Safe to call from realtime
 * handlers — the underlying update is idempotent (guarded by `delivered_at IS NULL`).
 */
export async function markNotificationsDeliveredWithRetry(
  ids: string[],
  opts: { retries?: number; baseDelayMs?: number } = {},
) {
  if (ids.length === 0) return;
  const retries = opts.retries ?? 4;
  const base = opts.baseDelayMs ?? 400;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await markNotificationsDelivered(ids);
      return;
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const delay = base * 2 ** (attempt - 1) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function fetchMyNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
