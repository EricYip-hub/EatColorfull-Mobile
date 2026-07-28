import { AxeResults } from "axe-core";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "test-results", "axe");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function violationToHtml(v: AxeResults["violations"][number]): string {
  const nodesHtml = v.nodes
    .map((n) => {
      const target = n.target.join(", ");
      const html = escapeHtml(n.html);
      const failure = escapeHtml(n.failureSummary || "");
      return `
        <li>
          <p><strong>Target:</strong> <code>${escapeHtml(target)}</code></p>
          <p><strong>HTML:</strong> <code>${html}</code></p>
          ${failure ? `<p><strong>Failure Summary:</strong> ${failure.replace(/\n/g, "<br>")}</p>` : ""}
        </li>`;
    })
    .join("");

  return `
    <div class="violation">
      <h3>${escapeHtml(v.id)} — ${escapeHtml(v.description)} (${v.impact})</h3>
      <p><strong>Help:</strong> <a href="${escapeHtml(v.helpUrl)}" target="_blank">${escapeHtml(v.helpUrl)}</a></p>
      <p><strong>Tags:</strong> ${v.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</p>
      <ul>${nodesHtml}</ul>
    </div>`;
}

export function saveAxeReport(
  results: AxeResults,
  fileBaseName: string,
): void {
  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, `${fileBaseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");

  const violationCount = results.violations.length;
  const violationsHtml =
    violationCount === 0
      ? '<p class="pass">✅ No violations detected.</p>'
      : results.violations.map(violationToHtml).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>axe Report — ${escapeHtml(fileBaseName)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #111; background: #fff; }
    h1, h2, h3 { color: #0f172a; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .meta p { margin: 0.25rem 0; }
    .pass { color: #15803d; font-weight: 600; }
    .violation { background: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .violation h3 { margin-top: 0; color: #991b1b; }
    .tag { display: inline-block; background: #e2e8f0; color: #334155; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.3rem; }
    code { background: #f1f5f9; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.9rem; }
    ul { padding-left: 1.2rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>axe Accessibility Report</h1>
  <div class="meta">
    <p><strong>Test:</strong> ${escapeHtml(fileBaseName)}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Violations:</strong> ${violationCount}</p>
    <p><strong>Passes:</strong> ${results.passes.length}</p>
    <p><strong>Incomplete:</strong> ${results.incomplete.length}</p>
    <p><strong>Inapplicable:</strong> ${results.inapplicable.length}</p>
  </div>
  <h2>Violations</h2>
  ${violationsHtml}
</body>
</html>`;

  const htmlPath = path.join(OUT_DIR, `${fileBaseName}.html`);
  fs.writeFileSync(htmlPath, html, "utf-8");
}
