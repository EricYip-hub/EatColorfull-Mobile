import { supabase } from "@/integrations/supabase/client";

export type RequestStatus = "pending" | "approved" | "declined" | "paid" | "cancelled" | "waitlisted";

export type JoinRequest = {
  id: string;
  user_id: string;
  table_id: string;
  status: RequestStatus;
  message: string | null;
  host_note: string | null;
  decided_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type SeatCounts = {
  table_id: string;
  paid_seats: number;
  approved_seats: number;
  pending_seats: number;
  waitlisted_seats: number;
};

export async function fetchSeatCounts(): Promise<Record<string, SeatCounts>> {
  // Aggregate directly from join_requests so we don't depend on a view shape.
  const { data, error } = await supabase
    .from("join_requests")
    .select("table_id, status");
  if (error) throw error;
  const map: Record<string, SeatCounts> = {};
  for (const row of data ?? []) {
    const tid = row.table_id as string;
    if (!map[tid]) {
      map[tid] = { table_id: tid, paid_seats: 0, approved_seats: 0, pending_seats: 0, waitlisted_seats: 0 };
    }
    if (row.status === "paid") map[tid].paid_seats += 1;
    else if (row.status === "approved") map[tid].approved_seats += 1;
    else if (row.status === "pending") map[tid].pending_seats += 1;
    else if (row.status === "waitlisted") map[tid].waitlisted_seats += 1;
  }
  return map;
}

export async function fetchMyRequests() {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JoinRequest[];
}

/** Calls the request_seat RPC which auto-routes between pending and waitlisted. */
export async function createJoinRequest(input: { table_id: string; message: string }) {
  const { data, error } = await supabase.rpc("request_seat", {
    _table_id: input.table_id,
    _message: input.message,
  });
  if (error) throw error;
  const { logFormSubmission } = await import("@/lib/log-form-submission");
  const { data: userData } = await supabase.auth.getUser();
  void logFormSubmission({
    source: "join_request",
    email: userData.user?.email ?? null,
    location: input.table_id,
    notes: input.message,
    payload: { status: (data as { status?: string } | null)?.status ?? null },
  });
  return data as unknown as JoinRequest;
}

export async function fetchAllPendingRequests() {
  const { data, error } = await supabase
    .from("join_requests")
    .select(
      "*, profiles:user_id(display_name, bio, dietary_notes), notification:notification_id(id, delivered_at, read_at)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function decideRequest(id: string, decision: "approved" | "declined", note?: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("join_requests")
    .update({
      status: decision,
      host_note: note ?? null,
      decided_by: userData.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markPaid(id: string) {
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelOwnRequest(id: string) {
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
