import { useState } from "react";

type Step = {
  id: string;
  label: string;
  href?: (url: string) => string;
  hrefLabel?: string;
  detail: string;
};

const STEPS: Step[] = [
  {
    id: "drift-check",
    label: "Run the pre-publish drift check",
    detail:
      "Run `bun check:og` locally (or wait for the \"OG drift check\" GitHub Action on main to pass). If it exits with drift, do NOT publish yet — the live site hasn't been updated to match your local og-image.jpg or meta tags.",
  },
  {
    id: "publish",
    label: "Publish the site in Lovable",
    detail:
      "Open the Publish dialog and ship the latest build so eatcolorfull.com serves the new meta tags and og-image.jpg.",
  },
  {
    id: "verify",
    label: "Verify the live URL returns the new tags",
    href: (u) => u,
    hrefLabel: "Open URL",
    detail:
      "Hard-refresh the page and re-run the Share Preview Tester above against the live URL to confirm og:image, og:title, and twitter:image reflect the new values.",
  },
  {
    id: "facebook",
    label: "Facebook / iMessage / WhatsApp — Sharing Debugger",
    href: (u) =>
      `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(u)}`,
    hrefLabel: "Open Sharing Debugger",
    detail:
      "Paste the URL, click \"Debug\", then click \"Scrape Again\" to flush Facebook's cache. iMessage and WhatsApp also read OG tags — both will pick up the refresh.",
  },
  {
    id: "x",
    label: "X (Twitter) — Card cache",
    href: () => "https://cards-dev.twitter.com/validator",
    hrefLabel: "Card validator (legacy)",
    detail:
      "X retired the public Card Validator; the card cache refreshes automatically within ~7 days, or immediately when the URL is shared from a new tweet. Post a test tweet from a staging account to force a refresh.",
  },
  {
    id: "linkedin",
    label: "LinkedIn — Post Inspector",
    href: (u) =>
      `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(u)}`,
    hrefLabel: "Open Post Inspector",
    detail:
      "LinkedIn caches previews for ~7 days. Run the Post Inspector against the URL to force a re-scrape immediately.",
  },
  {
    id: "slack",
    label: "Slack — unfurl cache",
    detail:
      "Slack caches unfurls for ~24 hours per workspace. To force a refresh, post the URL with a cache-busting query string (e.g. ?v=2) in a test channel.",
  },
];

export function PublishChecklist({ url }: { url: string }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const completed = STEPS.filter((s) => done[s.id]).length;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">After OG / meta edits</p>
          <h2 className="mt-2 font-serif text-2xl">Publish checklist</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run these steps every time you change <code>og-image.jpg</code> or
            any OG / Twitter meta tag so cached previews update everywhere.
          </p>
        </div>
        <div className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {completed}/{STEPS.length}
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {STEPS.map((step, i) => {
          const isDone = !!done[step.id];
          const href = step.href?.(url);
          return (
            <li
              key={step.id}
              className="flex gap-4 rounded-md border border-border/60 bg-background p-4"
            >
              <label className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) =>
                    setDone((d) => ({ ...d, [step.id]: e.target.checked }))
                  }
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </label>
              <div className="min-w-0 flex-1">
                <div
                  className={
                    isDone
                      ? "font-medium text-muted-foreground line-through"
                      : "font-medium"
                  }
                >
                  {step.label}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.detail}
                </p>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-xs font-medium uppercase tracking-[0.18em] underline underline-offset-4 hover:opacity-80"
                  >
                    {step.hrefLabel ?? "Open"} →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
