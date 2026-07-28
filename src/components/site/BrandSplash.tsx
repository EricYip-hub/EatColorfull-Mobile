import { useEffect, useState } from "react";
import { ColorfullLockup } from "@/components/brand/ColorfullMark";

/**
 * Brand splash — quick branded curtain on first paint that fades out.
 * Reinforces logo presence at app entry without blocking interaction for long.
 */
export function BrandSplash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 650);
    const t2 = setTimeout(() => setPhase("gone"), 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="anim-fade-up flex flex-col items-center">
        <ColorfullLockup size="xl" wordmark={false} />
        <span
          className="mt-8 text-2xl font-bold uppercase leading-none tracking-[0.12em] text-foreground"
          style={{ fontFamily: '"Archivo", "Inter", system-ui, sans-serif', fontWeight: 700 }}
        >
          Colorfull
        </span>
        <span className="mt-5 text-[11px] uppercase tracking-[0.42em] text-muted-foreground">
          Curated communal dining
        </span>
      </div>
    </div>
  );
}
