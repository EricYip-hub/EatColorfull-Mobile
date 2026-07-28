import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TABLES } from "@/lib/tables-data";
import { fetchMyRequests, cancelOwnRequest, markPaid, type JoinRequest } from "@/lib/join-requests";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your tables — Colorfull" }] }),
  component: Dashboard,
});

const STATUS_LABEL: Record<JoinRequest["status"], string> = {
  pending: "Awaiting host review",
  approved: "Approved · pay to confirm",
  declined: "Not selected",
  paid: "Confirmed · seat reserved",
  cancelled: "Cancelled",
  waitlisted: "On the waitlist",
};

function Dashboard() {
  const { user, isHost, loading } = useAuth();
  const qc = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: fetchMyRequests,
    enabled: !isHost,
  });

  // /dashboard is the guest tables view. Hosts have their own surface at
  // /host/dashboard — send them there instead of showing the guest view.
  if (!loading && isHost) {
    return <Navigate to="/host/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-3 font-serif text-5xl">Your tables.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        {isHost && (
          <Link to="/host/dashboard" className="text-[11px] uppercase tracking-[0.22em] underline underline-offset-[6px]">
            Host dashboard →
          </Link>
        )}
      </div>

      <section className="mt-14">
        <p className="eyebrow">Your requests</p>
        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !requests || requests.length === 0 ? (
          <div className="mt-6 border border-border bg-secondary/40 p-10 text-center">
            <p className="font-serif text-2xl">You haven't requested a seat yet.</p>
            <Link to="/discover" className="mt-6 inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background">
              Browse tables
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {requests.map((r) => {
              const t = TABLES.find((x) => x.id === r.table_id);
              return (
                <li key={r.id} className="grid gap-6 py-6 md:grid-cols-[120px_1fr_auto] md:items-center">
                  <div className="aspect-[4/5] w-24 overflow-hidden bg-muted">
                    {t && <img src={t.image} alt={t.title} className="h-full w-full object-cover" />}
                  </div>
                  <div>
                    <p className="eyebrow">{t?.archetype ?? r.table_id}</p>
                    <h3 className="mt-1 font-serif text-xl">{t?.title ?? r.table_id}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t?.neighborhood} · {t?.date}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-primary">
                      {STATUS_LABEL[r.status]}
                    </p>
                    {r.host_note && (
                      <p className="mt-2 font-serif italic text-sm text-foreground/80">
                        Host: "{r.host_note}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-2 md:items-end">
                    {r.status === "approved" && (
                      <button
                        onClick={async () => {
                          await markPaid(r.id);
                          qc.invalidateQueries({ queryKey: ["my-requests"] });
                          qc.invalidateQueries({ queryKey: ["seat-counts"] });
                        }}
                        className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
                      >
                        Pay & confirm seat
                      </button>
                    )}
                    {r.status === "paid" && (
                      <>
                        <Link
                          to="/review/$tableId"
                          params={{ tableId: r.table_id }}
                          className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
                        >
                          Share your night
                        </Link>
                        <Link
                          to="/bring-this-home"
                          search={{ table: r.table_id }}
                          className="inline-flex h-11 items-center justify-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
                        >
                          Bring this home
                        </Link>
                      </>
                    )}
                    {(r.status === "pending" || r.status === "approved" || r.status === "waitlisted") && (
                      <button
                        onClick={async () => {
                          if (!confirm(r.status === "waitlisted" ? "Leave the waitlist?" : "Cancel this request?")) return;
                          await cancelOwnRequest(r.id);
                          qc.invalidateQueries({ queryKey: ["my-requests"] });
                          qc.invalidateQueries({ queryKey: ["seat-counts"] });
                        }}
                        className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                      >
                        {r.status === "waitlisted" ? "Leave waitlist" : "Cancel"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
