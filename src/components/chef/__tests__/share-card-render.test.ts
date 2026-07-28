import { describe, it, expect } from "vitest";
import {
  renderHostedTable,
  renderPrivateDining,
  PALETTES,
  type DrawArgs,
} from "@/components/chef/ShareDialog";
import { resolveShareCta } from "@/lib/listing-cta";

/**
 * Snapshot-style tests for the branded share-card renderers.
 * We stub a minimal CanvasRenderingContext2D and capture every fillText call,
 * then assert the rendered strings include the expected labels for each
 * listing kind + scenario.
 */

type DrawnText = { text: string; x: number; y: number };

function createFakeCtx() {
  const drawn: DrawnText[] = [];
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
      drawn.push({ text, x, y });
    },
  };
  return { ctx: ctx as CanvasRenderingContext2D, drawn };
}

function fakeCanvas(): HTMLCanvasElement {
  return { width: 1080, height: 1350 } as HTMLCanvasElement;
}

function textsOf(drawn: DrawnText[]) {
  return drawn.map((d) => d.text);
}
function hasText(drawn: DrawnText[], needle: string) {
  return drawn.some((d) => d.text.includes(needle));
}

function baseArgs(overrides: Partial<DrawArgs>): DrawArgs {
  return {
    canvas: fakeCanvas(),
    kind: "hosted_table",
    title: "Sunday Supper Club",
    chefName: "Chef Ada",
    cta: "Request a Seat",
    priceCents: 8500,
    imageUrl: null,
    details: {},
    ...overrides,
  } as DrawArgs;
}

describe("renderHostedTable share card", () => {
  it("renders seats remaining badge and meta when seats > 0", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: { seats: 3, neighborhood: "Mission" } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    // badge
    expect(all).toContain("3 SEATS LEFT");
    // meta line includes seats + neighborhood + chef
    expect(hasText(drawn, "by Chef Ada")).toBe(true);
    expect(hasText(drawn, "Mission")).toBe(true);
    expect(hasText(drawn, "3 seats left")).toBe(true);
    // price label
    expect(all).toContain("$85");
  });

  it("singularizes seats label when one seat remains", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: { seats: 1 } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    expect(all).toContain("1 SEAT LEFT");
    expect(hasText(drawn, "1 seat left")).toBe(true);
  });

  it("shows SOLD OUT badge when seats === 0 and omits seats from meta", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: { seats: 0, neighborhood: "Mission" } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    expect(all).toContain("SOLD OUT");
    // sold out: should not render "0 seats left" in meta
    expect(hasText(drawn, "0 seat")).toBe(false);
    expect(all).toContain("$85");
  });

  it("renders clean meta line when seats === 0 and neighborhood is present", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: { seats: 0, neighborhood: "Mission" } }),
      PALETTES.hosted_table,
    );
    // meta line should be: by Chef Ada  ·  Mission — no dangling separator
    const metaLine = drawn.find((d) => d.text.includes("by Chef Ada"));
    expect(metaLine).toBeDefined();
    expect(metaLine!.text).toBe("by Chef Ada  ·  Mission");
    expect(metaLine!.text).not.toContain("·  undefined");
    expect(metaLine!.text).not.toMatch(/·\s*$/);
  });

  it("renders clean meta line when seats === 0 and neighborhood is missing", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: { seats: 0 } }),
      PALETTES.hosted_table,
    );
    const metaLine = drawn.find((d) => d.text.includes("by Chef Ada"));
    expect(metaLine).toBeDefined();
    expect(metaLine!.text).toBe("by Chef Ada");
    expect(metaLine!.text).not.toContain("·");
  });

  it("omits seats badge entirely when seats data is missing", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, details: {} }),
      PALETTES.hosted_table,
    );
    expect(hasText(drawn, "$85")).toBe(true); // "$85" still present
    expect(hasText(drawn, "SEATS LEFT")).toBe(false);
    expect(hasText(drawn, "SOLD OUT")).toBe(false);
  });

  it("renders price label consistently from price_cents", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, priceCents: 12000, details: { seats: 2 } }),
      PALETTES.hosted_table,
    );
    expect(textsOf(drawn)).toContain("$120");
  });

  it("falls back to 'PRICING TBA' when priceCents is missing", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, priceCents: null, details: { seats: 2 } }),
      PALETTES.hosted_table,
    );
    expect(textsOf(drawn)).toContain("PRICING TBA");
  });

  it("renders '$0' when priceCents is 0 (matches listing flow showing free events)", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, priceCents: 0, details: { seats: 2 } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    // Listing flow renders "$0" when price_cents === 0 (only `!= null` is checked);
    // share card meta line must match — no "PRICING TBA" fallback for free events.
    expect(all).toContain("$0");
    expect(all).not.toContain("PRICING TBA");
  });

  it("renders 'PRICING TBA' when priceCents is undefined (no price field at all)", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, priceCents: undefined, details: { seats: 2 } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    expect(all).toContain("PRICING TBA");
    expect(all.some((t) => /^\$\d/.test(t))).toBe(false);
  });

  it("falls back to 'PRICING TBA' when priceCents is negative (avoid misleading '-$N')", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderHostedTable(
      ctx,
      canvas,
      baseArgs({ canvas, priceCents: -500, details: { seats: 2 } }),
      PALETTES.hosted_table,
    );
    const all = textsOf(drawn);
    expect(all).toContain("PRICING TBA");
    // Must not render a negative dollar amount.
    expect(all.some((t) => /^-\$/.test(t))).toBe(false);
    expect(all.some((t) => /^\$/.test(t) && t !== "$0")).toBe(false);
  });
});


describe("renderPrivateDining share card", () => {
  function pdArgs(overrides: Partial<DrawArgs>): DrawArgs {
    return baseArgs({
      kind: "private_dining",
      title: "Tasting Menu at Home",
      cta: "Apply to Host",
      priceCents: 25000,
      ...overrides,
    });
  }

  it("renders min–max party-size range", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { min_guests: 6, max_guests: 12 } }),
      PALETTES.private_dining,
    );
    expect(hasText(drawn, "6–12 GUESTS")).toBe(true);
    expect(hasText(drawn, "$250")).toBe(true);
  });

  it("renders 'UP TO N GUESTS' when only max provided", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { max_guests: 10 } }),
      PALETTES.private_dining,
    );
    expect(hasText(drawn, "UP TO 10 GUESTS")).toBe(true);
  });

  it("renders 'FROM N GUESTS' when only min provided", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { min_guests: 4 } }),
      PALETTES.private_dining,
    );
    expect(hasText(drawn, "FROM 4 GUESTS")).toBe(true);
  });

  it("falls back to 'GATHER YOUR PARTY' when party size is missing", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: {} }),
      PALETTES.private_dining,
    );
    expect(hasText(drawn, "GATHER YOUR PARTY")).toBe(true);
  });

  it("renders clean party label when min_guests === 0 and max_guests provided", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { min_guests: 0, max_guests: 8, neighborhood: "SoMa" } }),
      PALETTES.private_dining,
    );
    // When min is 0, the range reads "0–8 GUESTS" which is acceptable;
    // the important thing is the meta line still renders without dangling separators.
    expect(hasText(drawn, "0–8 GUESTS")).toBe(true);
    const metaLine = drawn.find((d) => d.text.includes("GUESTS"));
    expect(metaLine).toBeDefined();
    expect(metaLine!.text).not.toMatch(/·\s*$/);
    expect(metaLine!.text).not.toContain("undefined");
  });

  it("renders clean party label when only max_guests === 0", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { max_guests: 0 } }),
      PALETTES.private_dining,
    );
    const all = textsOf(drawn);
    // "UP TO 0 GUESTS" is the literal output; snapshot asserts it stays consistent.
    expect(all).toContain("UP TO 0 GUESTS");
  });

  it("renders clean party label when both min_guests and max_guests are 0", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, details: { min_guests: 0, max_guests: 0 } }),
      PALETTES.private_dining,
    );
    const all = textsOf(drawn);
    expect(all).toContain("0–0 GUESTS");
  });

  it("renders price label consistently as plain '$N' (matches listing flow)", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, priceCents: 40000, details: { min_guests: 2, max_guests: 8 } }),
      PALETTES.private_dining,
    );
    expect(textsOf(drawn)).toContain("$400");
  });

  it("falls back to 'INQUIRE FOR PRICING' when priceCents is missing", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, priceCents: null, details: { min_guests: 4, max_guests: 8 } }),
      PALETTES.private_dining,
    );
    expect(textsOf(drawn)).toContain("INQUIRE FOR PRICING");
  });

  it("renders '$0' when priceCents is 0 (matches listing flow showing free events)", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, priceCents: 0, details: { min_guests: 4, max_guests: 8 } }),
      PALETTES.private_dining,
    );
    const all = textsOf(drawn);
    expect(all).toContain("$0");
    expect(all).not.toContain("INQUIRE FOR PRICING");
  });

  it("renders 'INQUIRE FOR PRICING' when priceCents is undefined (no price field at all)", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, priceCents: undefined, details: { min_guests: 4, max_guests: 8 } }),
      PALETTES.private_dining,
    );
    const all = textsOf(drawn);
    expect(all).toContain("INQUIRE FOR PRICING");
    expect(all.some((t) => /^\$\d/.test(t))).toBe(false);
  });

  it("falls back to 'INQUIRE FOR PRICING' when priceCents is negative (avoid misleading '-$N')", () => {
    const { ctx, drawn } = createFakeCtx();
    const canvas = fakeCanvas();
    renderPrivateDining(
      ctx,
      canvas,
      pdArgs({ canvas, priceCents: -25000, details: { min_guests: 4, max_guests: 8 } }),
      PALETTES.private_dining,
    );
    const all = textsOf(drawn);
    expect(all).toContain("INQUIRE FOR PRICING");
    // Must not render a negative dollar amount.
    expect(all.some((t) => /^-\$/.test(t))).toBe(false);
    expect(all.some((t) => /^\$/.test(t) && t !== "$0")).toBe(false);
  });
});

/**
 * CTA-label + price-meta pairing snapshots.
 *
 * Listing flow rules:
 *  - hosted_table   → "Request a Seat" CTA, or "Apply to Attend" for salon /
 *                     founding-salon archetypes (resolveShareCta).
 *  - private_dining → "Apply to Host" CTA.
 *
 * The button label is rendered uppercased by drawCta(). For every
 * priceCents missing/zero/negative case, the CTA label must stay intact
 * AND the price meta line must match the listing fallback copy.
 */
describe("share card CTA label + price meta pairing", () => {
  const PRICE_CASES: Array<{
    label: string;
    priceCents: number | null | undefined;
    hostedMeta: string;
    privateMeta: string;
  }> = [
    { label: "null", priceCents: null, hostedMeta: "PRICING TBA", privateMeta: "INQUIRE FOR PRICING" },
    { label: "undefined", priceCents: undefined, hostedMeta: "PRICING TBA", privateMeta: "INQUIRE FOR PRICING" },
    { label: "zero", priceCents: 0, hostedMeta: "$0", privateMeta: "$0" },
    { label: "negative", priceCents: -1234, hostedMeta: "PRICING TBA", privateMeta: "INQUIRE FOR PRICING" },
  ];

  describe("hosted_table — default 'Request a Seat'", () => {
    for (const c of PRICE_CASES) {
      it(`renders 'REQUEST A SEAT' button + '${c.hostedMeta}' meta when priceCents=${c.label}`, () => {
        const cta = resolveShareCta("hosted_table", { archetype: "supper-club" });
        expect(cta).toBe("Request a Seat");
        const { ctx, drawn } = createFakeCtx();
        const canvas = fakeCanvas();
        renderHostedTable(
          ctx,
          canvas,
          baseArgs({ canvas, cta, priceCents: c.priceCents, details: { archetype: "supper-club", seats: 2 } }),
          PALETTES.hosted_table,
        );
        const all = textsOf(drawn);
        expect(all).toContain("REQUEST A SEAT");
        expect(all).toContain(c.hostedMeta);
        if (c.hostedMeta !== "$0") {
          expect(all.some((t) => /^\$\d/.test(t) || /^-\$/.test(t))).toBe(false);
        }
      });
    }
  });

  describe("hosted_table — salon archetype 'Apply to Attend'", () => {
    for (const c of PRICE_CASES) {
      it(`renders 'APPLY TO ATTEND' button + '${c.hostedMeta}' meta when priceCents=${c.label}`, () => {
        const cta = resolveShareCta("hosted_table", { archetype: "founding-salon" });
        expect(cta).toBe("Apply to Attend");
        const { ctx, drawn } = createFakeCtx();
        const canvas = fakeCanvas();
        renderHostedTable(
          ctx,
          canvas,
          baseArgs({
            canvas,
            cta,
            priceCents: c.priceCents,
            details: { archetype: "founding-salon", seats: 4 },
          }),
          PALETTES.hosted_table,
        );
        const all = textsOf(drawn);
        expect(all).toContain("APPLY TO ATTEND");
        expect(all).not.toContain("REQUEST A SEAT");
        expect(all).toContain(c.hostedMeta);
        if (c.hostedMeta !== "$0") {
          expect(all.some((t) => /^\$\d/.test(t) || /^-\$/.test(t))).toBe(false);
        }
      });
    }
  });

  describe("private_dining — 'Apply to Host'", () => {
    for (const c of PRICE_CASES) {
      it(`renders 'APPLY TO HOST' button + '${c.privateMeta}' meta when priceCents=${c.label}`, () => {
        const cta = resolveShareCta("private_dining", null);
        expect(cta).toBe("Apply to Host");
        const { ctx, drawn } = createFakeCtx();
        const canvas = fakeCanvas();
        renderPrivateDining(
          ctx,
          canvas,
          baseArgs({
            canvas,
            kind: "private_dining",
            title: "Tasting Menu at Home",
            cta,
            priceCents: c.priceCents,
            details: { min_guests: 4, max_guests: 8 },
          }),
          PALETTES.private_dining,
        );
        const all = textsOf(drawn);
        expect(all).toContain("APPLY TO HOST");
        expect(all).toContain(c.privateMeta);
        if (c.privateMeta !== "$0") {
          expect(all.some((t) => /^\$\d/.test(t) || /^-\$/.test(t))).toBe(false);
        }
      });
    }
  });
});


