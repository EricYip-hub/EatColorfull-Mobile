import { Link } from "@tanstack/react-router";
import { useIsEventEnded } from "@/lib/event-status";

type EventCardProps = {
  to: string;
  endsAt: Date | string | number;
  imageSrc: string;
  imageAlt: string;
  dateLabel: string;
  title: string;
  description: string;
  endedDescription?: string;
  ctaLabel: string;
  tone?: "light" | "dark";
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

/**
 * Renders an event card that auto-switches to an "Ended" visual once
 * `endsAt` is in the past. No manual edits required when an event passes.
 */
export function EventCard(props: EventCardProps) {
  const {
    to,
    endsAt,
    imageSrc,
    imageAlt,
    dateLabel,
    title,
    description,
    endedDescription,
    ctaLabel,
    tone = "light",
    onImageError,
  } = props;
  const ended = useIsEventEnded(endsAt);

  if (ended) {
    return (
      <div
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-muted/30"
        aria-label={`${title} — ended`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={imageSrc}
            alt={`Past event: ${imageAlt}`}
            loading="lazy"
            className="h-full w-full object-cover opacity-50 grayscale"
            onError={onImageError}
          />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-foreground px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-background">
            Ended
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {dateLabel}
          </p>
          <h3 className="font-serif text-2xl leading-tight text-foreground/70 line-through decoration-foreground/30">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {endedDescription ?? "This event has ended."}
          </p>
        </div>
      </div>
    );
  }

  const isDark = tone === "dark";
  return (
    <Link
      to={to}
      className={
        isDark
          ? "group flex flex-col overflow-hidden rounded-2xl border border-foreground bg-foreground text-background transition-colors hover:bg-foreground/90"
          : "group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-lg"
      }
    >
      <div className={`aspect-[16/9] overflow-hidden ${isDark ? "bg-foreground/40" : "bg-muted"}`}>
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          onError={onImageError}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p
          className={
            isDark
              ? "text-[10px] uppercase tracking-[0.24em] text-background/70"
              : "text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
          }
        >
          {dateLabel}
        </p>
        <h3
          className={
            isDark
              ? "font-serif text-2xl leading-tight text-background"
              : "font-serif text-2xl leading-tight"
          }
        >
          {title}
        </h3>
        <p
          className={
            isDark
              ? "text-sm leading-relaxed text-background/75"
              : "text-sm leading-relaxed text-muted-foreground"
          }
        >
          {description}
        </p>
        <span
          className={
            isDark
              ? "mt-2 inline-flex h-10 w-fit items-center border border-background/40 px-5 text-[11px] uppercase tracking-[0.22em] text-background transition-colors group-hover:border-background"
              : "mt-2 inline-flex h-10 w-fit items-center bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background"
          }
        >
          {ctaLabel}
        </span>
      </div>
    </Link>
  );
}
