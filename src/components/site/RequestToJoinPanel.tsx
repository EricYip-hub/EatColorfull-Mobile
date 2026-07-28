import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { Table } from "@/lib/tables-data";
import { useAuth } from "@/lib/auth-context";
import { createJoinRequest, fetchMyRequests, fetchSeatCounts } from "@/lib/join-requests";
import { notifyAdminsOfJoinRequest } from "@/lib/admin-notifications.functions";
import { SignInNotice } from "@/components/site/SignInNotice";

export function RequestToJoinPanel({ table }: { table: Table }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notifyAdmins = useServerFn(notifyAdminsOfJoinRequest);

  const { data: seatMap } = useQuery({
    queryKey: ["seat-counts"],
    queryFn: fetchSeatCounts,
  });
  const { data: myRequests } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: fetchMyRequests,
    enabled: !!user,
  });

  const counts = seatMap?.[table.id];
  const seatsRemaining = table.seatsRemaining;
  const existing = myRequests?.find((r) => r.table_id === table.id && r.status !== "cancelled" && r.status !== "declined");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!user) {
      toast.info("Please sign in to reserve a seat at this table.");
      navigate({ to: "/login", search: { redirect: `/tables/${table.id}` } });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createJoinRequest({ table_id: table.id, message });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      qc.invalidateQueries({ queryKey: ["seat-counts"] });
      setMessage("");
      // Fire-and-forget admin alert — never block the user on email send.
      notifyAdmins({
        data: {
          requestId: created.id,
          tableId: table.id,
          tableTitle: table.title,
          tableDate: table.date,
          neighborhood: table.neighborhood,
          message: created.message ?? undefined,
          status: created.status,
        },
      }).catch((e) => console.error("admin join-request notify failed", e));
    } catch (e: any) {
      const raw = e?.message ?? "Could not submit request.";
      const isDuplicateKey = /join_requests_user_id_table_id_key|duplicate key value/i.test(raw);
      if (isDuplicateKey && seatsRemaining > 0) {
        setError("You've already requested a seat at this table. Check your dashboard for the status.");
      } else {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-border bg-secondary/40 p-7">
      <SignInNotice reason="reserve" redirect={`/tables/${table.id}`} />
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-3xl">${table.price}</span>
        <span className="text-xs text-muted-foreground">per seat</span>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        {seatsRemaining > 0 ? (
          <>
            {seatsRemaining} of {table.seatsTotal} seats remaining
            {counts && counts.pending_seats > 0 && (
              <span className="block mt-1 opacity-70">{counts.pending_seats} request{counts.pending_seats > 1 ? "s" : ""} under review</span>
            )}
          </>
        ) : (
          <>
            <span className="text-foreground">Fully booked.</span>{" "}
            {counts && counts.waitlisted_seats > 0 && (
              <span className="opacity-70">{counts.waitlisted_seats} on the waitlist.</span>
            )}
          </>
        )}
      </div>

      {existing ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
            {existing.status === "pending" && "Awaiting host review"}
            {existing.status === "approved" && "Approved · pay to confirm"}
            {existing.status === "paid" && "Confirmed — see you at the table"}
            {existing.status === "waitlisted" && "On the waitlist"}
          </p>
          {existing.status === "waitlisted" && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              We'll notify you the instant a seat opens. You'll have a window to confirm and pay before the next guest is offered the spot.
            </p>
          )}
          <Link to="/dashboard" className="mt-4 inline-flex h-11 w-full items-center justify-center border border-foreground px-6 text-[11px] uppercase tracking-[0.24em] hover:bg-foreground hover:text-background">
            Manage in your dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-6 border-t border-border pt-5">
          {seatsRemaining === 0 && (
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-primary">
              Join the waitlist
            </p>
          )}
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            A note to the host {user ? "(optional)" : ""}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell the host who you are and why this table calls you."
            className="mt-2 w-full border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="mt-4 inline-flex h-12 w-full items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90 disabled:opacity-60"
          >
            {submitting
              ? "Sending…"
              : !user
              ? "Sign in to request"
              : seatsRemaining === 0
              ? "Join the waitlist"
              : "Request to join"}
          </button>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {seatsRemaining === 0
              ? "If a seat opens, you'll be auto-promoted and notified to confirm."
              : "Hosts review each request. Approved guests pay to confirm and receive the private address."}
          </p>
        </div>
      )}
    </div>
  );
}
