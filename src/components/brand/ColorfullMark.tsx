import { type SVGProps } from "react";

/**
 * Colorfull mark — silhouette of a figure tasting / savoring food.
 * Single path, uses currentColor so it inherits text color anywhere.
 */
export function ColorfullMark({
  className,
  title = "Colorfull",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="31 31 220 220"
      role="img"
      aria-label={title}
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <title>{title}</title>
      <g transform="translate(0,280) scale(0.1,-0.1)">
        <path d="M1030 2379 c-89 -24 -165 -67 -229 -129 -150 -146 -173 -443 -61 -764 63 -180 69 -231 79 -653 9 -385 10 -391 69 -415 18 -7 190 -12 502 -15 417 -4 479 -3 510 11 88 39 110 83 149 296 17 91 34 179 37 195 63 338 60 369 -36 459 -68 64 -124 88 -197 84 -109 -6 -97 -54 38 -149 89 -62 105 -82 93 -113 -12 -31 -47 -13 -85 43 -43 64 -61 76 -90 60 -19 -10 -21 -17 -16 -68 2 -31 17 -90 32 -131 54 -151 54 -204 -2 -271 -37 -43 -80 -59 -161 -59 -135 0 -189 54 -199 198 -5 72 -4 78 20 100 21 20 36 23 120 25 128 3 131 5 135 141 4 97 2 105 -18 119 l-22 15 21 7 c18 5 21 14 21 63 0 67 17 98 60 107 30 7 66 46 57 62 -3 5 -10 44 -16 88 -16 116 -59 288 -91 366 -71 172 -200 296 -346 334 -86 22 -279 19 -374 -6z" />
      </g>
    </svg>
  );
}

/**
 * Header / footer lockup: mark + serif wordmark "Colorfull".
 * `size`: 'sm' for compact header, 'md' for default, 'lg' for splash / hero.
 */
export function ColorfullLockup({
  size = "md",
  className = "",
  wordmark = true,
  tone = "ink",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  wordmark?: boolean;
  /** ink = dark on cream; cream = light on dark; olive = brand */
  tone?: "ink" | "cream" | "olive";
}) {
  const dims = {
    sm: { mark: "h-7 w-7", text: "text-[15px]", gap: "gap-2" },
    md: { mark: "h-9 w-9", text: "text-[19px]", gap: "gap-2.5" },
    lg: { mark: "h-14 w-14", text: "text-3xl", gap: "gap-3" },
    xl: { mark: "h-24 w-24", text: "text-5xl", gap: "gap-4" },
  }[size];
  const toneClass =
    tone === "cream"
      ? "text-background"
      : tone === "olive"
        ? "text-primary"
        : "text-foreground";
  return (
    <span
      className={`inline-flex items-center ${dims.gap} ${toneClass} ${className}`}
    >
      <ColorfullMark className={dims.mark} />
      {wordmark && (
        <span className={`brand-wordmark ${dims.text} leading-none`}>
          Colorfull
        </span>
      )}
    </span>
  );
}
