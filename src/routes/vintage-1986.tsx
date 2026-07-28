import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { submitVintageRsvp } from "@/lib/vintage-rsvp.functions";
import { Copy, Check } from "lucide-react";
import inviteImage from "@/assets/vintage-1986-invite.png.asset.json";
import { INVITE_TEXT, VINTAGE_1986_ADDRESS } from "@/lib/vintage-1986-invite";

export const Route = createFileRoute("/vintage-1986")({
  head: () => {
    const title = "Vintage 1986 — curated dinner by Molino · Mon, June 8";
    const desc =
      "Invite only. Celebrating 40 with a curated Italian dinner by Molino. Monday, June 8, 2026 — 8:00 PM. RSVP with your invite code.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: "https://www.eatcolorfull.com/vintage-1986" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: Vintage1986Page,
});

const rsvpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(7, "Please enter a phone number").max(30),
  guestCount: z.number().int().min(1).max(8),
  code: z.string().trim().min(1, "Invite code required").max(50),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const CREAM = "#f4ecd8";
const RED = "#a72525";
const INK = "#1a1a1a";
const OLIVE = "#5a6a3a";

function Vintage1986Page() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = useServerFn(submitVintageRsvp);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = rsvpSchema.safeParse({
      fullName, email, phone, guestCount, code, notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: parsed.data });
      setSubmitted(true);
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      setError(
        msg.includes("Invalid invite code")
          ? "That invite code isn't right. Double-check with your host."
          : "Something went wrong submitting your RSVP. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ backgroundColor: CREAM, color: INK }} className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-12 md:py-20">
        <div className="relative">
          <img
            src={inviteImage.url}
            alt="Vintage 1986 — curated menu by molino. Monday 06.08.26, starts at 8 pm. Address provided after confirmation."
            className="w-full h-auto block"
            style={{ borderRadius: 2 }}
          />
        </div>

        {/* Share invite text */}
        <ShareInviteBox />

        {/* RSVP */}
        <section id="rsvp" className="mt-12">
          {submitted ? (
            <div
              className="border-2 px-6 py-10 text-center"
              style={{ borderColor: OLIVE, backgroundColor: "rgba(90,106,58,0.08)" }}
            >
              <h2 className="font-serif text-3xl" style={{ color: RED }}>You're on the list.</h2>
              <p className="mt-3 text-sm">
                A confirmation with the address ({VINTAGE_1986_ADDRESS})
                is on its way to <strong>{email}</strong>.
              </p>
              <p className="mt-2 text-xs opacity-70">
                See you Monday at 8 pm.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <h2 className="font-serif italic text-3xl text-center" style={{ color: RED }}>
                RSVP
              </h2>
              <p className="text-center text-sm opacity-75">
                Enter the invite code you received to confirm your seat.
              </p>

              <Field label="Full name">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="vintage-input"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="vintage-input"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="vintage-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Party size">
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                    className="vintage-input"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Invite code">
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="shai____"
                    className="vintage-input"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </Field>
              </div>
              <Field label="Dietary notes (optional)">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="vintage-input"
                />
              </Field>

              {error && (
                <p className="text-sm" style={{ color: RED }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-[11px] uppercase tracking-[0.32em] transition-opacity disabled:opacity-60"
                style={{ backgroundColor: RED, color: CREAM }}
              >
                {submitting ? "Confirming…" : "Confirm RSVP"}
              </button>
              <p className="text-center text-[11px] tracking-widest opacity-60">
                address provided after confirmation
              </p>
            </form>
          )}
        </section>
      </div>

      <style>{`
        .vintage-input {
          width: 100%;
          background: transparent;
          border: 1px solid ${RED}40;
          padding: 12px 14px;
          font-family: Georgia, serif;
          color: ${INK};
          outline: none;
        }
        .vintage-input:focus {
          border-color: ${RED};
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.28em]" style={{ color: RED }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ShareInviteBox() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(INVITE_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const lines = INVITE_TEXT.split("\n");
  const urlLine = lines.findIndex((l) => l.startsWith("https://"));
  const codeLine = lines.findIndex((l) => l.startsWith("Invite code:"));

  return (
    <div className="mt-8 border-2 px-5 py-6 md:px-8 md:py-8" style={{ borderColor: RED }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif italic text-xl" style={{ color: RED }}>
          Share this invite
        </h3>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
          style={{ backgroundColor: RED, color: CREAM }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>

      <div className="mt-5 space-y-1 font-serif text-sm leading-relaxed" style={{ color: INK }}>
        {lines.map((line, i) => {
          if (line.startsWith("https://")) {
            return (
              <a
                key={i}
                href={line}
                className="block break-all font-sans text-[13px] tracking-wide underline underline-offset-4"
                style={{ color: RED }}
              >
                {line}
              </a>
            );
          }
          if (line.startsWith("Invite code:")) {
            return (
              <div key={i} className="pt-2">
                <span className="inline-block border px-3 py-1 text-xs tracking-[0.2em] uppercase" style={{ borderColor: RED, color: RED }}>
                  {line.replace("Invite code: ", "")}
                </span>
              </div>
            );
          }
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          return (
            <p key={i} className={i === 0 ? "text-base" : ""}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
