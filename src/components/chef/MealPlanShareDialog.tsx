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

export type MealPlanShareInput = {
  tastemakerId: string;
  tastemakerName: string;
  coverImage: string | null;
  avatarImage?: string | null;
  plan: { id: string; title: string; days: number; tagline: string };
};


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MealPlanShareInput;
};

function buildShareUrl(tastemakerId: string, planId: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://eatcolorfull.com";
  return `${origin}/tastemakers/${tastemakerId}?plan=${planId}&utm_source=share&utm_medium=social_share`;
}

const PALETTE = {
  bg: "#f5f0e6",
  ink: "#1a1a1a",
  muted: "#4a4a4a",
  accent: "#3d4a2a",
  onAccent: "#f5f0e6",
};

export function MealPlanShareDialog({ open, onOpenChange, data }: Props) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shareUrl = buildShareUrl(data.tastemakerId, data.plan.id);

  useEffect(() => {
    if (!open) return;
    drawCard(canvasRef.current, data, shareUrl);
  }, [open, data, shareUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
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
        title: data.plan.title,
        text: `${data.plan.title} — a ${data.plan.days}-day meal plan by ${data.tastemakerName}`,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  function handleDownloadCard() {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `colorfull-${data.plan.id}-plan.png`;
    link.href = c.toDataURL("image/png");
    link.click();
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
      link.download = `colorfull-${data.plan.id}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Couldn't generate QR");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Share this plan</DialogTitle>
          <DialogDescription>
            Save the card or share the QR — anyone who scans lands on {data.tastemakerName}'s
            meal plan.
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

        <div className="rounded-md border border-foreground/10 bg-card p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Invite link
          </p>
          <p className="mt-1 break-all font-mono text-xs">{shareUrl}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={handleDownloadCard} className="gap-2">
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

function drawCard(
  canvas: HTMLCanvasElement | null,
  data: MealPlanShareInput,
  shareUrl: string,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const p = PALETTE;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const render = () => {
    const W = canvas.width;
    const H = canvas.height;
    const panelTop = H * 0.6;
    const grad = ctx.createLinearGradient(0, panelTop - 100, 0, H);
    grad.addColorStop(0, "rgba(245,240,230,0)");
    grad.addColorStop(0.4, "rgba(245,240,230,0.95)");
    grad.addColorStop(1, "rgba(245,240,230,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, panelTop - 100, W, H - panelTop + 100);

    drawSeal(ctx, "MEAL PLAN · COLORFULL", 60, 60, p.accent, p.onAccent);

    // Days badge
    const daysTxt = `${data.plan.days} DAYS`;
    ctx.font = "600 22px ui-sans-serif, system-ui, Inter";
    const bw = ctx.measureText(daysTxt).width + 48;
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
    ctx.fillText(daysTxt, bx + 24, 95);
    ctx.textBaseline = "alphabetic";

    // Title
    ctx.fillStyle = p.ink;
    ctx.font = "italic 76px 'Cormorant Garamond', 'Times New Roman', serif";
    let y = panelTop + 40;
    wrapText(ctx, data.plan.title, 60, y, W - 120, 86, 2);
    y += 86 * 2 + 4;

    // Tagline
    ctx.fillStyle = p.muted;
    ctx.font = "500 28px ui-sans-serif, system-ui, Inter";
    wrapText(ctx, data.plan.tagline, 60, y, W - 120, 40, 3);

    // Chef line
    ctx.fillStyle = p.accent;
    ctx.font = "600 26px ui-sans-serif, system-ui, Inter";
    const chefY = H - 60 - 110 - 30;
    ctx.fillText(`by ${data.tastemakerName}`, 60, chefY);

    // CTA
    const btnH = 110;
    const btnY = H - 60 - btnH;
    ctx.fillStyle = p.accent;
    roundRect(ctx, 60, btnY, W - 120, btnH, 14);
    ctx.fill();
    ctx.fillStyle = p.onAccent;
    ctx.font = "600 32px ui-sans-serif, system-ui, Inter";
    ctx.textBaseline = "middle";
    const cta = "SCAN QR TO GET THE PLAN";
    const tw = ctx.measureText(cta).width;
    ctx.fillText(cta, (W - tw) / 2, btnY + btnH / 2 + 2);
    ctx.textBaseline = "alphabetic";

    drawQrOverlay(ctx, canvas, shareUrl);
    drawAvatar(ctx, canvas, data.avatarImage ?? null);
  };

  if (data.coverImage) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const targetH = canvas.height * 0.62;
    img.onload = () => {
      const ratio = Math.max(canvas.width / img.width, targetH / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, (canvas.width - dw) / 2, (targetH - dh) / 2, dw, dh);
      render();
    };
    img.onerror = () => render();
    img.src = data.coverImage;
  } else {
    ctx.fillStyle = "#e8dfcd";
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.62);
    render();
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  src: string | null,
) {
  if (!src) return;
  const size = 200;
  const cx = 60 + size / 2;
  const cy = canvas.height * 0.6 - 10;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.save();
    // white ring
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const ratio = Math.max(size / img.width, size / img.height);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  };
  img.src = src;
}


function drawSeal(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
) {
  ctx.font = "600 26px ui-sans-serif, system-ui, Inter";
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

function drawQrOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  url: string,
) {
  const size = 240;
  const pad = 22;
  const x = canvas.width - size - pad - 40;
  const y = canvas.height * 0.6 - size - pad - 30;
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
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + "…";
  }
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}
