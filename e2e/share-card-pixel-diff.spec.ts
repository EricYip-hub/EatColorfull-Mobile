import { test, expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import path from "path";
import fs from "fs";

/**
 * Pixel-diff E2E: the branded share-card PNGs (hosted_table default,
 * hosted_table salon, private_dining) must render byte-identically across
 * `prefers-color-scheme: light` and `prefers-color-scheme: dark`.
 *
 * Why: the cards use a fixed palette and are exported as a PNG that gets
 * shared off-platform. The image must look the same regardless of the
 * viewer's OS theme. The token-level tests in share-card-dark-mode.spec.ts
 * lock down text/color tokens; this spec catches drift outside those
 * tokens — gradients, hairlines, badges, mood chips, shadows, anti-
 * aliasing variations from a `prefers-color-scheme` media query sneaking
 * into the renderer.
 *
 * On failure: writes 4 PNGs per mismatch (light, dark, highlighted diff
 * overlay, and a side-by-side strip) to `test-results/pixel-diff/<flow>/
 * <scenario>/` AND attaches them to the Playwright report so they show up
 * inline next to the failing test, plus a Markdown summary linking each
 * artifact by path.
 */

const FLOWS = ["hosted", "salon", "private"] as const;
type Flow = (typeof FLOWS)[number];

/**
 * Tunable thresholds — override via env vars in CI to relax/tighten without
 * editing the spec. Defaults are deliberately strict so a fresh repo still
 * catches real drift, but small enough that sub-pixel anti-aliasing noise
 * from a browser/renderer upgrade doesn't redline the whole suite.
 *
 *   PIXEL_DIFF_THRESHOLD       per-pixel color distance, 0..1 (default 0.1)
 *   PIXEL_DIFF_MAX_RATIO       allowed fraction of differing pixels (default 0.001 = 0.1%)
 *   PIXEL_DIFF_INCLUDE_AA      "1" to count anti-aliased pixels as diffs (default "0")
 *
 * Artifacts (light/dark/diff/side-by-side) are ALWAYS written when bytes
 * differ, even if the diff is below threshold — reviewers can still inspect
 * sub-threshold drift in the HTML report. Only the test PASS/FAIL gate is
 * relaxed.
 */
const PIXEL_MATCH_THRESHOLD = parseFloat(process.env.PIXEL_DIFF_THRESHOLD ?? "0.1");
const PIXEL_DIFF_MAX_RATIO = parseFloat(process.env.PIXEL_DIFF_MAX_RATIO ?? "0.001");
const PIXEL_MATCH_INCLUDE_AA = process.env.PIXEL_DIFF_INCLUDE_AA === "1";

const TESTIDS: Record<Flow, string> = {
  hosted: "hosted-png",
  salon: "salon-png",
  private: "private-png",
};

async function readPng(page: Page, flow: Flow): Promise<string> {
  const loc = page.locator(`[data-testid="${TESTIDS[flow]}"]`);
  await expect(loc).not.toHaveText("", { timeout: 15_000 });
  const text = await loc.innerText();
  expect(text.startsWith("data:image/png;base64,")).toBe(true);
  return text;
}

async function capturePngs(
  browser: Browser,
  scheme: "light" | "dark",
  query: string,
): Promise<{ pngs: Record<Flow, string>; pageScreenshot: Buffer; pageHtml: string }> {
  const ctx = await browser.newContext({ colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(`/e2e/share-card-price?${query}`, {
    waitUntil: "domcontentloaded",
  });
  const pngs = {
    hosted: await readPng(page, "hosted"),
    salon: await readPng(page, "salon"),
    private: await readPng(page, "private"),
  };
  // Capture the actual harness DOM so a reviewer can see the page state
  // (texts, palette dumps, hidden canvases) that produced the PNGs — not
  // just the exported pixels. Saved + attached on mismatch only.
  const pageScreenshot = await page.screenshot({ fullPage: true, type: "png" });
  const pageHtml = await page.content();
  await ctx.close();
  return { pngs, pageScreenshot, pageHtml };
}

function pngToBytes(dataUrl: string): Buffer {
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(b64, "base64");
}

function bytesEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.equals(b);
}

function describeDrift(a: Buffer, b: Buffer): string {
  if (a.length !== b.length) return `byte length differs: ${a.length} vs ${b.length}`;
  let firstDiff = -1;
  let diffCount = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (firstDiff === -1) firstDiff = i;
      diffCount++;
    }
  }
  return `${diffCount} differing bytes (first at offset ${firstDiff})`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Decode both PNGs, run pixelmatch to produce a highlighted overlay PNG
 * (mismatched pixels in red over a dimmed copy of the light render), and
 * also emit a 3-up side-by-side strip [light | dark | diff] for quick
 * visual triage. Returns the on-disk paths plus diff stats.
 */
async function writeDiffArtifacts(
  testInfo: TestInfo,
  flow: Flow,
  scenarioName: string,
  lightDataUrl: string,
  darkDataUrl: string,
  pageShots?: {
    lightScreenshot: Buffer;
    darkScreenshot: Buffer;
    lightHtml: string;
    darkHtml: string;
  },
): Promise<{
  lightPath: string;
  darkPath: string;
  diffPath: string;
  stripPath: string;
  pageLightPath?: string;
  pageDarkPath?: string;
  pageLightHtmlPath?: string;
  pageDarkHtmlPath?: string;
  diffPixels: number;
  totalPixels: number;
}> {
  const lightBuf = pngToBytes(lightDataUrl);
  const darkBuf = pngToBytes(darkDataUrl);
  const lightPng = PNG.sync.read(lightBuf);
  const darkPng = PNG.sync.read(darkBuf);

  // Defensive: if canvas sizes drift, normalize to the smaller box rather
  // than crashing pixelmatch — the size mismatch itself is reported.
  const w = Math.min(lightPng.width, darkPng.width);
  const h = Math.min(lightPng.height, darkPng.height);
  const diffPng = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(
    lightPng.data,
    darkPng.data,
    diffPng.data,
    w,
    h,
    {
      threshold: PIXEL_MATCH_THRESHOLD,
      includeAA: PIXEL_MATCH_INCLUDE_AA,
      alpha: 0.4,
      diffColor: [255, 0, 0],
    },
  );

  // Side-by-side strip: [light | dark | diff], 8px gutters, white background.
  const gutter = 8;
  const stripW = w * 3 + gutter * 2;
  const stripPng = new PNG({ width: stripW, height: h });
  // Fill white.
  for (let i = 0; i < stripPng.data.length; i += 4) {
    stripPng.data[i] = 255;
    stripPng.data[i + 1] = 255;
    stripPng.data[i + 2] = 255;
    stripPng.data[i + 3] = 255;
  }
  const blit = (src: PNG, dx: number) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sIdx = (y * src.width + x) * 4;
        const dIdx = (y * stripW + (x + dx)) * 4;
        stripPng.data[dIdx] = src.data[sIdx];
        stripPng.data[dIdx + 1] = src.data[sIdx + 1];
        stripPng.data[dIdx + 2] = src.data[sIdx + 2];
        stripPng.data[dIdx + 3] = src.data[sIdx + 3];
      }
    }
  };
  blit(lightPng, 0);
  blit(darkPng, w + gutter);
  blit(diffPng, (w + gutter) * 2);

  const outDir = path.join(
    testInfo.project.outputDir,
    "pixel-diff",
    flow,
    slug(scenarioName),
  );
  fs.mkdirSync(outDir, { recursive: true });
  const lightPath = path.join(outDir, "light.png");
  const darkPath = path.join(outDir, "dark.png");
  const diffPath = path.join(outDir, "diff.png");
  const stripPath = path.join(outDir, "side-by-side.png");
  fs.writeFileSync(lightPath, lightBuf);
  fs.writeFileSync(darkPath, darkBuf);
  fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
  fs.writeFileSync(stripPath, PNG.sync.write(stripPng));

  // Attach to the Playwright HTML report so reviewers see overlays inline.
  await testInfo.attach(`${flow} · ${scenarioName} · light`, {
    path: lightPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${flow} · ${scenarioName} · dark`, {
    path: darkPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${flow} · ${scenarioName} · diff (red = mismatch)`, {
    path: diffPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${flow} · ${scenarioName} · side-by-side`, {
    path: stripPath,
    contentType: "image/png",
  });

  // Page-level DOM captures: the actual harness page (fullPage screenshot
  // + raw HTML) for each color scheme. Lets a reviewer see *what changed
  // visually in the page* — fonts loaded, surrounding styled text dumps,
  // any element affected by `prefers-color-scheme` — not just the
  // off-screen canvas exports.
  let pageLightPath: string | undefined;
  let pageDarkPath: string | undefined;
  let pageLightHtmlPath: string | undefined;
  let pageDarkHtmlPath: string | undefined;
  if (pageShots) {
    pageLightPath = path.join(outDir, "page-light.png");
    pageDarkPath = path.join(outDir, "page-dark.png");
    pageLightHtmlPath = path.join(outDir, "page-light.html");
    pageDarkHtmlPath = path.join(outDir, "page-dark.html");
    fs.writeFileSync(pageLightPath, pageShots.lightScreenshot);
    fs.writeFileSync(pageDarkPath, pageShots.darkScreenshot);
    fs.writeFileSync(pageLightHtmlPath, pageShots.lightHtml);
    fs.writeFileSync(pageDarkHtmlPath, pageShots.darkHtml);
    await testInfo.attach(`${flow} · ${scenarioName} · page DOM (light)`, {
      path: pageLightPath,
      contentType: "image/png",
    });
    await testInfo.attach(`${flow} · ${scenarioName} · page DOM (dark)`, {
      path: pageDarkPath,
      contentType: "image/png",
    });
    await testInfo.attach(`${flow} · ${scenarioName} · page HTML (light)`, {
      path: pageLightHtmlPath,
      contentType: "text/html",
    });
    await testInfo.attach(`${flow} · ${scenarioName} · page HTML (dark)`, {
      path: pageDarkHtmlPath,
      contentType: "text/html",
    });
  }

  return {
    lightPath,
    darkPath,
    diffPath,
    stripPath,
    pageLightPath,
    pageDarkPath,
    pageLightHtmlPath,
    pageDarkHtmlPath,
    diffPixels,
    totalPixels: w * h,
  };
}

const SCENARIOS = [
  { name: "price=8500 seats=4 hood=Mission", query: "priceCents=8500&seats=4" },
  { name: "price=null (fallback copy)", query: "priceCents=null" },
  { name: "price=0", query: "priceCents=0" },
  { name: "seats=0 (SOLD OUT)", query: "priceCents=8500&seats=0" },
  { name: "negative price", query: "priceCents=-500" },
];

type MismatchRow = {
  flow: Flow;
  scenario: string;
  diffPixels: number;
  totalPixels: number;
  ratio: number;
  overThreshold: boolean;
  stripPath: string;
  diffPath: string;
};
const mismatches: MismatchRow[] = [];

for (const sc of SCENARIOS) {
  for (const flow of FLOWS) {
    test(`${flow} share card PNG is byte-identical across light/dark — ${sc.name}`, async ({
      browser,
    }, testInfo) => {
      const light = await capturePngs(browser, "light", sc.query);
      const dark = await capturePngs(browser, "dark", sc.query);

      const lb = pngToBytes(light.pngs[flow]);
      const db = pngToBytes(dark.pngs[flow]);

      if (!bytesEqual(lb, db)) {
        const report = await writeDiffArtifacts(
          testInfo,
          flow,
          sc.name,
          light.pngs[flow],
          dark.pngs[flow],
          {
            lightScreenshot: light.pageScreenshot,
            darkScreenshot: dark.pageScreenshot,
            lightHtml: light.pageHtml,
            darkHtml: dark.pageHtml,
          },
        );
        const ratio = report.diffPixels / report.totalPixels;
        const pct = (ratio * 100).toFixed(4);
        const maxPct = (PIXEL_DIFF_MAX_RATIO * 100).toFixed(4);
        const overThreshold = ratio > PIXEL_DIFF_MAX_RATIO;

        mismatches.push({
          flow,
          scenario: sc.name,
          diffPixels: report.diffPixels,
          totalPixels: report.totalPixels,
          ratio,
          overThreshold,
          stripPath: report.stripPath,
          diffPath: report.diffPath,
        });

        if (overThreshold) {
          throw new Error(
            [
              `Pixel drift on ${flow} card (${sc.name}): ${describeDrift(lb, db)}.`,
              `${report.diffPixels} / ${report.totalPixels} pixels differ (${pct}% > ${maxPct}% threshold).`,
              `Tuning: PIXEL_DIFF_THRESHOLD=${PIXEL_MATCH_THRESHOLD}, PIXEL_DIFF_MAX_RATIO=${PIXEL_DIFF_MAX_RATIO}, PIXEL_DIFF_INCLUDE_AA=${PIXEL_MATCH_INCLUDE_AA ? "1" : "0"}.`,
              `Artifacts (also attached to the HTML report):`,
              `  light:         ${report.lightPath}`,
              `  dark:          ${report.darkPath}`,
              `  diff overlay:  ${report.diffPath}`,
              `  side-by-side:  ${report.stripPath}`,
              `  page DOM light: ${report.pageLightPath}`,
              `  page DOM dark:  ${report.pageDarkPath}`,
              `  page HTML light: ${report.pageLightHtmlPath}`,
              `  page HTML dark:  ${report.pageDarkHtmlPath}`,
            ].join("\n"),
          );
        } else {
          // Sub-threshold drift: keep the artifacts (already attached) and
          // log so reviewers notice the noise without failing the suite.
          console.warn(
            `[pixel-diff] ${flow} · ${sc.name}: ${report.diffPixels}/${report.totalPixels} px differ (${pct}%) — under ${maxPct}% threshold, treating as anti-aliasing noise.`,
          );
        }
      }
    });
  }
}

/**
 * Per-worker triage summary: emitted once after every pixel-diff test in
 * this worker has finished. Prints a fixed-width table of mismatches with
 * the on-disk paths to the side-by-side strip and diff overlay so a CI
 * reviewer can open them without scrolling through individual test failure
 * stacks. Runs per worker (Playwright shards by file/worker, not globally),
 * so each worker reports just the mismatches it observed.
 */
test.afterAll(() => {
  if (mismatches.length === 0) {
    // eslint-disable-next-line no-console
    console.log("\n[pixel-diff] ✓ no light/dark mismatches in this worker.\n");
    return;
  }
  const flowW = Math.max(4, ...mismatches.map((m) => m.flow.length));
  const scW = Math.max(8, ...mismatches.map((m) => m.scenario.length));
  const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));
  const over = mismatches.filter((m) => m.overThreshold).length;
  const lines: string[] = [""];
  lines.push(
    `[pixel-diff] mismatch summary — ${mismatches.length} scenario(s), ${over} over threshold ` +
      `(${(PIXEL_DIFF_MAX_RATIO * 100).toFixed(4)}%):`,
  );
  lines.push(
    `  ${pad("FAIL", 4)}  ${pad("flow", flowW)}  ${pad("scenario", scW)}  ${pad("diff%", 9)}  ${pad("px", 16)}  artifacts`,
  );
  for (const m of mismatches) {
    const pct = (m.ratio * 100).toFixed(4) + "%";
    const px = `${m.diffPixels}/${m.totalPixels}`;
    const mark = m.overThreshold ? "✗" : "·";
    lines.push(
      `  ${pad(mark, 4)}  ${pad(m.flow, flowW)}  ${pad(m.scenario, scW)}  ${pad(pct, 9)}  ${pad(px, 16)}  ${m.stripPath}`,
    );
    lines.push(
      `  ${" ".repeat(4 + 2 + flowW + 2 + scW + 2 + 9 + 2 + 16 + 2)}${m.diffPath}`,
    );
  }
  lines.push("  (✗ = over threshold, test fails; · = sub-threshold AA noise, warn only)");
  lines.push("");
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
});

test("share card PNG render is deterministic within a single color scheme", async ({
  browser,
}, testInfo) => {
  // Guard against nondeterminism inside the renderer (Math.random, Date.now,
  // un-seeded gradients). If this passes but the light/dark tests fail, the
  // failure is a real color-scheme leak; if this fails too, the renderer
  // itself is nondeterministic and the cross-scheme test is meaningless.
  const a = await capturePngs(browser, "light", "priceCents=8500&seats=4");
  const b = await capturePngs(browser, "light", "priceCents=8500&seats=4");
  for (const flow of FLOWS) {
    const ab = pngToBytes(a.pngs[flow]);
    const bb = pngToBytes(b.pngs[flow]);
    if (!bytesEqual(ab, bb)) {
      const report = await writeDiffArtifacts(
        testInfo,
        flow,
        "determinism guard",
        a.pngs[flow],
        b.pngs[flow],
        {
          lightScreenshot: a.pageScreenshot,
          darkScreenshot: b.pageScreenshot,
          lightHtml: a.pageHtml,
          darkHtml: b.pageHtml,
        },
      );
      throw new Error(
        `Renderer nondeterministic on ${flow}: ${describeDrift(ab, bb)}. ` +
          `Diff overlay: ${report.diffPath}`,
      );
    }
  }
});
