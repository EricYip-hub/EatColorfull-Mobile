import { useId, useRef, useState } from "react";

type Props = {
  title: string;
  text: string;
  agreeLabel: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Require the user to scroll to the bottom before they can check the box. */
  requireScroll?: boolean;
};

/**
 * Fine-print legal disclosure with a required "I agree" checkbox.
 * Used during guest signup and host application to gate submission.
 */
export function AgreementGate({
  title,
  text,
  agreeLabel,
  checked,
  onCheckedChange,
  requireScroll = true,
}: Props) {
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(!requireScroll);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "reached bottom" within a small tolerance.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
      setScrolled(true);
    }
  }

  const canCheck = scrolled;

  return (
    <div className="border border-border bg-secondary/30">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Required disclosure
        </p>
        <p className="mt-1 font-serif text-sm leading-snug">{title}</p>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-56 overflow-y-auto bg-background px-4 py-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line"
      >
        {text}
      </div>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-3 border-t border-border px-4 py-3 text-xs ${
          canCheck ? "" : "opacity-60 cursor-not-allowed"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={!canCheck}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
        />
        <span className="leading-relaxed text-foreground">
          {agreeLabel}
          {!canCheck && (
            <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              · Scroll to the end to enable
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
