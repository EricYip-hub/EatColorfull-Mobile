import { useEffect, useRef, useState } from "react";
import { Copy, Download, Share2, Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resolveShareCta } from "@/lib/listing-cta";
import { recordShareEvent, type ChefListing } from "@/lib/chef-kitchen";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Pick<ChefListing, "id" | "kind" | "title" | "slug" | "price_cents" | "photos">;
  chefId: string;
  chefName: string;
};

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "copy", label: "Copy Link" },
] as const;
type PlatformId = (typeof PLATFORMS)[number]["id"];

function buildShareUrl(slug: string, source: PlatformId) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://eatcolorfull.com";
  return `${origin}/listings/${slug}?utm_source=${source}&utm_medium=social_share`;
}

export function ShareDialog({ open, onOpenChange, listing, chefId, chefName }: Props) {
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const details = (listing as any).details ?? null;
  const shareCta = resolveShareCta(listing.kind, details);
  
  const shareUrl = buildShareUrl(listing.slug, platform);

  useEffect(() => {
    if (!open) return;
    drawShareCard({
      canvas: canvasRef.current,
      kind: listing.kind,
      title: listing.title,
      chefName,
      cta: shareCta,
      priceCents: listing.price_cents,
      imageUrl: listing.photos?.[0] ?? null,
      details,
      shareUrl,
    });
  }, [open, listing.kind, listing.title, listing.photos, listing.price_cents, chefName, shareCta, details, shareUrl]);

  function logShare(channel: string) {
    recordShareEvent({
      chef_id: chefId,
      listing_id: listing.id,
      platform: channel,
      share_url: shareUrl,
    }).catch(() => {});
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
      logShare(`${platform}:copy`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function handleNativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: listing.title,
        text: `${shareCta} — ${listing.title} by ${chefName}`,
        url: shareUrl,
      });
      logShare(`${platform}:native`);
    } catch {
      // user cancelled — ignore
    }
  }

  function handleDownload() {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `colorfull-${listing.slug}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
    logShare(`${platform}:card`);
  }

  async function handleDownloadQr() {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#1a1a1a", light: "#f5f0e6" },
      });
      const link = document.createElement("a");
      link.download = `colorfull-${listing.slug}-qr.png`;
      link.href = dataUrl;
      link.click();
      logShare(`${platform}:qr`);
    } catch {
      toast.error("Couldn't generate QR");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Share to Social</DialogTitle>
          <DialogDescription>
            Save a branded share card and drop the link in your bio or caption.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-muted">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1350}
            className="block aspect-[4/5] w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                platform === p.id
                  ? "bg-foreground text-background"
                  : "border border-foreground/15 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-foreground/10 bg-card p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Trackable link
          </p>
          <p className="mt-1 break-all font-mono text-xs">{shareUrl}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" /> Card
          </Button>
          <Button variant="outline" onClick={handleDownloadQr} className="gap-2">
            <QrCode className="h-4 w-4" /> QR
          </Button>
        </div>
        <Button onClick={handleNativeShare} className="w-full gap-2">
          <Share2 className="h-4 w-4" /> Share…
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// --- Branded share-card renderer ---

type DrawArgs = {
  canvas: HTMLCanvasElement | null;
  kind: ChefListing["kind"];
  title: string;
  chefName: string;
  cta: string;
  priceCents: number | null | undefined;
  imageUrl: string | null;
  details: any;
  shareUrl?: string;
};

export type Palette = { bg: string; ink: string; muted: string; accent: string; onAccent: string };
export const PALETTES: Record<"default" | "hosted_table" | "private_dining", Palette> = {
  default: { bg: "#f5f0e6", ink: "#1a1a1a", muted: "#4a4a4a", accent: "#3d4a2a", onAccent: "#f5f0e6" },
  hosted_table: { bg: "#f3ece2", ink: "#2a1818", muted: "#6b4a3a", accent: "#7a2e2a", onAccent: "#fbeede" },
  private_dining: { bg: "#11110f", ink: "#f3ead3", muted: "#b8a988", accent: "#c9a84c", onAccent: "#11110f" },
};

export type { DrawArgs };

function formatEventDate(raw: any): { date: string; time: string } | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

function drawShareCard(args: DrawArgs) {
  const { canvas, kind, imageUrl } = args;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const palette =
    kind === "hosted_table" ? PALETTES.hosted_table
    : kind === "private_dining" ? PALETTES.private_dining
    : PALETTES.default;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const render = () => {
    if (kind === "hosted_table") renderHostedTable(ctx, canvas, args, palette);
    else if (kind === "private_dining") renderPrivateDining(ctx, canvas, args, palette);
    else renderDefault(ctx, canvas, args, palette);
    if (args.shareUrl) drawQrOverlay(ctx, canvas, args.shareUrl, palette);
  };

  if (imageUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const targetH = canvas.height * (kind === "private_dining" ? 0.62 : 0.66);
    img.onload = () => {
      const ratio = Math.max(canvas.width / img.width, targetH / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, (canvas.width - dw) / 2, (targetH - dh) / 2, dw, dh);
      if (kind === "private_dining") {
        // dark gradient overlay for elevated feel
        const g = ctx.createLinearGradient(0, 0, 0, targetH);
        g.addColorStop(0, "rgba(17,17,15,0.15)");
        g.addColorStop(1, "rgba(17,17,15,0.85)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, targetH);
      }
      render();
    };
    img.onerror = () => render();
    img.src = imageUrl;
  } else {
    ctx.fillStyle = kind === "private_dining" ? "#1c1b18" : "#e8dfcd";
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.66);
    render();
  }
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
) {
  ctx.font = "600 26px ui-sans-serif, system-ui, -apple-system, Inter";
  const w = ctx.measureText(text).width + 90;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 64, 32);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(x + 32, y + 32, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 56, y + 33);
  ctx.textBaseline = "alphabetic";
}

function drawCta(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  bg: string,
  fg: string,
) {
  const W = canvas.width, H = canvas.height;
  const btnH = 110;
  const btnY = H - 60 - btnH;
  ctx.fillStyle = bg;
  roundRect(ctx, 60, btnY, W - 120, btnH, 14);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = "600 34px ui-sans-serif, system-ui, Inter";
  ctx.textBaseline = "middle";
  const t = text.toUpperCase();
  const tw = ctx.measureText(t).width;
  ctx.fillText(t, (W - tw) / 2, btnY + btnH / 2 + 2);
  ctx.textBaseline = "alphabetic";
}

function readArchetype(d: any): string | null {
  const v = d?.archetype ?? d?.table_archetype ?? d?.tableArchetype ?? null;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readMoodTags(d: any): string[] {
  const raw = d?.mood_tags ?? d?.moodTags ?? d?.moods ?? null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim())
    .slice(0, 4);
}

// Renders a row of pill chips, wrapping to a second line if needed.
// Returns the y-coordinate below the chips.
function drawMoodChips(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  x: number,
  y: number,
  maxWidth: number,
  border: string,
  fg: string,
): number {
  if (!tags.length) return y;
  ctx.font = "600 20px ui-sans-serif, system-ui, Inter";
  const padX = 22;
  const chipH = 44;
  const gap = 10;
  let cx = x;
  let cy = y;
  for (const tag of tags) {
    const label = tag.toUpperCase();
    const w = ctx.measureText(label).width + padX * 2;
    if (cx + w > x + maxWidth && cx !== x) {
      cx = x;
      cy += chipH + gap;
    }
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx, cy, w, chipH, chipH / 2);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx + padX, cy + chipH / 2 + 1);
    ctx.textBaseline = "alphabetic";
    cx += w + gap;
  }
  return cy + chipH;
}

function renderDefault(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  args: DrawArgs,
  p: Palette,
) {
  const W = canvas.width, H = canvas.height;
  const panelTop = H * 0.62;
  const grad = ctx.createLinearGradient(0, panelTop - 80, 0, H);
  grad.addColorStop(0, "rgba(245,240,230,0)");
  grad.addColorStop(0.35, "rgba(245,240,230,0.95)");
  grad.addColorStop(1, "rgba(245,240,230,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelTop - 80, W, H - panelTop + 80);

  drawSeal(ctx, "AVAILABLE ON COLORFULL", 60, 60, p.accent, p.onAccent);

  ctx.fillStyle = p.ink;
  ctx.font = "italic 78px 'Cormorant Garamond', 'Times New Roman', serif";
  wrapText(ctx, args.title, 60, H * 0.7, W - 120, 90, 3);

  ctx.fillStyle = p.muted;
  ctx.font = "500 30px ui-sans-serif, system-ui, Inter";
  let metaY = H * 0.7 + 90 * 3 + 20;
  if (metaY > H - 220) metaY = H - 220;
  ctx.fillText(`by ${args.chefName}`, 60, metaY);
  if (args.priceCents != null) {
    const t = `$${(args.priceCents / 100).toFixed(0)}`;
    ctx.fillText(t, W - 60 - ctx.measureText(t).width, metaY);
  }

  drawCta(ctx, canvas, args.cta, p.ink, p.bg);
}

/**
 * Returns a neighborhood-safe location label, or null if the input looks
 * like a full street address. The share card must never leak a host's
 * exact address — only their neighborhood/city.
 */
function safeNeighborhood(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  // Leading street number ("123 Main", "45A Oak").
  if (/^\d{1,6}[A-Za-z]?\s+\S/.test(s)) return null;
  // Common street suffixes — match as a whole word, optional trailing dot.
  if (
    /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|court|ct|place|pl|highway|hwy|parkway|pkwy|terrace|ter|circle|cir|square|sq|alley|aly)\b\.?/i.test(
      s,
    )
  ) {
    return null;
  }
  // US ZIP or ZIP+4 anywhere in the string.
  if (/\b\d{5}(-\d{4})?\b/.test(s)) return null;
  // Multi-segment address ("Mission, San Francisco, CA").
  if ((s.match(/,/g) ?? []).length >= 2) return null;
  // Unit / apt indicators.
  if (/\b(apt|suite|ste|unit|#)\s*\.?\s*\d/i.test(s)) return null;
  return s;
}

export function renderHostedTable(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  args: DrawArgs,
  p: Palette,
) {
  const W = canvas.width, H = canvas.height;
  const d = args.details ?? {};
  const event = formatEventDate(d.event_at ?? d.date ?? d.starts_at);
  const neighborhood: string | null =
    safeNeighborhood(d.neighborhood) ??
    safeNeighborhood(d.city) ??
    safeNeighborhood(d.location);
  const seats: number | null =
    typeof d.seats_remaining === "number" ? d.seats_remaining
    : typeof d.seats === "number" ? d.seats
    : null;

  // bottom cream panel
  const panelTop = H * 0.58;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, panelTop, W, H - panelTop);
  // subtle hairline
  ctx.fillStyle = "rgba(42,24,24,0.12)";
  ctx.fillRect(60, panelTop, W - 120, 1);

  drawSeal(ctx, "HOSTED TABLE · COLORFULL", 60, 60, p.accent, p.onAccent);

  // Seats remaining badge (top right) — always shown if data exists
  if (seats != null) {
    const txt = seats === 0 ? "SOLD OUT" : `${seats} SEAT${seats === 1 ? "" : "S"} LEFT`;
    ctx.font = "600 22px ui-sans-serif, system-ui, Inter";
    const bw = ctx.measureText(txt).width + 48;
    const bx = W - 60 - bw;
    ctx.fillStyle = p.bg;
    roundRect(ctx, bx, 70, bw, 48, 24);
    ctx.fill();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, 70, bw, 48, 24);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.textBaseline = "middle";
    ctx.fillText(txt, bx + 24, 95);
    ctx.textBaseline = "alphabetic";
  }

  const archetype = readArchetype(d);
  const moods = readMoodTags(d);

  // Archetype eyebrow above date
  if (archetype) {
    ctx.fillStyle = p.muted;
    ctx.font = "600 22px ui-sans-serif, system-ui, Inter";
    ctx.fillText(archetype.toUpperCase(), 60, panelTop + 40);
  }

  // Date block — large and dominant
  let y = panelTop + (archetype ? 90 : 70);
  if (event) {
    ctx.fillStyle = p.accent;
    ctx.font = "700 28px ui-sans-serif, system-ui, Inter";
    ctx.fillText(event.date, 60, y);
    y += 18;
    ctx.fillStyle = p.muted;
    ctx.font = "500 24px ui-sans-serif, system-ui, Inter";
    ctx.fillText(event.time, 60, y + 22);
    y += 50;
  }

  // Title
  ctx.fillStyle = p.ink;
  ctx.font = "italic 72px 'Cormorant Garamond', 'Times New Roman', serif";
  y += 20;
  wrapText(ctx, args.title, 60, y, W - 120, 82, 2);
  y += 82 * 2 - 10;

  // Mood chips
  if (moods.length) {
    y = drawMoodChips(ctx, moods, 60, y, W - 120, p.accent, p.accent) + 16;
  }

  // Chef · neighborhood · seats · price line
  ctx.fillStyle = p.muted;
  ctx.font = "500 28px ui-sans-serif, system-ui, Inter";
  const leftParts = [`by ${args.chefName}`];
  if (neighborhood) leftParts.push(neighborhood);
  if (seats != null && seats > 0) leftParts.push(`${seats} seat${seats === 1 ? "" : "s"} left`);
  const metaY = H - 60 - 110 - 40;
  ctx.fillText(leftParts.join("  ·  "), 60, metaY);
  {
    // Match listing flow exactly: plain "$N" with no suffix for hosted tables.
    // Fall back to "PRICING TBA" so the meta line right side stays balanced.
    // Negative prices are treated as missing to avoid misleading currency values.
    const t = args.priceCents != null && args.priceCents >= 0
      ? `$${(args.priceCents / 100).toFixed(0)}`
      : "PRICING TBA";
    ctx.font = "600 26px ui-sans-serif, system-ui, Inter";
    ctx.fillStyle = p.accent;
    ctx.fillText(t, W - 60 - ctx.measureText(t).width, metaY);
  }

  // When the table is sold out, the "Request a Seat" / "Apply to Attend"
  // CTA must not invite seat requests. Replace it with a muted waitlist
  // CTA so the share card never advertises a closed seat as bookable.
  if (seats === 0) {
    drawCta(ctx, canvas, "Join the Waitlist", p.muted, p.bg);
  } else {
    drawCta(ctx, canvas, args.cta, p.accent, p.onAccent);
  }
}

export function renderPrivateDining(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  args: DrawArgs,
  p: Palette,
) {
  const W = canvas.width, H = canvas.height;
  const d = args.details ?? {};
  // Treat 0 and negative values as missing — never render misleading
  // "0 GUESTS" or "-5 GUESTS" party labels.
  const minG: number | null =
    typeof d.min_guests === "number" && Number.isFinite(d.min_guests) && d.min_guests > 0
      ? d.min_guests
      : null;
  const maxG: number | null =
    typeof d.max_guests === "number" && Number.isFinite(d.max_guests) && d.max_guests > 0
      ? d.max_guests
      : null;
  const partyLabel =
    minG != null && maxG != null ? `${minG}–${maxG} GUESTS`
    : maxG != null ? `UP TO ${maxG} GUESTS`
    : minG != null ? `FROM ${minG} GUESTS`
    : "GATHER YOUR PARTY";
  const neighborhood: string | null =
    safeNeighborhood(d.neighborhood) ??
    safeNeighborhood(d.service_area) ??
    safeNeighborhood(d.city) ??
    safeNeighborhood(d.location);

  // dark bottom panel covers full lower portion
  const panelTop = H * 0.55;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, panelTop, W, H - panelTop);
  // thin gold rule
  ctx.fillStyle = p.accent;
  ctx.fillRect(60, panelTop, W - 120, 1);

  // Top seal in gold
  drawSeal(ctx, "PRIVATE DINING · COLORFULL", 60, 60, p.accent, p.onAccent);

  const archetype = readArchetype(d);
  const moods = readMoodTags(d);

  // Eyebrow — archetype if provided, else generic
  let y = panelTop + 70;
  ctx.fillStyle = p.accent;
  ctx.font = "600 22px ui-sans-serif, system-ui, Inter";
  ctx.fillText((archetype ? archetype : "An Evening By").toUpperCase(), 60, y);
  y += 36;

  // Chef name — hero
  ctx.fillStyle = p.ink;
  ctx.font = "italic 88px 'Cormorant Garamond', 'Times New Roman', serif";
  ctx.fillText(args.chefName, 60, y + 60);
  y += 110;

  // Title (experience name)
  ctx.fillStyle = p.muted;
  ctx.font = "italic 44px 'Cormorant Garamond', 'Times New Roman', serif";
  wrapText(ctx, args.title, 60, y + 30, W - 120, 52, 2);
  y += 52 * 2 + 24;

  // Mood chips (gold border on dark)
  if (moods.length) {
    y = drawMoodChips(ctx, moods, 60, y, W - 120, p.accent, p.accent) + 12;
  }


  // Detail row: party size · neighborhood · price
  const metaY = H - 60 - 110 - 40;
  ctx.fillStyle = p.muted;
  ctx.font = "600 24px ui-sans-serif, system-ui, Inter";
  const parts: string[] = [partyLabel];
  if (neighborhood) parts.push(neighborhood.toUpperCase());
  ctx.fillText(parts.join("   ·   "), 60, metaY);
  {
    // Match listing flow exactly: plain "$N" with no "FROM" prefix.
    // Fall back to "INQUIRE FOR PRICING" when price isn't published.
    // Negative prices are treated as missing to avoid misleading currency values.
    const t = args.priceCents != null && args.priceCents >= 0
      ? `$${(args.priceCents / 100).toFixed(0)}`
      : "INQUIRE FOR PRICING";
    ctx.fillStyle = p.accent;
    ctx.fillText(t, W - 60 - ctx.measureText(t).width, metaY);
  }

  drawCta(ctx, canvas, args.cta, p.accent, p.onAccent);
}

function drawQrOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  url: string,
  p: Palette,
) {
  const size = 220;
  const pad = 20;
  const x = canvas.width - size - pad - 40;
  const y = 40;
  // white card behind QR for scannability against any hero image
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2 + 34, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2 + 34, 18);
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.font = "600 16px ui-sans-serif, system-ui, Inter";
  ctx.textBaseline = "top";
  const label = "SCAN TO OPEN";
  const lw = ctx.measureText(label).width;
  ctx.fillText(label, x + (size - lw) / 2, y + size + 8);
  ctx.textBaseline = "alphabetic";

  QRCode.toDataURL(url, {
    width: size * 2,
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  })
    .then((dataUrl) => {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, x, y, size, size);
      img.src = dataUrl;
    })
    .catch(() => {});
  // suppress unused-palette-arg lint
  void p;
}



function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    // ellipsize last line if needed
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + "…";
  }
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}
