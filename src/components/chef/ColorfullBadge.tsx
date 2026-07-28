import { useRef } from "react";
import { Download } from "lucide-react";

const BADGE_LABELS = [
  "Available on Colorfull",
  "Order on Colorfull",
  "Reserve on Colorfull",
  "Shop This Dish on Colorfull",
  "Book My Table on Colorfull",
  "Weekly Meals on Colorfull",
] as const;

export type BadgeLabel = (typeof BADGE_LABELS)[number];

function badgeSVG(label: string, size = 1080, story = false) {
  const h = story ? 1920 : size;
  const accent = "#3f5d3a"; // olive
  const cream = "#f5f1ea";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${h}" width="${size}" height="${h}">
  <rect width="100%" height="100%" fill="${cream}"/>
  <g transform="translate(${size / 2}, ${h / 2 - 80})">
    <circle r="180" fill="${accent}"/>
    <text x="0" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="200" fill="${cream}" font-weight="600">C</text>
  </g>
  <text x="${size / 2}" y="${h / 2 + 200}" text-anchor="middle" font-family="Georgia, serif" font-size="${size > 800 ? 64 : 36}" fill="#0d0d0d">${label}</text>
  <text x="${size / 2}" y="${h / 2 + 280}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size > 800 ? 28 : 18}" fill="#0d0d0d" letter-spacing="6">EATCOLORFULL.COM</text>
</svg>`;
}

function downloadSVG(label: string, story = false) {
  const svg = badgeSVG(label, 1080, story);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `colorfull-badge-${label.toLowerCase().replace(/\s+/g, "-")}${story ? "-story" : ""}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPNG(label: string, story = false) {
  const size = 1080;
  const h = story ? 1920 : size;
  const svg = badgeSVG(label, size, story);
  const img = new Image();
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, h);
  URL.revokeObjectURL(url);
  canvas.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `colorfull-badge-${label.toLowerCase().replace(/\s+/g, "-")}${story ? "-story" : ""}.png`;
    a.click();
  }, "image/png");
}

export function ColorfullBadgeGenerator() {
  const previewRef = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Download a Colorfull badge to use in your social posts, stories, and
        videos. Pair it with your shoppable link so viewers can tap straight
        through to order.
      </p>
      <div ref={previewRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BADGE_LABELS.map((label) => (
          <div
            key={label}
            className="overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-sm"
          >
            <div
              className="aspect-square w-full"
              dangerouslySetInnerHTML={{ __html: badgeSVG(label) }}
            />
            <div className="space-y-2 p-4">
              <p className="font-serif text-base">{label}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadPNG(label, false)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-foreground/30 px-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                >
                  <Download className="h-3.5 w-3.5" /> PNG square
                </button>
                <button
                  onClick={() => downloadPNG(label, true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-foreground/30 px-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                >
                  <Download className="h-3.5 w-3.5" /> PNG story
                </button>
                <button
                  onClick={() => downloadSVG(label)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-foreground/30 px-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
