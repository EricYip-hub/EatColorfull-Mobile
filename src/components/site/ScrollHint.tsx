import { ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Subtle scroll-affordance chevrons for horizontally scrollable lists.
 * Renders a small "swipe →" or "← swipe" control and scrolls the nearest
 * horizontally-scrollable sibling/ancestor in the chosen direction.
 */
export function ScrollHint({
  className = "",
  direction = "right",
}: {
  className?: string;
  direction?: "left" | "right";
}) {
  function scroll(button: HTMLButtonElement) {
    let target = button.previousElementSibling as HTMLElement | null;

    while (target && target.scrollWidth <= target.clientWidth) {
      target = target.previousElementSibling as HTMLElement | null;
    }

    let parent = button.parentElement;
    while (!target && parent) {
      target = Array.from(
        parent.querySelectorAll<HTMLElement>("[data-scroll-container], .overflow-x-auto"),
      ).find((el) => el.scrollWidth > el.clientWidth) ?? null;
      parent = parent.parentElement;
    }

    const delta = Math.max((target?.clientWidth ?? 260) * 0.8, 260);
    target?.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  }

  const isLeft = direction === "left";

  return (
    <button
      type="button"
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      onClick={(event) => scroll(event.currentTarget)}
      className={`mt-2 flex items-center gap-1 pr-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80 transition-colors hover:text-foreground ${
        isLeft ? "mr-auto pl-2 pr-0" : "ml-auto"
      } ${className}`}
    >
      {isLeft && <ChevronsLeft className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.25} />}
      <span>Swipe</span>
      {!isLeft && <ChevronsRight className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.25} />}
    </button>
  );
}
