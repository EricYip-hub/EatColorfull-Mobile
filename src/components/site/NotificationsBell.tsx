import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  deliveryStatus,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsDeliveredWithRetry,
  type Notification,
} from "@/lib/notifications";

// Cross-tab leader election: only one open tab acks delivery for a given id.
const ACK_CHANNEL = "colorfull:notifications:ack";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingAcks = useRef<Set<string>>(new Set());
  // Ids already shown as a toast this session (avoid duplicates across refetches).
  const toastedIds = useRef<Set<string>>(new Set());
  // Tracks which notifications we've seen before so we only toast genuinely new ones.
  const knownIds = useRef<Set<string>>(new Set());
  const bcRef = useRef<BroadcastChannel | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: fetchMyNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // BroadcastChannel for cross-tab ack dedupe.
  useEffect(() => {
    if (!user || typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(ACK_CHANNEL);
    bcRef.current = bc;
    bc.onmessage = (e) => {
      const { type, ids } = (e.data ?? {}) as { type?: string; ids?: string[] };
      if (type === "claimed" && Array.isArray(ids)) {
        ids.forEach((id) => pendingAcks.current.delete(id));
      }
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [user]);

  // Flush buffered delivery acks. Announces claimed ids to peer tabs first to
  // dedupe writes; the SQL guard (`delivered_at IS NULL`) is the backstop.
  const flushPendingAcks = useRef(async () => {});
  flushPendingAcks.current = async () => {
    const ids = Array.from(pendingAcks.current);
    if (ids.length === 0) return;
    bcRef.current?.postMessage({ type: "claimed", ids });
    try {
      await markNotificationsDeliveredWithRetry(ids);
      ids.forEach((id) => pendingAcks.current.delete(id));
      if (user) qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    } catch {
      /* keep ids buffered for next trigger */
    }
  };

  // Realtime updates — auto-resubscribe on CLOSED/CHANNEL_ERROR.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const subscribe = () => {
      if (cancelled) return;
      channel = supabase
        .channel("notifications-" + user.id)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Notification | null;
            if (row?.id) {
              pendingAcks.current.add(row.id);
              void flushPendingAcks.current();
              // Toast only if the tab is not already showing this in the open list.
              if (!toastedIds.current.has(row.id)) {
                toastedIds.current.add(row.id);
                toast(row.title, {
                  description: row.body ?? undefined,
                  action: row.link
                    ? {
                        label: "View",
                        onClick: () => navigate({ to: row.link! }),
                      }
                    : undefined,
                });
              }
            }
            qc.invalidateQueries({ queryKey: ["notifications", user.id] });
            qc.invalidateQueries({ queryKey: ["my-requests"] });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            attempt = 0;
            void flushPendingAcks.current();
          } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
            if (cancelled) return;
            attempt++;
            const delay = Math.min(30_000, 1000 * 2 ** (attempt - 1)) + Math.random() * 250;
            if (channel) void supabase.removeChannel(channel);
            channel = null;
            reconnectTimer = setTimeout(subscribe, delay);
          }
        });
    };
    subscribe();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user, qc, navigate]);

  // Backfill delivery acks + seed known-ids cache (so refetches don't re-toast).
  useEffect(() => {
    if (!user || !items) return;
    // Seed knownIds on first run without toasting existing entries.
    const firstRun = knownIds.current.size === 0;
    for (const n of items) {
      if (firstRun) {
        knownIds.current.add(n.id);
        toastedIds.current.add(n.id);
      } else if (!knownIds.current.has(n.id)) {
        knownIds.current.add(n.id);
        // Toast notifications discovered by polling (e.g. realtime was down).
        if (!toastedIds.current.has(n.id) && !n.read_at) {
          toastedIds.current.add(n.id);
          toast(n.title, {
            description: n.body ?? undefined,
            action: n.link ? { label: "View", onClick: () => navigate({ to: n.link! }) } : undefined,
          });
        }
      }
    }
    const undelivered = items.filter((n) => !n.delivered_at).map((n) => n.id);
    if (undelivered.length === 0) return;
    undelivered.forEach((id) => pendingAcks.current.add(id));
    void flushPendingAcks.current();
  }, [user, items, navigate]);

  // Flush when tab regains focus or network reconnects.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void flushPendingAcks.current();
    };
    const onOnline = () => void flushPendingAcks.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [user]);

  // Click-outside + Escape to close.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset focus when dropdown closes.
  useEffect(() => {
    if (!open) setFocusIdx(-1);
  }, [open]);

  if (!user) return null;
  const list = items ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  // Arrow-key navigation within the open dropdown.
  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusIdx(list.length - 1);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center text-foreground/80 hover:text-foreground"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[340px] border border-border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Notifications</p>
            {unread > 0 && (
              <button
                onClick={async () => {
                  await markAllNotificationsRead();
                  qc.invalidateQueries({ queryKey: ["notifications", user.id] });
                }}
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul
            ref={listRef}
            onKeyDown={onListKeyDown}
            tabIndex={list.length > 0 ? 0 : -1}
            className="max-h-[420px] divide-y divide-border overflow-y-auto outline-none"
          >
            {isLoading && list.length === 0 ? (
              <>
                {[0, 1, 2].map((i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="h-3 w-1/2 animate-pulse bg-muted" />
                    <div className="mt-2 h-2.5 w-3/4 animate-pulse bg-muted/70" />
                  </li>
                ))}
              </>
            ) : list.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-muted-foreground">You're all caught up.</li>
            ) : (
              list.map((n, idx) => (
                <li key={n.id} className={n.read_at ? "opacity-60" : ""}>
                  <Link
                    to={n.link || "/dashboard"}
                    role="menuitem"
                    tabIndex={focusIdx === idx ? 0 : -1}
                    ref={(el) => {
                      if (focusIdx === idx && el) el.focus();
                    }}
                    onClick={async () => {
                      setOpen(false);
                      if (!n.read_at) {
                        await markNotificationRead(n.id);
                        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
                      }
                    }}
                    className="block px-4 py-3 hover:bg-secondary/60 focus:bg-secondary/60 focus:outline-none"
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden />}
                      <div className="flex-1">
                        <p className="font-serif text-sm leading-snug">{n.title}</p>
                        {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                          <span>
                            {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span aria-hidden>·</span>
                          <span
                            className={
                              deliveryStatus(n) === "seen"
                                ? "text-muted-foreground/70"
                                : deliveryStatus(n) === "delivered"
                                  ? "text-foreground/80"
                                  : "text-primary"
                            }
                          >
                            {deliveryStatus(n) === "seen" ? "Seen" : deliveryStatus(n) === "delivered" ? "Delivered" : "Sent"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
