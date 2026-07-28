const MESSAGES = [
  "Our first dinner is live · Hosts & guests now welcome",
  "Apply to host a table or request a seat — applications open",
  "Curated tables. Private locations. Limited seats.",
];

export function AnnouncementBar() {
  return (
    <div
      className="w-full border-b border-foreground/10 text-[10.5px] uppercase tracking-[0.28em]"
      style={{ backgroundColor: "var(--ink)", color: "var(--cream)" }}
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-10 overflow-hidden px-6">
        {MESSAGES.map((m, i) => (
          <span
            key={i}
            className={i === 0 ? "" : "hidden md:inline"}
            style={{ opacity: 0.85 }}
          >
            {m}
            {i < MESSAGES.length - 1 && (
              <span className="mx-10 hidden opacity-40 md:inline" aria-hidden>
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
