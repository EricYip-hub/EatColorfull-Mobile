import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAllContacts, type ContactRow } from "@/lib/admin-contacts.functions";

export const Route = createFileRoute("/admin/contacts")({
  head: () => ({
    meta: [
      { title: "Admin Contacts — Colorfull" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminContactsPage,
});

const SOURCES = [
  "all",
  "event_booking",
  "host_application",
  "join_request",
  "meal_prep_request",
  "meal_plan_request",
  "profile",
  "form_submission",
] as const;
type SourceFilter = (typeof SOURCES)[number];

const SOURCE_LABEL: Record<ContactRow["source"], string> = {
  event_booking: "Event RSVP",
  host_application: "Host application",
  join_request: "Table request",
  meal_prep_request: "Meal prep request",
  meal_plan_request: "Meal plan request",
  profile: "Account profile",
  form_submission: "Form submission",
};

function escapeCsv(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: ContactRow[]) {
  const header = ["source", "name", "email", "phone", "location", "notes", "created_at", "extra"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.source,
        r.name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.location ?? "",
        r.notes ?? "",
        r.created_at,
        JSON.stringify(r.extra),
      ]
        .map((v) => escapeCsv(String(v)))
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `colorfull-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AdminContactsPage() {
  const fetchContacts = useServerFn(listAllContacts);
  const { data, isLoading, error } = useQuery<ContactRow[]>({
    queryKey: ["admin", "contacts"],
    queryFn: () => fetchContacts() as Promise<ContactRow[]>,
  });

  const [source, setSource] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== "all" && r.source !== source) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.location, r.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [data, source, query]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const emails = new Set(rows.map((r) => r.email).filter(Boolean) as string[]);
    return {
      total: rows.length,
      uniqueEmails: emails.size,
      bookings: rows.filter((r) => r.source === "event_booking").length,
      hostApps: rows.filter((r) => r.source === "host_application").length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <p className="eyebrow">Admin · Internal</p>
      <h1 className="mt-3 font-serif text-4xl">Contacts & submissions</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every email and submission collected across event RSVPs, host applications, table
        requests, meal prep, meal plans, and account profiles. Exports include all visible rows.
      </p>

      {error && (
        <p className="mt-6 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total entries" value={stats.total} />
        <Stat label="Unique emails" value={stats.uniqueEmails} />
        <Stat label="Event RSVPs" value={stats.bookings} />
        <Stat label="Host applications" value={stats.hostApps} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
          className="h-10 border border-border bg-background px-3 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All sources" : SOURCE_LABEL[s as ContactRow["source"]]}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, notes…"
          className="h-10 min-w-[260px] flex-1 border border-border bg-background px-3 text-sm"
        />
        <button
          onClick={() => downloadCsv(filtered)}
          disabled={!filtered.length}
          className="inline-flex h-10 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background disabled:opacity-50"
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      <div className="mt-8 overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Location / ref</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !filtered.length && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  No entries match these filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const unsub = (r.extra as { unsubscribed?: boolean }).unsubscribed;
              return (
                <tr key={`${r.source}-${r.id}`} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {SOURCE_LABEL[r.source]}
                  </td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.email ? (
                      <a className="underline" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                    ) : (
                      "—"
                    )}
                    {unsub && (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-destructive">
                        unsubscribed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.location ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <div className="max-w-md whitespace-pre-line">{r.notes ?? "—"}</div>
                    {Object.keys(r.extra).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em]">
                          more
                        </summary>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px]">
                          {JSON.stringify(r.extra, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
