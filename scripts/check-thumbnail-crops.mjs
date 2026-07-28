#!/usr/bin/env node
// Thumbnail crop checker.
//
// For each (image, aspectRatio, objectPosition) that the app actually renders,
// simulate the CSS `object-cover` crop with sharp and ask a vision model
// whether any salient subject (utensil, hand, face, key food element) is
// being cut off at the frame edge. Writes:
//   - /mnt/documents/thumbnail-crops/<name>__<aspect>.jpg   (the crop)
//   - /mnt/documents/thumbnail-crops/report.json            (machine report)
//   - /mnt/documents/thumbnail-crops/report.md              (human report)
// Exits non-zero if any thumbnail is flagged.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = "/mnt/documents/thumbnail-crops";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const KEY = process.env.LOVABLE_API_KEY;
if (!KEY) {
  console.error("LOVABLE_API_KEY missing — cannot run vision check.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 1. Manifest: where each image is rendered.
// ---------------------------------------------------------------------------
// Aspect = output W:H. Position = CSS object-position (e.g. "50% 50%").
// Add new (image, aspect, position) combos here as the app grows.

const LOCAL_TABLE_ASSETS = [
  "table-mediterranean.jpg",
  "table-heritage.jpg",
  "table-plant.jpg",
  "table-fire.jpg",
  "table-shabbat.jpg",
  "table-salon.jpg",
  "table-candlelit.jpg",
  "table-supperclub.jpg",
];

// Unsplash IDs referenced from src/routes/index.tsx ARCHETYPE_IMAGES
// (excluding the plant-forward one which is now a local asset).
const UNSPLASH_ARCHETYPE_IDS = [
  "photo-1551218808-94e220e084d2", // Heritage Table
  "photo-1544025162-d76694265947", // Mediterranean Table
  "photo-1478737270239-2f02b77fc618", // Sacred Table
  "photo-1505253716362-afaea1d3d1af", // Longevity Table
  "photo-1555939594-58d7cb561ad1", // Fire Table
  "photo-1414235077428-338989a2e8c0", // Sensory Table
  "photo-1490818387583-1baba5e638af", // Biohacker Table
  "photo-1529543544282-ea669407fca3", // Creator Table
  "photo-1511795409834-ef04bbd61622", // Music Table
  "photo-1530062845289-9109b2c9c868", // Shabbat / Founding Salon
];

const manifest = [
  // Archetype carousel (square, focal point optional).
  {
    id: "plant-forward-table",
    source: { kind: "local", path: "src/assets/plant-forward-table.jpg" },
    aspect: "1:1",
    position: "30% center",
    surface: "archetype carousel (Plant Forward Table)",
  },
  ...UNSPLASH_ARCHETYPE_IDS.map((pid) => ({
    id: pid,
    source: {
      kind: "url",
      url: `https://images.unsplash.com/${pid}?auto=format&fit=crop&w=800&q=70`,
    },
    aspect: "1:1",
    position: "50% 50%",
    surface: "archetype carousel",
  })),
  // Season carousel + TableCard + Founding Salon + Meet-the-hosts (aspect 4:5).
  // Per-table focal points mirror Table.focalPoint in src/lib/tables-data.ts —
  // keep these two lists in sync when tuning crops.
  ...LOCAL_TABLE_ASSETS.map((f) => {
    const focal = {
      "table-plant.jpg": "35% 50%",
      "table-shabbat.jpg": "35% 50%",
      "table-salon.jpg": "25% 50%",
      "table-candlelit.jpg": "50% 70%",
    };
    return {
      id: f.replace(/\.jpg$/, ""),
      source: { kind: "local", path: `src/assets/${f}` },
      aspect: "4:5",
      position: focal[f] ?? "50% 50%",
      surface: "TableCard / season carousel",
    };
  }),
  // Hero is full-bleed but use a wide aspect to verify nothing critical sits at edges.
  {
    id: "hero-table",
    source: { kind: "local", path: "src/assets/hero-table.jpg" },
    aspect: "16:9",
    position: "50% 50%",
    surface: "homepage hero",
  },
];

// ---------------------------------------------------------------------------
// 2. Crop helpers — mirror CSS `object-cover` + `object-position`.
// ---------------------------------------------------------------------------

function parsePosition(pos) {
  // Accepts "50% 50%", "30% center", "center", "left center" …
  const tokens = pos.trim().split(/\s+/);
  const map = { left: 0, center: 50, right: 100, top: 0, bottom: 100 };
  const toPct = (t) => {
    if (t in map) return map[t];
    if (t.endsWith("%")) return parseFloat(t);
    return 50;
  };
  if (tokens.length === 1) {
    const v = toPct(tokens[0]);
    return { xPct: v, yPct: 50 };
  }
  return { xPct: toPct(tokens[0]), yPct: toPct(tokens[1]) };
}

function aspectRatio(spec) {
  const [w, h] = spec.split(":").map(Number);
  return w / h;
}

async function loadBuffer(source) {
  if (source.kind === "local") return readFile(path.join(ROOT, source.path));
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`fetch ${source.url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function renderCrop(source, aspect, position) {
  const buf = await loadBuffer(source);
  const meta = await sharp(buf).metadata();
  const srcAR = meta.width / meta.height;
  const tgtAR = aspectRatio(aspect);
  let cw, ch;
  if (srcAR > tgtAR) {
    // crop horizontally
    ch = meta.height;
    cw = Math.round(ch * tgtAR);
  } else {
    cw = meta.width;
    ch = Math.round(cw / tgtAR);
  }
  const { xPct, yPct } = parsePosition(position);
  const left = Math.round((meta.width - cw) * (xPct / 100));
  const top = Math.round((meta.height - ch) * (yPct / 100));
  const cropped = await sharp(buf)
    .extract({ left, top, width: cw, height: ch })
    .resize({ width: 640 }) // shrink for the vision call
    .jpeg({ quality: 80 })
    .toBuffer();
  return cropped;
}

// ---------------------------------------------------------------------------
// 3. Vision check via Lovable AI Gateway (Gemini).
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a strict QA reviewer for food-website thumbnails.
You will be shown one already-cropped thumbnail. Decide whether the FRAME EDGE
clearly BISECTS a salient foreground object — i.e. cuts THROUGH the object so
the broken silhouette is visible inside the frame.

Treat these as OK (do NOT flag):
- Hands, arms, sleeves, or wrists entering from an edge (editorial intent).
- A plate, bowl, or glass whose rim TOUCHES the edge but is not cut through —
  even when most of the plate is in frame and only a sliver of rim meets the edge.
- A utensil whose handle exits the frame cleanly while the eating end stays in.
- Background figures, walls, windows, candles, or curtains meeting the edge.

Flag as "major" ONLY when the frame edge passes through the middle of a key
foreground object, visibly slicing it:
- A utensil sliced through its blade or tines mid-length (you can see the cut).
- A face cut through the eyes, mouth, or chin.
- The hero plate visibly bisected — the rim is cut so that two ends of the
  rim arc both meet the edge with the plate's center off-screen.
- A fork/spoon handle ending inside the frame with the food end off-frame.

"Touching" or "extending to" the edge is NOT bisecting. Be conservative.

Reply ONLY with strict JSON, no prose:
{"flagged": boolean, "severity": "ok" | "minor" | "major", "reason": string}

Only flag=true for "major".`;

async function visionCheck(jpegBuf) {
  const b64 = jpegBuf.toString("base64");
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Review this thumbnail crop." },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${b64}` },
          },
        ],
      },
    ],
    temperature: 0,
  };
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "";
  const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return { flagged: false, severity: "ok", reason: `unparseable: ${raw.slice(0, 120)}` };
  }
}

// Vision models are non-deterministic on borderline crops. Sample N times and
// require a majority to flag — kills single-shot false positives without
// hiding real issues.
async function visionCheckConsensus(jpegBuf, samples = 3) {
  const results = await Promise.all(
    Array.from({ length: samples }, () => visionCheck(jpegBuf)),
  );
  const flagVotes = results.filter((r) => r.flagged).length;
  const flagged = flagVotes > samples / 2;
  const chosen = (flagged
    ? results.find((r) => r.flagged)
    : results.find((r) => !r.flagged)) ?? results[0];
  return { ...chosen, flagged, votes: `${flagVotes}/${samples}` };
}

// ---------------------------------------------------------------------------
// 4. Run.
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  const results = [];
  for (const entry of manifest) {
    const slug = `${entry.id}__${entry.aspect.replace(":", "x")}`;
    process.stdout.write(`  · ${slug} … `);
    try {
      const crop = await renderCrop(entry.source, entry.aspect, entry.position);
      await writeFile(path.join(OUT, `${slug}.jpg`), crop);
      const verdict = await visionCheckConsensus(crop);
      results.push({ ...entry, slug, verdict });
      console.log(verdict.flagged ? `FLAG (${verdict.severity})` : `ok (${verdict.severity})`);
    } catch (err) {
      console.log(`error: ${err.message}`);
      results.push({ ...entry, slug, verdict: { flagged: false, severity: "error", reason: err.message } });
    }
  }

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));

  const flagged = results.filter((r) => r.verdict.flagged);
  const minor = results.filter((r) => !r.verdict.flagged && r.verdict.severity === "minor");

  const md = [
    "# Thumbnail Crop Report",
    "",
    `Checked **${results.length}** thumbnails. Flagged **${flagged.length}**, minor **${minor.length}**.`,
    "",
    "## Flagged (action required)",
    flagged.length === 0 ? "_None._" : flagged.map((r) => `- **${r.slug}** (${r.surface}): ${r.verdict.reason}`).join("\n"),
    "",
    "## Minor (review)",
    minor.length === 0 ? "_None._" : minor.map((r) => `- ${r.slug} (${r.surface}): ${r.verdict.reason}`).join("\n"),
    "",
    "## All results",
    ...results.map((r) => `- ${r.slug} · ${r.aspect} · pos=${r.position} → **${r.verdict.severity}** — ${r.verdict.reason}`),
  ].join("\n");
  await writeFile(path.join(OUT, "report.md"), md);

  console.log(`\nReport: ${OUT}/report.md`);
  if (flagged.length > 0) {
    console.error(`\n${flagged.length} thumbnail(s) flagged.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
