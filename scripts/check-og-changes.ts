#!/usr/bin/env bun
/**
 * Detects drift in og-image.jpg and OG/Twitter meta tags between:
 *   (1) the local source tree
 *   (2) the saved baseline snapshot (.lovable/og-baseline.json) — the last
 *       state you confirmed shipped
 *   (3) the currently-deployed live site
 *
 * Two modes:
 *
 *   bun scripts/check-og-changes.ts
 *     → Diff local + baseline + live. Exits 2 if any drift exists.
 *
 *   bun scripts/check-og-changes.ts --save
 *     → Capture current LOCAL source (image hash + tracked meta) and write
 *       it to .lovable/og-baseline.json. Run this immediately after a
 *       successful publish so future runs diff against the shipped state.
 *
 * Custom live URL (default https://eatcolorfull.com):
 *   bun scripts/check-og-changes.ts https://example.com
 *   bun scripts/check-og-changes.ts --save https://example.com
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const SAVE_MODE = args.includes("--save") || args.includes("save");
const REPORT_ARG = args.find((a) => a.startsWith("--report="));
const REPORT_PATH = REPORT_ARG ? REPORT_ARG.slice("--report=".length) : null;
const LIVE_URL =
  args.find((a) => /^https?:\/\//i.test(a)) || "https://eatcolorfull.com";

const REPO_ROOT = resolve(import.meta.dir, "..");
const OG_IMAGE_PATH = `${REPO_ROOT}/public/og-image.jpg`;
const ROOT_ROUTE_PATH = `${REPO_ROOT}/src/routes/__root.tsx`;
const BASELINE_PATH = `${REPO_ROOT}/.lovable/og-baseline.json`;

const TRACKED_KEYS = [
  "og:title",
  "og:description",
  "og:type",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:site_name",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
] as const;

type MetaMap = Map<string, string>;

type Baseline = {
  savedAt: string;
  liveUrl: string;
  ogImageSha256: string | null;
  meta: Record<string, string>;
};

async function sha256(buf: Buffer | ArrayBuffer): Promise<string> {
  return createHash("sha256").update(Buffer.from(buf as Buffer)).digest("hex");
}

function parseHtmlMeta(html: string): MetaMap {
  const map: MetaMap = new Map();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];
    const content = tag.match(/\bcontent\s*=\s*["']([^"]*)["']/i)?.[1];
    if (name && content !== undefined) map.set(name.toLowerCase(), content);
  }
  return map;
}

function parseSourceMeta(source: string): MetaMap {
  const map: MetaMap = new Map();
  const re =
    /\{\s*(?:name|property)\s*:\s*["']([^"']+)["']\s*,\s*content\s*:\s*["']([^"]*)["']\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    map.set(m[1].toLowerCase(), m[2]);
  }
  return map;
}

async function readLocalState() {
  let localImageHash: string | null = null;
  try {
    localImageHash = await sha256(await readFile(OG_IMAGE_PATH));
  } catch {
    /* image missing */
  }
  const source = await readFile(ROOT_ROUTE_PATH, "utf8");
  return { localImageHash, localMeta: parseSourceMeta(source) };
}

async function readBaseline(): Promise<Baseline | null> {
  try {
    return JSON.parse(await readFile(BASELINE_PATH, "utf8")) as Baseline;
  } catch {
    return null;
  }
}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function diffMaps(
  a: MetaMap | Record<string, string>,
  b: MetaMap | Record<string, string>,
): Array<{ key: string; a: string | null; b: string | null }> {
  const get = (m: MetaMap | Record<string, string>, k: string) =>
    m instanceof Map ? m.get(k) ?? null : m[k] ?? null;
  const out: Array<{ key: string; a: string | null; b: string | null }> = [];
  for (const key of TRACKED_KEYS) {
    const av = get(a, key);
    const bv = get(b, key);
    if (av !== bv) out.push({ key, a: av, b: bv });
  }
  return out;
}

async function saveBaseline() {
  const { localImageHash, localMeta } = await readLocalState();
  const baseline: Baseline = {
    savedAt: new Date().toISOString(),
    liveUrl: LIVE_URL,
    ogImageSha256: localImageHash,
    meta: Object.fromEntries(
      TRACKED_KEYS.map((k) => [k, localMeta.get(k) ?? ""]).filter(
        ([, v]) => v !== "",
      ),
    ),
  };
  await mkdir(dirname(BASELINE_PATH), { recursive: true });
  await writeFile(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`${C.green}● Baseline saved${C.reset} → ${C.dim}${BASELINE_PATH}${C.reset}`);
  console.log(`  ${C.dim}savedAt:${C.reset} ${baseline.savedAt}`);
  console.log(`  ${C.dim}og-image sha256:${C.reset} ${baseline.ogImageSha256?.slice(0, 16) ?? "(missing)"}…`);
  console.log(`  ${C.dim}tracked tags:${C.reset} ${Object.keys(baseline.meta).length}`);
  console.log(
    `\n${C.cyan}Commit ${BASELINE_PATH.replace(REPO_ROOT + "/", "")} so the next CI run diffs against this shipped state.${C.reset}`,
  );
}

function buildRevalidationUrls(siteUrl: string, ogImageUrl: string | null) {
  const encodedSite = encodeURIComponent(siteUrl);
  const bustedImage = ogImageUrl
    ? ogImageUrl.includes("?")
      ? ogImageUrl.replace(/\?.*$/, `?v=${Date.now()}`)
      : `${ogImageUrl}?v=${Date.now()}`
    : null;
  return {
    facebook: `https://developers.facebook.com/tools/debug/?q=${encodedSite}`,
    linkedin: `https://www.linkedin.com/post-inspector/inspect/${encodedSite}`,
    xCard: "https://cards-dev.twitter.com/validator",
    slackBusted: bustedImage,
  };
}

async function runCheck() {
  console.log(`${C.bold}OG / Twitter drift detector${C.reset}`);
  console.log(`${C.dim}local source · baseline · ${LIVE_URL}${C.reset}\n`);

  const { localImageHash, localMeta } = await readLocalState();
  const baseline = await readBaseline();

  // Live state
  let liveImageHash: string | null = null;
  let liveImageStatus = 0;
  try {
    const r = await fetch(`${LIVE_URL.replace(/\/+$/, "")}/og-image.jpg`, {
      redirect: "follow",
    });
    liveImageStatus = r.status;
    if (r.ok) liveImageHash = await sha256(await r.arrayBuffer());
  } catch (err) {
    console.error(`${C.red}Live image fetch failed:${C.reset}`, err);
  }

  let liveMeta: MetaMap = new Map();
  let liveStatus = 0;
  try {
    const r = await fetch(LIVE_URL, { redirect: "follow" });
    liveStatus = r.status;
    liveMeta = parseHtmlMeta(await r.text());
  } catch (err) {
    console.error(`${C.red}Live HTML fetch failed:${C.reset}`, err);
  }

  // ---- Baseline status ------------------------------------------------------
  console.log(`${C.bold}Baseline${C.reset}`);
  if (!baseline) {
    console.log(
      `  ${C.yellow}● No baseline found.${C.reset} Run ${C.cyan}bun check:og --save${C.reset} after your next successful publish.`,
    );
  } else {
    console.log(`  ${C.dim}savedAt:${C.reset} ${baseline.savedAt}`);
    console.log(`  ${C.dim}for liveUrl:${C.reset} ${baseline.liveUrl}`);
  }

  // ---- og-image -------------------------------------------------------------
  console.log(`\n${C.bold}og-image.jpg${C.reset}`);
  const localVsBaselineImg =
    baseline && baseline.ogImageSha256 !== localImageHash;
  const baselineVsLiveImg =
    baseline &&
    liveImageHash &&
    baseline.ogImageSha256 !== liveImageHash;
  const localVsLiveImg =
    liveImageHash && localImageHash && localImageHash !== liveImageHash;

  const printHash = (label: string, h: string | null) =>
    console.log(`  ${C.dim}${label}:${C.reset} ${h ? h.slice(0, 12) + "…" : C.dim + "(none)" + C.reset}`);
  printHash("local   ", localImageHash);
  if (baseline) printHash("baseline", baseline.ogImageSha256);
  printHash(
    `live    (${liveImageStatus || "?"})`,
    liveImageHash,
  );

  if (baseline && localVsBaselineImg) {
    console.log(`  ${C.yellow}● local differs from baseline — unshipped change.${C.reset}`);
  }
  if (baseline && baselineVsLiveImg) {
    console.log(`  ${C.red}● baseline differs from live — last deploy didn't propagate.${C.reset}`);
  }
  if (!baseline && localVsLiveImg) {
    console.log(`  ${C.yellow}● local differs from live (no baseline to confirm intent).${C.reset}`);
  }
  if (!localVsBaselineImg && !baselineVsLiveImg && !localVsLiveImg) {
    console.log(`  ${C.green}● all aligned${C.reset}`);
  }

  // ---- Meta -----------------------------------------------------------------
  console.log(`\n${C.bold}Meta tags${C.reset} ${C.dim}(live HTTP ${liveStatus || "?"})${C.reset}`);
  const localVsBaselineMeta = baseline
    ? diffMaps(localMeta, baseline.meta)
    : [];
  const baselineVsLiveMeta = baseline
    ? diffMaps(baseline.meta, liveMeta)
    : [];
  const localVsLiveMeta = diffMaps(localMeta, liveMeta);

  const printDiff = (
    label: string,
    rows: Array<{ key: string; a: string | null; b: string | null }>,
    leftLabel: string,
    rightLabel: string,
    color: string,
  ) => {
    if (rows.length === 0) return;
    console.log(`  ${color}● ${label}${C.reset}`);
    for (const d of rows) {
      console.log(`    ${C.bold}${d.key}${C.reset}`);
      console.log(`      ${leftLabel}: ${d.a ?? C.dim + "(missing)" + C.reset}`);
      console.log(`      ${rightLabel}: ${d.b ?? C.dim + "(missing)" + C.reset}`);
    }
  };

  if (baseline) {
    printDiff(
      "local vs baseline — unshipped changes",
      localVsBaselineMeta,
      "local   ",
      "baseline",
      C.yellow,
    );
    printDiff(
      "baseline vs live — deploy didn't propagate",
      baselineVsLiveMeta,
      "baseline",
      "live    ",
      C.red,
    );
  } else {
    printDiff(
      "local vs live (no baseline)",
      localVsLiveMeta,
      "local",
      "live ",
      C.yellow,
    );
  }

  if (
    (baseline ? localVsBaselineMeta.length + baselineVsLiveMeta.length : localVsLiveMeta.length) ===
    0
  ) {
    console.log(`  ${C.green}● all tracked tags aligned${C.reset}`);
  }

  // ---- Revalidation URLs -----------------------------------------------------
  const ogImageUrl =
    (liveMeta.get("og:image") ?? baseline?.meta["og:image"]) || null;
  const revalUrls = buildRevalidationUrls(LIVE_URL, ogImageUrl);

  // ---- Checklist ------------------------------------------------------------
  const todo: string[] = [];
  if (localVsBaselineImg || localVsBaselineMeta.length > 0) {
    todo.push("Publish in Lovable so local changes ship to the live site.");
    todo.push(
      `After publish, run \`bun check:og --save\` to update the baseline.`,
    );
  }
  if (baselineVsLiveImg || baselineVsLiveMeta.length > 0) {
    todo.push(
      "Live site doesn't match the baseline — re-publish, or run --save if the live state is intentional.",
    );
  }
  if (!baseline && localVsLiveImg) {
    todo.push("No baseline saved yet — publish, then run `bun check:og --save`.");
  }

  console.log(`\n${C.bold}Revalidation URLs${C.reset}`);
  console.log(`  ${C.dim}Facebook:${C.reset}  ${revalUrls.facebook}`);
  console.log(`  ${C.dim}LinkedIn:${C.reset}  ${revalUrls.linkedin}`);
  console.log(`  ${C.dim}X Card:${C.reset}    ${revalUrls.xCard} (paste URL)`);
  if (revalUrls.slackBusted) {
    console.log(`  ${C.dim}Slack bust:${C.reset} ${revalUrls.slackBusted}`);
  }

  console.log(`\n${C.bold}Revalidation checklist${C.reset}`);
  if (todo.length === 0) {
    console.log(`  ${C.green}● Nothing to revalidate.${C.reset}`);
  } else {
    todo.forEach((t, i) => {
      console.log(`  ${C.cyan}${String(i + 1).padStart(2, "0")}.${C.reset} ${t}`);
    });
  }

  // Drift = any of the three diffs
  const drift =
    Boolean(localVsBaselineImg) ||
    Boolean(baselineVsLiveImg) ||
    (!baseline && Boolean(localVsLiveImg)) ||
    localVsBaselineMeta.length > 0 ||
    baselineVsLiveMeta.length > 0 ||
    (!baseline && localVsLiveMeta.length > 0);

  if (REPORT_PATH) {
    const md = renderMarkdownReport({
      drift,
      liveUrl: LIVE_URL,
      liveStatus,
      liveImageStatus,
      baseline,
      localImageHash,
      liveImageHash,
      localVsBaselineImg: Boolean(localVsBaselineImg),
      baselineVsLiveImg: Boolean(baselineVsLiveImg),
      localVsLiveImg: Boolean(localVsLiveImg),
      localVsBaselineMeta,
      baselineVsLiveMeta,
      localVsLiveMeta,
      todo,
      revalUrls,
    });
    await mkdir(dirname(resolve(REPORT_PATH)), { recursive: true });
    await writeFile(REPORT_PATH, md);
    console.log(`\n${C.dim}Markdown report written to ${REPORT_PATH}${C.reset}`);
  }

  if (drift) process.exit(2);
}

function shortHash(h: string | null): string {
  return h ? `\`${h.slice(0, 12)}…\`` : "_(none)_";
}

function renderMetaTable(
  rows: Array<{ key: string; a: string | null; b: string | null }>,
  leftLabel: string,
  rightLabel: string,
): string {
  if (rows.length === 0) return "";
  const fmt = (v: string | null) =>
    v === null ? "_(missing)_" : `\`${v.replace(/\|/g, "\\|").slice(0, 120)}\``;
  return [
    `| Tag | ${leftLabel} | ${rightLabel} |`,
    `| --- | --- | --- |`,
    ...rows.map((d) => `| \`${d.key}\` | ${fmt(d.a)} | ${fmt(d.b)} |`),
  ].join("\n");
}

function renderMarkdownReport(r: {
  drift: boolean;
  liveUrl: string;
  liveStatus: number;
  liveImageStatus: number;
  baseline: Baseline | null;
  localImageHash: string | null;
  liveImageHash: string | null;
  localVsBaselineImg: boolean;
  baselineVsLiveImg: boolean;
  localVsLiveImg: boolean;
  localVsBaselineMeta: Array<{ key: string; a: string | null; b: string | null }>;
  baselineVsLiveMeta: Array<{ key: string; a: string | null; b: string | null }>;
  localVsLiveMeta: Array<{ key: string; a: string | null; b: string | null }>;
  todo: string[];
  revalUrls: {
    facebook: string;
    linkedin: string;
    xCard: string;
    slackBusted: string | null;
  };
}): string {
  const status = r.drift ? "❌ **FAIL** — drift detected" : "✅ **PASS** — no drift";
  const lines: string[] = [];
  lines.push(`<!-- og-drift-report -->`);
  lines.push(`## OG / Twitter drift report`);
  lines.push("");
  lines.push(`${status}`);
  lines.push("");
  lines.push(`- **Live URL:** ${r.liveUrl} (HTTP ${r.liveStatus || "?"})`);
  lines.push(
    `- **Baseline:** ${r.baseline ? `\`${r.baseline.savedAt}\`` : "_none saved_"}`,
  );
  lines.push("");
  lines.push(`### og-image.jpg`);
  lines.push("");
  lines.push(`| Source | SHA-256 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| local | ${shortHash(r.localImageHash)} |`);
  if (r.baseline) lines.push(`| baseline | ${shortHash(r.baseline.ogImageSha256)} |`);
  lines.push(`| live (HTTP ${r.liveImageStatus || "?"}) | ${shortHash(r.liveImageHash)} |`);
  lines.push("");
  const imgNotes: string[] = [];
  if (r.baseline && r.localVsBaselineImg)
    imgNotes.push("🟡 local differs from baseline — unshipped change.");
  if (r.baseline && r.baselineVsLiveImg)
    imgNotes.push("🔴 baseline differs from live — last deploy didn't propagate.");
  if (!r.baseline && r.localVsLiveImg)
    imgNotes.push("🟡 local differs from live (no baseline to confirm intent).");
  if (imgNotes.length === 0) imgNotes.push("🟢 all aligned");
  lines.push(imgNotes.map((n) => `- ${n}`).join("\n"));
  lines.push("");
  lines.push(`### Meta tags`);
  lines.push("");
  if (r.baseline) {
    if (r.localVsBaselineMeta.length > 0) {
      lines.push(`**🟡 Local vs baseline — unshipped changes**`);
      lines.push("");
      lines.push(renderMetaTable(r.localVsBaselineMeta, "local", "baseline"));
      lines.push("");
    }
    if (r.baselineVsLiveMeta.length > 0) {
      lines.push(`**🔴 Baseline vs live — deploy didn't propagate**`);
      lines.push("");
      lines.push(renderMetaTable(r.baselineVsLiveMeta, "baseline", "live"));
      lines.push("");
    }
    if (r.localVsBaselineMeta.length + r.baselineVsLiveMeta.length === 0) {
      lines.push(`🟢 all tracked tags aligned`);
      lines.push("");
    }
  } else if (r.localVsLiveMeta.length > 0) {
    lines.push(`**🟡 Local vs live (no baseline)**`);
    lines.push("");
    lines.push(renderMetaTable(r.localVsLiveMeta, "local", "live"));
    lines.push("");
  } else {
    lines.push(`🟢 all tracked tags aligned`);
    lines.push("");
  }
  lines.push(`### Revalidation URLs`);
  lines.push("");
  lines.push(`| Platform | URL |`);
  lines.push(`| --- | --- |`);
  lines.push(`| **Facebook Debugger** | <${r.revalUrls.facebook}> |`);
  lines.push(`| **LinkedIn Inspector** | <${r.revalUrls.linkedin}> |`);
  lines.push(`| **X Card Validator** | <${r.revalUrls.xCard}> (paste URL + hit Preview) |`);
  if (r.revalUrls.slackBusted) {
    lines.push(`| **Slack (busted OG image)** | \`${r.revalUrls.slackBusted}\` |`);
  }
  lines.push("");
  lines.push(`### Revalidation checklist`);
  lines.push("");
  if (r.todo.length === 0) {
    lines.push(`- [x] Nothing to revalidate — safe to publish.`);
  } else {
    for (const t of r.todo) lines.push(`- [ ] ${t}`);
  }
  lines.push("");
  lines.push(
    `<sub>Generated by \`scripts/check-og-changes.ts\` · ${new Date().toISOString()}</sub>`,
  );
  return lines.join("\n") + "\n";
}

async function main() {
  if (SAVE_MODE) {
    await saveBaseline();
  } else {
    await runCheck();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
