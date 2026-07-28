import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listHostApplications,
  listJoinRequests,
  listAuditTrail,
  updateHostApplicationStatus,
  updateJoinRequestStatus,
  exportAuditHistory,
  getHostComplianceDocUrl,
  type HostApplicationRow,
  type JoinRequestRow,
  type ComplianceDoc,
} from "@/lib/admin-inbox.functions";
import { TABLES } from "@/lib/tables-data";
import { computeAriaUpdate, EXPIRED_ANNOUNCEMENT } from "@/lib/aria-countdown";

export const Route = createFileRoute("/admin/inbox")({
  head: () => ({
    meta: [
      { title: "Admin Inbox — Colorfull" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminInbox,
});

type Tab = "applications" | "requests";

const APP_STATUSES = ["all", "new", "reviewing", "approved", "declined", "archived"] as const;
const REQ_STATUSES = ["all", "pending", "waitlisted", "approved", "declined", "paid", "cancelled"] as const;
type AppFilter = (typeof APP_STATUSES)[number];
type ReqFilter = (typeof REQ_STATUSES)[number];

function escapeCsvCell(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function AdminInbox() {
  const [tab, setTab] = useState<Tab>("applications");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [reqFilter, setReqFilter] = useState<ReqFilter>("all");

  const apps = useQuery({
    queryKey: ["admin-host-applications"],
    queryFn: () => listHostApplications(),
  });
  const reqs = useQuery({
    queryKey: ["admin-join-requests"],
    queryFn: () => listJoinRequests(),
  });

  const appRows = apps.data ?? [];
  const reqRows = reqs.data ?? [];
  const newAppCount = appRows.filter((a) => a.status === "new").length;
  const pendingReqCount = reqRows.filter((r) => r.status === "pending").length;

  const appCounts = Object.fromEntries(
    APP_STATUSES.map((s) => [s, s === "all" ? appRows.length : appRows.filter((r) => r.status === s).length]),
  );
  const reqCounts = Object.fromEntries(
    REQ_STATUSES.map((s) => [s, s === "all" ? reqRows.length : reqRows.filter((r) => r.status === s).length]),
  );

  const filteredApps = appFilter === "all" ? appRows : appRows.filter((r) => r.status === appFilter);
  const filteredReqs = reqFilter === "all" ? reqRows : reqRows.filter((r) => r.status === reqFilter);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Inbox</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Triage new host applications and guest join requests in one place.
          </p>
        </div>
        <ExportAuditButton />
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        <TabButton active={tab === "applications"} onClick={() => setTab("applications")}>
          Host applications
          <Badge>{newAppCount}</Badge>
        </TabButton>
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          Join requests
          <Badge>{pendingReqCount}</Badge>
        </TabButton>
      </div>

      {tab === "applications" ? (
        <FilterBar
          statuses={APP_STATUSES}
          counts={appCounts}
          value={appFilter}
          onChange={(v) => setAppFilter(v as AppFilter)}
        />
      ) : (
        <FilterBar
          statuses={REQ_STATUSES}
          counts={reqCounts}
          value={reqFilter}
          onChange={(v) => setReqFilter(v as ReqFilter)}
        />
      )}

      <div className="mt-6">
        {tab === "applications" ? (
          <ApplicationsList
            loading={apps.isLoading}
            error={apps.error}
            rows={filteredApps}
          />
        ) : (
          <RequestsList
            loading={reqs.isLoading}
            error={reqs.error}
            rows={filteredReqs}
          />
        )}
      </div>
    </section>
  );
}

function FilterBar({
  statuses,
  counts,
  value,
  onChange,
}: {
  statuses: readonly string[];
  counts: Record<string, number>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {statuses.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] ${
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
            <span className={active ? "opacity-80" : "opacity-60"}>{counts[s] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.22em] ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  if (!children || children === 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center bg-foreground px-1.5 text-[10px] text-background">
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "new" || status === "pending"
      ? "border-foreground/40 text-foreground"
      : status === "reviewing"
        ? "border-amber-500/50 text-amber-700"
        : status === "waitlisted"
          ? "border-sky-500/50 text-sky-700"
          : status === "approved" || status === "paid"
            ? "border-emerald-600/50 text-emerald-700"
            : status === "declined" || status === "cancelled"
              ? "border-destructive/40 text-destructive"
              : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex border px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${tone}`}>
      {status}
    </span>
  );
}


function ApplicationsList({
  loading,
  error,
  rows,
}: {
  loading: boolean;
  error: unknown;
  rows: HostApplicationRow[];
}) {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const onUpdate = async (id: string, status: HostApplicationRow["status"]) => {
    try {
      const res = await updateHostApplicationStatus({ data: { id, status: status as never } });
      if (status === "approved" && res?.hostGranted) {
        toast.success(`Approved — host access granted to ${res.email}`);
      } else if (status === "approved" && res?.hostUserMissing) {
        toast.success(`Marked approved. ${res.email} hasn't signed up yet — host role will need to be granted after they create an account.`);
      } else {
        toast.success(`Marked ${status}`);
      }
      qc.invalidateQueries({ queryKey: ["admin-host-applications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load."}
      </p>
    );
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No applications yet.</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((r) => {
        const open = openId === r.id;
        return (
          <li key={r.id} className="py-5">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-serif text-lg">{r.name}</p>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()} · {r.location} · {r.experience_type}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <a className="underline underline-offset-4" href={`mailto:${r.email}`}>
                    {r.email}
                  </a>{" "}
                  · {r.phone}
                  {r.instagram ? <> · {r.instagram}</> : null}
                </p>
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="mt-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]"
                >
                  {open ? "Hide details" : "View details"}
                </button>
                {open && (
                  <>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <Field label="Background">{r.background}</Field>
                      <Field label="Sample menu">{r.sample_menu}</Field>
                      <Field label="Guest count">{String(r.guest_count)}</Field>
                      <Field label="Location status">{r.location_status}</Field>
                      <Field label="Motivation">{r.motivation}</Field>
                      {r.food_prep_location && <Field label="Food prep location">{r.food_prep_location}</Field>}
                      {r.county_city && <Field label="County / city">{r.county_city}</Field>}
                      {r.permit_number && <Field label="Permit #">{r.permit_number}</Field>}
                      {r.permit_agency && <Field label="Issuing agency">{r.permit_agency}</Field>}
                      {r.permit_expiration && <Field label="Permit expires">{r.permit_expiration}</Field>}
                      {r.emergency_contact && <Field label="Emergency contact">{r.emergency_contact}</Field>}
                    </dl>
                    <ComplianceDocsPanel docs={r.compliance_docs ?? []} />
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                {r.status === "new" && (
                  <button
                    onClick={() => onUpdate(r.id, "reviewing")}
                    className="inline-flex h-9 items-center border border-amber-500/50 px-4 text-[11px] uppercase tracking-[0.22em] text-amber-700 hover:bg-amber-500/10"
                  >
                    Mark reviewing
                  </button>
                )}
                {r.status !== "approved" && (
                  <button
                    onClick={() => onUpdate(r.id, "approved")}
                    className="inline-flex h-9 items-center bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
                  >
                    Approve
                  </button>
                )}
                {r.status !== "declined" && (
                  <button
                    onClick={() => onUpdate(r.id, "declined")}
                    className="inline-flex h-9 items-center border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-secondary/40"
                  >
                    Decline
                  </button>
                )}
                {r.status !== "new" && r.status !== "archived" && (
                  <button
                    onClick={() => onUpdate(r.id, "new")}
                    className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]"
                  >
                    Reset to new
                  </button>
                )}
                {r.status !== "archived" && (
                  <button
                    onClick={() => onUpdate(r.id, "archived")}
                    className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]"
                  >
                    Archive
                  </button>
                )}
              </div>

            </div>
            <div className="md:col-span-2">
              <HistoryPanel entityType="host_application" entityId={r.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

function ComplianceDocsPanel({ docs }: { docs: ComplianceDoc[] }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  if (!docs || docs.length === 0) {
    return (
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        No compliance documents uploaded.
      </p>
    );
  }
  async function open(doc: ComplianceDoc) {
    setLoadingKey(doc.path);
    try {
      const { url } = await getHostComplianceDocUrl({ data: { path: doc.path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open document");
    } finally {
      setLoadingKey(null);
    }
  }
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Compliance documents
      </p>
      <ul className="mt-2 grid gap-2 md:grid-cols-2">
        {docs.map((doc) => (
          <li key={doc.path} className="flex items-center justify-between gap-3 border border-border px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{doc.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {doc.filename} · {Math.round(doc.size / 1024)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => open(doc)}
              disabled={loadingKey === doc.path}
              className="shrink-0 border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-secondary/40 disabled:opacity-60"
            >
              {loadingKey === doc.path ? "Opening…" : "View"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestsList({
  loading,
  error,
  rows,
}: {
  loading: boolean;
  error: unknown;
  rows: JoinRequestRow[];
}) {
  const qc = useQueryClient();
  const onUpdate = async (
    id: string,
    status: "approved" | "declined" | "waitlisted",
    host_note?: string,
  ) => {
    try {
      await updateJoinRequestStatus({ data: { id, status, host_note } });
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-join-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load."}
      </p>
    );
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No requests yet.</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((r) => {
        const table = TABLES.find((t) => t.id === r.table_id);
        return (
          <li key={r.id} className="grid gap-3 py-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-serif text-lg">
                  {r.guest_name || "Guest"}{" "}
                  <span className="text-muted-foreground">→ {table?.title ?? r.table_id}</span>
                </p>
                <StatusPill status={r.status} />
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
              {r.message && (
                <p className="mt-3 text-sm leading-relaxed">"{r.message}"</p>
              )}
              {r.host_note && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Host note: {r.host_note}
                </p>
              )}
            </div>
            {r.status !== "cancelled" && r.status !== "paid" ? (
              <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                {r.status !== "approved" && (
                  <button
                    onClick={() => onUpdate(r.id, "approved")}
                    className="inline-flex h-9 items-center bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
                  >
                    Approve
                  </button>
                )}
                {r.status !== "declined" && (
                  <button
                    onClick={() => {
                      const note = window.prompt("Optional note to guest:") ?? undefined;
                      onUpdate(r.id, "declined", note);
                    }}
                    className="inline-flex h-9 items-center border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-secondary/40"
                  >
                    Decline
                  </button>
                )}
                {r.status !== "waitlisted" && (
                  <button
                    onClick={() => onUpdate(r.id, "waitlisted")}
                    className="inline-flex h-9 items-center border border-sky-500/50 px-4 text-[11px] uppercase tracking-[0.22em] text-sky-700 hover:bg-sky-500/10"
                  >
                    Waitlist
                  </button>
                )}
              </div>
            ) : null}
            <div className="md:col-span-2">
              <HistoryPanel entityType="join_request" entityId={r.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function HistoryPanel({
  entityType,
  entityId,
}: {
  entityType: "host_application" | "join_request";
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["admin-audit", entityType, entityId],
    queryFn: () => listAuditTrail({ data: { entity_type: entityType, entity_id: entityId } }),
    enabled: open,
  });
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-[6px]"
      >
        {open ? "Hide history" : "View history"}
      </button>
      {open && (
        <div className="mt-3 border border-border bg-secondary/20 p-3">
          {q.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading history…</p>
          ) : q.error ? (
            <p className="text-xs text-destructive">
              {q.error instanceof Error ? q.error.message : "Failed to load history."}
            </p>
          ) : !q.data?.length ? (
            <p className="text-xs text-muted-foreground">No status changes recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {q.data.map((e) => (
                <li key={e.id} className="text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    <span>
                      {e.from_status ? (
                        <>
                          <span className="text-muted-foreground">{e.from_status}</span>
                          <span className="mx-1 text-muted-foreground">→</span>
                        </>
                      ) : null}
                      <span className="font-medium">{e.to_status}</span>
                    </span>
                    <span className="text-muted-foreground">
                      by {e.actor_email ?? e.actor_user_id?.slice(0, 8) ?? "system"}
                    </span>
                  </div>
                  {e.note ? (
                    <p className="mt-1 text-muted-foreground">Note: {e.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function ExportAuditButton() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const [entityType, setEntityType] = useState<"all" | "host_application" | "join_request">(() => {
    try {
      const saved = localStorage.getItem("colorfull-audit-export-filters");
      if (saved) return (JSON.parse(saved).entity_type as "all" | "host_application" | "join_request") ?? "all";
    } catch {}
    return "all";
  });
  const [from, setFrom] = useState(() => {
    try {
      const saved = localStorage.getItem("colorfull-audit-export-filters");
      if (saved) return JSON.parse(saved).from ?? "";
    } catch {}
    return "";
  });
  const [to, setTo] = useState(() => {
    try {
      const saved = localStorage.getItem("colorfull-audit-export-filters");
      if (saved) return JSON.parse(saved).to ?? "";
    } catch {}
    return "";
  });
  const prevFiltersRef = useRef<{ entityType: typeof entityType; from: string; to: string } | null>(null);
  const [undoTimeoutSecs, setUndoTimeoutSecs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("colorfull-audit-export-undo-timeout");
      const n = saved ? parseInt(saved, 10) : NaN;
      if ([3, 5, 10, 30].includes(n)) return n;
    } catch {}
    return 5;
  });
  const [ariaDebounceSecs, setAriaDebounceSecs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("colorfull-aria-debounce-secs");
      const n = saved ? parseInt(saved, 10) : NaN;
      if ([1, 3, 5, 10].includes(n)) return n;
    } catch {}
    return 3;
  });
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null);
  const [ariaCountdown, setAriaCountdown] = useState<number | null>(null);
  const hasMountedUndoRef = useRef(false);
  const lastAriaTickRef = useRef<number | null>(null);
  const [expiredAnnouncement, setExpiredAnnouncement] = useState("");
  const prevPreviewCountdownRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "colorfull-audit-export-filters",
      JSON.stringify({ entity_type: entityType, from, to })
    );
  }, [entityType, from, to]);

  useEffect(() => {
    localStorage.setItem("colorfull-audit-export-undo-timeout", String(undoTimeoutSecs));
  }, [undoTimeoutSecs]);

  useEffect(() => {
    localStorage.setItem("colorfull-aria-debounce-secs", String(ariaDebounceSecs));
  }, [ariaDebounceSecs]);

  useEffect(() => {
    if (!hasMountedUndoRef.current) {
      hasMountedUndoRef.current = true;
      return;
    }
    setPreviewCountdown(undoTimeoutSecs);
    const interval = setInterval(() => {
      setPreviewCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [undoTimeoutSecs]);

  useEffect(() => {
    const result = computeAriaUpdate({
      previewCountdown,
      ariaDebounceSecs,
      lastAnnouncedAt: lastAriaTickRef.current,
      now: Date.now(),
    });
    lastAriaTickRef.current = result.nextLastAnnouncedAt;
    if (previewCountdown === null) {
      setAriaCountdown(null);
    } else if (result.shouldAnnounce) {
      setAriaCountdown(result.nextAriaCountdown);
    }
  }, [previewCountdown, ariaDebounceSecs]);

  useEffect(() => {
    const prev = prevPreviewCountdownRef.current;
    prevPreviewCountdownRef.current = previewCountdown;
    if (prev !== null && previewCountdown === null) {
      setExpiredAnnouncement(EXPIRED_ANNOUNCEMENT);
      // Return focus to the Export trigger when the Undo window expires
      // so keyboard users land back on a known anchor.
      if (open) triggerRef.current?.focus();
      const t = setTimeout(() => setExpiredAnnouncement(""), 2000);
      return () => clearTimeout(t);
    }
  }, [previewCountdown, open]);

  // Return focus to the trigger when the popover closes.
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Close popover on Escape for keyboard accessibility.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Trap focus inside the popover panel so keyboard users can't tab
  // out into the underlying page while the surface is open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<
          HTMLElement
        >(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [open]);


  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await exportAuditHistory({
        data: {
          entity_type: entityType,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        },
      });
      const headers = ["Date", "Type", "Entity ID", "Name", "From Status", "To Status", "Actor", "Note"];
      const csvRows: string[][] = [headers];
      for (const r of rows) {
        csvRows.push([
          new Date(r.created_at).toLocaleString(),
          r.entity_type,
          r.entity_id,
          r.entity_name,
          r.from_status,
          r.to_status,
          r.actor_email,
          r.note,
        ]);
      }
      const suffix = entityType === "all" ? "" : `-${entityType}`;
      downloadCsv(`audit-history${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
      toast.success(`Exported ${rows.length} entries`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const popoverId = useId();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        className="inline-flex h-9 items-center border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-secondary/40"
      >
        Export audit history
      </button>
      {open && (
        <>
          <div data-testid="popover-backdrop" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            id={popoverId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${popoverId}-title`}
            className="absolute right-0 z-50 mt-2 w-80 border border-border bg-background p-4 shadow-lg"
          >
            <h2 id={`${popoverId}-title`} className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Filters</h2>
            <label className="mt-3 block text-xs">
              <span className="text-muted-foreground">Type</span>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as typeof entityType)}
                className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="all">All</option>
                <option value="host_application">Host applications</option>
                <option value="join_request">Join requests</option>
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-xs">
                <span className="text-muted-foreground">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs">
              <span className="text-muted-foreground">Undo toast duration</span>
              <select
                value={undoTimeoutSecs}
                onChange={(e) => setUndoTimeoutSecs(parseInt(e.target.value, 10))}
                className="mt-1 block w-full border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </label>
            {previewCountdown !== null && (
              <div className="mt-2 rounded-sm bg-secondary/50 px-3 py-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-foreground">
                    Undo window
                  </span>
                  <span className="font-serif text-xl leading-none text-foreground">
                    {previewCountdown}
                    <span className="ml-0.5 text-sm">s</span>
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-olive transition-all duration-1000 ease-linear"
                    style={{ width: `${(previewCountdown / undoTimeoutSecs) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  After this expires the reset is permanent.
                </p>
              </div>
            )}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {ariaCountdown !== null ? `${ariaCountdown} seconds to undo` : ""}
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {expiredAnnouncement}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground underline"
                  >
                    Reset
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset saved audit export filters?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your current saved filters are:
                      <br />• Type: {entityType === "all" ? "All" : entityType === "host_application" ? "Host applications" : "Join requests"}
                      <br />• Date range: {from || "—"} to {to || "—"}
                      <br /><br />
                      <strong>Cancel</strong> will close this dialog and keep your saved filters unchanged.
                      <br />
                      <strong>Reset</strong> will clear these saved selections and restore the default filters (All, no date range).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel — keep my filters</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        prevFiltersRef.current = { entityType, from, to };
                        setEntityType("all");
                        setFrom("");
                        setTo("");
                        localStorage.removeItem("colorfull-audit-export-filters");
                        toast("Filters reset", {
                          duration: undoTimeoutSecs * 1000,
                          description:
                            `Your saved audit export filters were cleared. You have ${undoTimeoutSecs} seconds to undo. After that, the toast disappears and the reset is permanent.`,
                          action: {
                            label: "Undo",
                            onClick: () => {
                              const prev = prevFiltersRef.current;
                              if (prev) {
                                setEntityType(prev.entityType);
                                setFrom(prev.from);
                                setTo(prev.to);
                              }
                            },
                          },
                        });
                      }}
                    >
                      Reset — clear and restore defaults
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex h-9 items-center border border-border bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:opacity-90 disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Download CSV"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
