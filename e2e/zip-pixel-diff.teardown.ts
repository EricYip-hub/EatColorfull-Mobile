import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

/**
 * Playwright global teardown: bundle every pixel-diff artifact produced
 * during the run (per-scenario light.png / dark.png / diff.png /
 * side-by-side.png written by `e2e/share-card-pixel-diff.spec.ts`) into a
 * single ZIP at `test-results/pixel-diff-overlays.zip` so reviewers can
 * download and share failures with a single link instead of digging
 * through nested per-test folders.
 *
 * No-op when the pixel-diff spec wrote nothing (all tests passed without
 * generating artifacts, or the spec didn't run).
 */
export default async function globalTeardown() {
  const root = path.resolve("test-results", "pixel-diff");
  if (!fs.existsSync(root)) return;

  const zip = new AdmZip();
  let count = 0;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".png")) {
        zip.addLocalFile(full, path.relative(root, path.dirname(full)));
        count++;
      }
    }
  };
  walk(root);

  if (count === 0) return;

  const outPath = path.resolve("test-results", "pixel-diff-overlays.zip");
  zip.writeZip(outPath);
  // eslint-disable-next-line no-console
  console.log(
    `\n[pixel-diff] Bundled ${count} overlay PNG(s) → ${outPath}\n` +
      `  Share this single file to review every light/dark/diff/side-by-side artifact.`,
  );
}
