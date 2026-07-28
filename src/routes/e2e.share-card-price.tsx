import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  renderHostedTable,
  renderPrivateDining,
  PALETTES,
  type DrawArgs,
} from "@/components/chef/ShareDialog";
import { resolveShareCta } from "@/lib/listing-cta";

/**
 * Dev-only harness for end-to-end verification that the branded share-card
 * renderers emit the EXACT price wording used on the listing flow
 * (plain "$N", no "/ SEAT" or "FROM " prefix), and that price-absent
 * fallbacks render the expected copy.
 *
 * Also exposes a "salon" hosted-table render so we can verify the
 * Apply to Attend / Request a Seat / Apply to Host CTA wording matches
 * the listing CTA across price scenarios.
 *
 * Seats can be overridden to test SOLD OUT (seats=0) behavior.
 *
 * Visit: /e2e/share-card-price?priceCents=8500
 *        /e2e/share-card-price?priceCents=undefined
 *        /e2e/share-card-price?priceCents=0
 *        /e2e/share-card-price?priceCents=-500
 *        /e2e/share-card-price?seats=0
 */
export const Route = createFileRoute("/e2e/share-card-price")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    priceCents: number | null | undefined;
    seats: number | null | undefined;
    minGuests: number | null | undefined;
    maxGuests: number | null | undefined;
    hood: string | null;
    addr: string | null;
    archetype: string | null;
    archetypeField: "archetype" | "table_archetype" | "tableArchetype";
  } => {
    const numOrNullish = (
      v: unknown,
      fallback: number | null | undefined,
    ): number | null | undefined => {
      if (typeof v === "string") {
        if (v === "undefined") return undefined;
        if (v === "" || v === "null") return null;
        const n = Number(v);
        if (Number.isFinite(n)) return n;
        return fallback;
      }
      if (v === null) return null;
      if (v === undefined) return fallback;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      return fallback;
    };

    const strOrNull = (v: unknown, fallback: string | null): string | null => {
      if (v === null) return null;
      if (typeof v === "string") {
        if (v === "" || v === "null") return null;
        return v;
      }
      return fallback;
    };

    const archetypeField = ((): "archetype" | "table_archetype" | "tableArchetype" => {
      const v = s.archetypeField;
      if (v === "table_archetype" || v === "tableArchetype") return v;
      return "archetype";
    })();

    return {
      priceCents: numOrNullish(s.priceCents, null),
      seats: numOrNullish(s.seats, 4),
      minGuests: numOrNullish(s.minGuests, 6),
      maxGuests: numOrNullish(s.maxGuests, 12),
      hood: strOrNull(s.hood, "Mission"),
      addr: strOrNull(s.addr, null),
      archetype: strOrNull(s.archetype, null),
      archetypeField,
    };
  },
  component: ShareCardPriceHarness,
});

type Captured = { text: string; x: number; y: number; color: string };

function captureRender(
  fn: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    args: DrawArgs,
    palette: (typeof PALETTES)[keyof typeof PALETTES],
  ) => void,
  args: DrawArgs,
  palette: (typeof PALETTES)[keyof typeof PALETTES],
): Captured[] {
  const drawn: Captured[] = [];
  const ctx: any = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textBaseline: "",
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {},
    fill() {},
    stroke() {},
    drawImage() {},
    save() {},
    restore() {},
    clip() {},
    translate() {},
    rotate() {},
    scale() {},
    measureText(s: string) {
      return { width: s.length * 12 };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    fillText(text: string, x: number, y: number) {
      drawn.push({ text, x, y, color: String(ctx.fillStyle ?? "") });
    },
  };
  const canvas = { width: 1080, height: 1350 } as HTMLCanvasElement;
  fn(ctx as CanvasRenderingContext2D, canvas, { ...args, canvas }, palette);
  return drawn;
}

type StyledText = { text: string; color: string };

function ShareCardPriceHarness() {
  const {
    priceCents,
    seats,
    minGuests,
    maxGuests,
    hood,
    addr,
    archetype,
    archetypeField,
  } = Route.useSearch();
  const [hostedTexts, setHostedTexts] = useState<string[]>([]);
  const [hostedSalonTexts, setHostedSalonTexts] = useState<string[]>([]);
  const [privateTexts, setPrivateTexts] = useState<string[]>([]);
  const [archetypeTexts, setArchetypeTexts] = useState<string[]>([]);
  const [hostedStyled, setHostedStyled] = useState<StyledText[]>([]);
  const [hostedSalonStyled, setHostedSalonStyled] = useState<StyledText[]>([]);
  const [privateStyled, setPrivateStyled] = useState<StyledText[]>([]);
  const [resolvedCta, setResolvedCta] = useState<string>("");
  const [pngs, setPngs] = useState<{ hosted: string; salon: string; private: string }>({
    hosted: "",
    salon: "",
    private: "",
  });
  const hostedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const salonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const privateCanvasRef = useRef<HTMLCanvasElement | null>(null);


  useEffect(() => {
    const hostedCta = resolveShareCta("hosted_table", { archetype: "supper-club" });
    const salonCta = resolveShareCta("hosted_table", { archetype: "founding-salon" });
    const privateCta = resolveShareCta("private_dining");

    const locationFields = addr
      ? { city: addr, location: addr, service_area: addr }
      : {};

    const baseHosted = {
      canvas: null,
      kind: "hosted_table" as const,
      title: "Sunday Supper",
      chefName: "Chef Test",
      imageUrl: null,
      priceCents: priceCents as number | null | undefined,
    };

    const hostedDrawn = captureRender(
      renderHostedTable,
      {
        ...baseHosted,
        cta: hostedCta,
        details: { seats, neighborhood: hood, ...locationFields, archetype: "supper-club" },
      },
      PALETTES.hosted_table,
    );
    const hostedSalonDrawn = captureRender(
      renderHostedTable,
      {
        ...baseHosted,
        cta: salonCta,
        details: { seats, neighborhood: hood, ...locationFields, archetype: "founding-salon" },
      },
      PALETTES.hosted_table,
    );
    const privateDrawn = captureRender(
      renderPrivateDining,
      {
        canvas: null,
        kind: "private_dining",
        title: "Tasting Menu",
        chefName: "Chef Test",
        cta: privateCta,
        priceCents: priceCents as number | null | undefined,
        imageUrl: null,
        details: {
          min_guests: minGuests,
          max_guests: maxGuests,
          neighborhood: hood,
          ...locationFields,
        },
      },
      PALETTES.private_dining,
    );

    // Dynamic archetype slot: resolves the CTA via the real resolver against
    // the configured details field, then renders the hosted card with it.
    // Drives the per-archetype Apply-to-Attend vs Request-a-Seat tests.
    const dynamicDetails: Record<string, unknown> = {
      seats,
      neighborhood: hood,
      ...locationFields,
    };
    if (archetype != null) dynamicDetails[archetypeField] = archetype;
    const dynamicCta = resolveShareCta("hosted_table", dynamicDetails as {
      archetype?: string | null;
      table_archetype?: string | null;
    });
    const archetypeDrawn = captureRender(
      renderHostedTable,
      { ...baseHosted, cta: dynamicCta, details: dynamicDetails },
      PALETTES.hosted_table,
    );

    setHostedTexts(hostedDrawn.map((d) => d.text));
    setHostedSalonTexts(hostedSalonDrawn.map((d) => d.text));
    setPrivateTexts(privateDrawn.map((d) => d.text));
    setArchetypeTexts(archetypeDrawn.map((d) => d.text));
    setHostedStyled(hostedDrawn.map((d) => ({ text: d.text, color: d.color })));
    setHostedSalonStyled(hostedSalonDrawn.map((d) => ({ text: d.text, color: d.color })));
    setPrivateStyled(privateDrawn.map((d) => ({ text: d.text, color: d.color })));
    setResolvedCta(dynamicCta);

    // Real-canvas render — produces actual PNG output that the pixel-diff
    // tests compare across OS color schemes. Renderers are synchronous when
    // imageUrl is null, so the toDataURL() call below captures the final
    // pixels deterministically.
    const renderTo = (
      canvas: HTMLCanvasElement | null,
      fn: typeof renderHostedTable,
      args: DrawArgs,
      palette: (typeof PALETTES)[keyof typeof PALETTES],
    ): string => {
      if (!canvas) return "";
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      fn(ctx, canvas, { ...args, canvas }, palette);
      return canvas.toDataURL("image/png");
    };

    const hostedPng = renderTo(
      hostedCanvasRef.current,
      renderHostedTable,
      {
        ...baseHosted,
        cta: hostedCta,
        details: { seats, neighborhood: hood, ...locationFields, archetype: "supper-club" },
      },
      PALETTES.hosted_table,
    );
    const salonPng = renderTo(
      salonCanvasRef.current,
      renderHostedTable,
      {
        ...baseHosted,
        cta: salonCta,
        details: { seats, neighborhood: hood, ...locationFields, archetype: "founding-salon" },
      },
      PALETTES.hosted_table,
    );
    const privatePng = renderTo(
      privateCanvasRef.current,
      renderPrivateDining,
      {
        canvas: null,
        kind: "private_dining",
        title: "Tasting Menu",
        chefName: "Chef Test",
        cta: privateCta,
        priceCents: priceCents as number | null | undefined,
        imageUrl: null,
        details: {
          min_guests: minGuests,
          max_guests: maxGuests,
          neighborhood: hood,
          ...locationFields,
        },
      },
      PALETTES.private_dining,
    );
    setPngs({ hosted: hostedPng, salon: salonPng, private: privatePng });

  }, [priceCents, seats, minGuests, maxGuests, hood, addr, archetype, archetypeField]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Share Card Price Harness</h1>
      <p data-testid="price-input">{String(priceCents)}</p>
      <p data-testid="seats-input">{String(seats)}</p>
      <p data-testid="min-guests-input">{String(minGuests)}</p>
      <p data-testid="max-guests-input">{String(maxGuests)}</p>
      <p data-testid="hood-input">{String(hood)}</p>
      <p data-testid="addr-input">{String(addr)}</p>
      <p data-testid="archetype-input">{String(archetype)}</p>
      <p data-testid="archetype-field">{archetypeField}</p>
      <p data-testid="archetype-resolved-cta">{resolvedCta}</p>
      <pre data-testid="hosted-texts">{JSON.stringify(hostedTexts)}</pre>
      <pre data-testid="hosted-salon-texts">{JSON.stringify(hostedSalonTexts)}</pre>
      <pre data-testid="private-texts">{JSON.stringify(privateTexts)}</pre>
      <pre data-testid="archetype-texts">{JSON.stringify(archetypeTexts)}</pre>
      <pre data-testid="hosted-styled">{JSON.stringify(hostedStyled)}</pre>
      <pre data-testid="hosted-salon-styled">{JSON.stringify(hostedSalonStyled)}</pre>
      <pre data-testid="private-styled">{JSON.stringify(privateStyled)}</pre>
      <pre data-testid="palettes">{JSON.stringify(PALETTES)}</pre>
      <pre data-testid="color-scheme">
        {typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"}
      </pre>
      <canvas ref={hostedCanvasRef} data-testid="hosted-canvas" style={{ display: "none" }} />
      <canvas ref={salonCanvasRef} data-testid="salon-canvas" style={{ display: "none" }} />
      <canvas ref={privateCanvasRef} data-testid="private-canvas" style={{ display: "none" }} />
      <pre data-testid="hosted-png">{pngs.hosted}</pre>
      <pre data-testid="salon-png">{pngs.salon}</pre>
      <pre data-testid="private-png">{pngs.private}</pre>
    </div>

  );
}



