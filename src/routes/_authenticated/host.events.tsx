import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  createChefEvent,
  listMyChefEvents,
  generateEventInvite,
  getEventInviteStats,
} from "@/lib/chef-events.functions";

export const Route = createFileRoute("/_authenticated/host/events")({
  head: () => ({ meta: [{ title: "Host events — Colorfull" }] }),
  component: HostEventsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-2xl p-12">
      Couldn't load events: {error.message}
    </div>
  ),
});

type MenuItem = { name: string; price?: number; description?: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function HostEventsPage() {
  const { isHost, loading } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyChefEvents);
  const createFn = useServerFn(createChefEvent);

  const { data: events = [] } = useQuery({
    queryKey: ["my-chef-events"],
    queryFn: () => listFn(),
    enabled: isHost,
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [chefName, setChefName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([{ name: "", price: undefined }]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (input: any) => createFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-chef-events"] });
      setShowForm(false);
      setTitle("");
      setChefName("");
      setSlug("");
      setSlugDirty(false);
      setDescription("");
      setEventDate("");
      setPickupAddress("");
      setCoverUrl("");
      setMenu([{ name: "", price: undefined }]);
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Failed to create event"),
  });

  if (loading)
    return <p className="px-6 py-20 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!isHost) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="eyebrow">Host access required</p>
        <h1 className="mt-3 font-serif text-4xl">Only hosts can build events.</h1>
        <Link
          to="/host"
          className="mt-8 inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background"
        >
          Apply to host
        </Link>
      </section>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://eatcolorfull.com";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanedMenu = menu
      .map((m) => ({
        name: m.name.trim(),
        price: typeof m.price === "number" && !isNaN(m.price) ? m.price : undefined,
        description: m.description?.trim() || undefined,
      }))
      .filter((m) => m.name.length > 0);
    create.mutate({
      title: title.trim(),
      chefName: chefName.trim() || undefined,
      slug: slug || slugify(title),
      description: description.trim() || undefined,
      eventDate: eventDate || undefined,
      pickupAddress: pickupAddress.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      menu: cleanedMenu,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Host tools</p>
          <h1 className="mt-2 font-serif text-4xl">Your events</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Build a pop-up and get a unique shareable link to send guests.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex h-11 items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
        >
          {showForm ? "Cancel" : "New event"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6 border border-border bg-secondary/30 p-8"
        >
          <Field label="Event title">
            <input
              required
              className="input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugDirty) setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Chef name (optional)">
            <input
              className="input"
              value={chefName}
              onChange={(e) => setChefName(e.target.value)}
            />
          </Field>
          <Field label={`Shareable link → ${origin}/e/${slug || "your-slug"}`}>
            <input
              required
              pattern="[a-z0-9-]+"
              className="input"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setSlugDirty(true);
              }}
            />
          </Field>
          <Field label="Event date & time">
            <input
              type="datetime-local"
              className="input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </Field>
          <Field label="Pickup or venue address">
            <input
              className="input"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </Field>
          <Field label="Cover image URL (optional)">
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </Field>
          <Field label="Description / promo blurb">
            <textarea
              rows={4}
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Menu
            </span>
            <div className="mt-3 space-y-3">
              {menu.map((item, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-[2fr_1fr_3fr_auto]">
                  <input
                    className="input"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => {
                      const next = [...menu];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setMenu(next);
                    }}
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Price"
                    value={item.price ?? ""}
                    onChange={(e) => {
                      const next = [...menu];
                      const v = e.target.value;
                      next[idx] = {
                        ...next[idx],
                        price: v === "" ? undefined : Number(v),
                      };
                      setMenu(next);
                    }}
                  />
                  <input
                    className="input"
                    placeholder="Description (optional)"
                    value={item.description ?? ""}
                    onChange={(e) => {
                      const next = [...menu];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setMenu(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMenu(menu.filter((_, i) => i !== idx))}
                    className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMenu([...menu, { name: "" }])}
                className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                + Add menu item
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex h-12 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create event & get link"}
          </button>

          <style>{`.input { display:block; height:2.75rem; width:100%; border:1px solid var(--color-border); background:var(--color-background); padding:0 .75rem; font-size:.875rem; outline:none; } textarea.input { height:auto; padding:.75rem; line-height:1.5; } .input:focus { border-color: var(--color-foreground); }`}</style>
        </form>
      )}

      <ul className="mt-12 space-y-3">
        {events.length === 0 && !showForm && (
          <li className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No events yet. Click "New event" to build one.
          </li>
        )}
        {events.map((ev: any) => (
          <EventRow key={ev.id} ev={ev} origin={origin} />
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EventRow({ ev, origin }: { ev: any; origin: string }) {
  const url = `${origin}/e/${ev.slug}`;
  const generateFn = useServerFn(generateEventInvite);
  const [tone, setTone] = useState("");
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const gen = useMutation({
    mutationFn: () => generateFn({ data: { eventId: ev.id, tone: tone || undefined } }),
  });

  const dateLabel = ev.event_date
    ? new Date(ev.event_date).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : undefined;

  const sendMut = useMutation({
    mutationFn: async () => {
      const list = Array.from(
        new Set(
          recipients
            .split(/[\s,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
        ),
      );
      if (list.length === 0) throw new Error("Add at least one valid email.");
      if (list.length > 50) throw new Error("Max 50 recipients per send.");
      const results: { email: string; ok: boolean; reason?: string }[] = [];
      for (const email of list) {
        try {
          const r = await sendTransactionalEmail({
            templateName: "chef-event-invite",
            recipientEmail: email,
            idempotencyKey: `chef-event-invite-${ev.id}-${email}`,
            templateData: {
              eventTitle: ev.title,
              chefName: ev.chef_name ?? undefined,
              dateLabel,
              pickupAddress: ev.pickup_address ?? undefined,
              coverUrl: ev.cover_url ?? undefined,
              description: ev.description ?? undefined,
              menu: Array.isArray(ev.menu) ? ev.menu : [],
              url,
              personalNote: personalNote.trim() || undefined,
              hostFirstName: ev.chef_name ? String(ev.chef_name).split(" ")[0] : undefined,
            },
          });
          results.push({ email, ok: !!r?.success, reason: r?.reason });
        } catch (e: any) {
          results.push({ email, ok: false, reason: e?.message ?? "failed" });
        }
        track("invite_email_sent", { slug: ev.slug, eventId: ev.id, email });
      }
      return results;
    },
  });

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
    track("invite_copy", { slug: ev.slug, eventId: ev.id, kind: label });
  }

  const statsFn = useServerFn(getEventInviteStats);
  const stats = useQuery({
    queryKey: ["event-invite-stats", ev.id],
    queryFn: () => statsFn({ data: { eventId: ev.id } }),
    refetchOnWindowFocus: false,
  });

  return (
    <li className="border border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-serif text-xl">{ev.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{url}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {stats.isLoading ? "Loading stats…" : stats.data ? (
              <>
                <span>{stats.data.views} views</span>
                <span className="mx-2">·</span>
                <span>{stats.data.copies} copies</span>
                <span className="mx-2">·</span>
                <span>{stats.data.shares} shares</span>
                <span className="mx-2">·</span>
                <span>{stats.data.rsvpClicks} RSVP clicks</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copy(url, "link")}
            className="h-10 border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            {copied === "link" ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => {
              setOpen((o) => !o);
              if (!gen.data && !gen.isPending) gen.mutate();
            }}
            className="h-10 border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            {open ? "Hide invite" : "Generate invite"}
          </button>
          <button
            onClick={() => setEmailOpen((o) => !o)}
            className="h-10 border border-border px-4 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            {emailOpen ? "Hide email" : "Email invites"}
          </button>
          <a
            href={`/e/${ev.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90"
          >
            View
          </a>
        </div>
      </div>

      {emailOpen && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Send a branded invite from {ev.chef_name ? ev.chef_name : "your kitchen"} via{" "}
            <span className="lowercase tracking-normal">noreply@eatcolorfull.com</span>
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Recipients (comma or newline separated, max 50)
            </span>
            <textarea
              rows={3}
              className="mt-2 w-full border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
              placeholder="friend@example.com, another@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Personal note (optional — appears in italics above the details)
            </span>
            <textarea
              rows={2}
              maxLength={300}
              className="mt-2 w-full border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
              placeholder="Saved you a seat — would love to have you there."
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending}
              className="h-10 bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background disabled:opacity-50"
            >
              {sendMut.isPending ? "Sending…" : "Send branded email"}
            </button>
            {sendMut.error && (
              <span className="text-sm text-destructive">
                {(sendMut.error as Error).message}
              </span>
            )}
          </div>
          {sendMut.data && (
            <div className="border border-border bg-secondary/30 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Send results
              </p>
              <ul className="mt-2 space-y-1">
                {sendMut.data.map((r) => (
                  <li key={r.email} className="flex items-center justify-between gap-3">
                    <span className="truncate">{r.email}</span>
                    <span
                      className={
                        r.ok
                          ? "text-[11px] uppercase tracking-[0.18em] text-emerald-700"
                          : "text-[11px] uppercase tracking-[0.18em] text-destructive"
                      }
                    >
                      {r.ok ? "Queued" : r.reason ?? "Failed"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px]">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Tone hint (optional)
              </span>
              <input
                className="mt-2 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
                placeholder="e.g. last pop-up sold out, urgent"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </label>
            <button
              onClick={() => gen.mutate()}
              disabled={gen.isPending}
              className="h-10 bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background disabled:opacity-50"
            >
              {gen.isPending ? "Writing…" : gen.data ? "Regenerate" : "Generate"}
            </button>
          </div>

          {gen.error && (
            <p className="text-sm text-destructive" role="alert">
              {(gen.error as Error).message}
            </p>
          )}

          {gen.data && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Invite (IG / email)
                  </span>
                  <button
                    onClick={() => copy(gen.data!.invite, "invite")}
                    className="text-[11px] uppercase tracking-[0.18em] hover:text-foreground"
                  >
                    {copied === "invite" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  className="mt-2 w-full resize-y border-0 bg-transparent text-sm leading-relaxed outline-none"
                  rows={6}
                  value={gen.data.invite}
                />
              </div>
              <div className="border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    SMS (under 300 chars)
                  </span>
                  <button
                    onClick={() => copy(gen.data!.sms, "sms")}
                    className="text-[11px] uppercase tracking-[0.18em] hover:text-foreground"
                  >
                    {copied === "sms" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  className="mt-2 w-full resize-y border-0 bg-transparent text-sm leading-relaxed outline-none"
                  rows={4}
                  value={gen.data.sms}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
