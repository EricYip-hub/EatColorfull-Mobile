import { BADGES, type BadgeKey } from "@/lib/reviews-data";

type Props = {
  badges: BadgeKey[];
  size?: "sm" | "md";
  className?: string;
};

export function HostBadges({ badges, size = "md", className }: Props) {
  if (!badges.length) return null;
  const text = size === "sm" ? "text-[10px] tracking-[0.18em]" : "text-[11px] tracking-[0.2em]";
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {badges.map((b) => (
        <li
          key={b}
          title={BADGES[b].description}
          className={`inline-flex items-center gap-1.5 border border-foreground/25 bg-background/60 px-2.5 py-1 uppercase ${text}`}
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70" />
          {BADGES[b].label}
        </li>
      ))}
    </ul>
  );
}
