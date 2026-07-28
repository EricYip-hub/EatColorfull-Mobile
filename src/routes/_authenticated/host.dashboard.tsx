import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TABLES } from "@/lib/tables-data";
import { fetchAllPendingRequests, decideRequest } from "@/lib/join-requests";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { GoLiveReminderBanner } from "@/components/admin/GoLiveReminderBanner";

export const Route = createFileRoute("/_authenticated/host/dashboard")({
  head: () => ({ meta: [{ title: "Host dashboard — Colorfull" }] }),
  component: HostDashboard,
});

function HostDashboard() {
  const { isHost, loading } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "waitlisted" | "all">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["all-requests"],
    queryFn: fetchAllPendingRequests,
    enabled: isHost,
  });

  if (loading) return <p className="px-6 py-20 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!isHost) {
    return (
      <section
        data-testid="host-access-blocked"
        className="mx-auto max-w-2xl px-6 py-24 text-center"
      >
        <p className="eyebrow">Host access required</p>
        <h1 className="mt-3 font-serif text-4xl">This is the host dashboard.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your account isn't approved as a host yet. Apply to host a Colorfull
          table, or head back to your guest dashboard.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/host"
            className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
          >
            Apply to host
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center border border-foreground px-6 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            Back to your tables
          </Link>
        </div>
      </section>
    );
  }

  const requests = (data ?? []).filter((r: any) =>
    filter === "all" ? true : r.status === filter
  );

  return (
    <div>
      <GoLiveReminderBanner />
      <div className="mx-auto max-w-6xl px-6 py-20">
      <p className="eyebrow">Host dashboard</p>
      <h1 className="mt-3 font-serif text-5xl">Requests at your tables.</h1>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">
        Approve guests for the table. Approved guests then pay to confirm their seat.
      </p>
      <div className="mt-6">
        <Link
          to="/host/events"
          className="inline-flex h-11 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
        >
          Build a pop-up event →
        </Link>
      </div>

      <div className="mt-10 flex gap-1 border-b border-border">
        {(["pending", "approved", "waitlisted", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`-mb-px border-b-2 px-5 py-3 text-[11px] uppercase tracking-[0.22em] ${
              filter === f ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="mt-12 font-serif text-2xl text-muted-foreground">No {filter} requests.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {requests.map((r: any) => {
            const t = TABLES.find((x) => x.id === r.table_id);
            const profile = r.profiles ?? {};
            const notif = r.notification ?? null;
            const notifStatus: "sent" | "delivered" | "seen" | null = notif
              ? notif.read_at
                ? "seen"
                : notif.delivered_at
                  ? "delivered"
                  : "sent"
              : null;
            return (
              <li key={r.id} className="grid gap-6 py-7 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h3 className="font-serif text-2xl">{profile.display_name ?? "Guest"}</h3>
                    <span className="text-[11px] uppercase tracking-[0.22em] text-primary">{r.status}</span>
                    {notifStatus && (
                      <span
                        title={
                          notifStatus === "seen"
                            ? "Guest opened the notification"
                            : notifStatus === "delivered"
                              ? "Notification delivered to guest's device"
                              : "Notification queued — not yet delivered"
                        }
                        className={`text-[10px] uppercase tracking-[0.2em] ${
                          notifStatus === "seen"
                            ? "text-muted-foreground/70"
                            : notifStatus === "delivered"
                              ? "text-foreground/80"
                              : "text-primary"
                        }`}
                      >
                        {notifStatus === "seen" ? "Seen by guest" : notifStatus === "delivered" ? "Delivered" : "Sent"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {t?.title ?? r.table_id} · {t?.neighborhood} · {t?.date}
                  </p>
                  {profile.bio && (
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{profile.bio}</p>
                  )}
                  {r.message && (
                    <p className="mt-3 max-w-2xl font-serif italic text-sm text-foreground/80">
                      "{r.message}"
                    </p>
                  )}
                  {profile.dietary_notes && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Dietary: {profile.dietary_notes}
                    </p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex items-start gap-2">
                    <button
                      onClick={async () => {
                        await decideRequest(r.id, "approved");
                        qc.invalidateQueries({ queryKey: ["all-requests"] });
                        qc.invalidateQueries({ queryKey: ["seat-counts"] });
                      }}
                      className="inline-flex h-10 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        const note = prompt("Optional note to the guest:") || undefined;
                        await decideRequest(r.id, "declined", note);
                        qc.invalidateQueries({ queryKey: ["all-requests"] });
                      }}
                      className="inline-flex h-10 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <MealPlanRequestsSection />
      </div>
    </div>
  );
}

function MealPlanRequestsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["meal-plan-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section className="mt-20">
      <p className="eyebrow">Bring this home</p>
      <h2 className="mt-3 font-serif text-3xl">Meal plan requests.</h2>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {data.map((r: any) => {
            const t = r.table_id ? TABLES.find((x) => x.id === r.table_id) : null;
            return (
              <li key={r.id} className="grid gap-3 py-5 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-serif text-xl">{r.plan_type || "Custom plan"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t ? `${t.title} · ` : ""}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-foreground/80 md:grid-cols-2">
                    {r.cuisine_style && <Row k="Cuisine" v={r.cuisine_style} />}
                    {r.dietary_restrictions && <Row k="Dietary" v={r.dietary_restrictions} />}
                    {r.wellness_goals && <Row k="Goals" v={r.wellness_goals} />}
                    {r.foods_more_of && <Row k="More of" v={r.foods_more_of} />}
                    {r.foods_to_avoid && <Row k="Avoid" v={r.foods_to_avoid} />}
                    <Row k="Days" v={String(r.days_count ?? "—")} />
                    <Row k="Grocery list" v={r.grocery_list ? "Yes" : "No"} />
                    <Row k="Hosting menu" v={r.hosting_menu ? "Yes" : "No"} />
                  </dl>
                </div>
                <span className="self-start text-[10px] uppercase tracking-[0.22em] text-primary">
                  {r.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{k}:</dt>
      <dd>{v}</dd>
    </div>
  );
}
