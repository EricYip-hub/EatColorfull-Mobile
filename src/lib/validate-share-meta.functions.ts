import { createServerFn } from "@tanstack/react-start";

export type ValidationCheck = {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  expected?: string;
  actual?: string | null;
};

export type ValidationResult = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  passed: number;
  failed: number;
  warned: number;
  checks: ValidationCheck[];
};

const REQUIRED_TWITTER_CARD = "summary_large_image";
const MIN_OG_IMAGE_BYTES = 5_000; // < 5KB is almost certainly broken/placeholder
const MAX_OG_IMAGE_BYTES = 8_000_000; // Facebook hard limit ~8MB
const TITLE_MAX = 60;
const DESC_MAX = 200;

function pass(id: string, label: string, detail: string, actual?: string): ValidationCheck {
  return { id, label, status: "pass", detail, actual };
}
function fail(
  id: string,
  label: string,
  detail: string,
  expected?: string,
  actual?: string | null,
): ValidationCheck {
  return { id, label, status: "fail", detail, expected, actual };
}
function warn(
  id: string,
  label: string,
  detail: string,
  actual?: string | null,
): ValidationCheck {
  return { id, label, status: "warn", detail, actual };
}

function parseMeta(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const nameMatch = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    map.set(nameMatch[1].toLowerCase(), contentMatch[1]);
  }
  return map;
}

async function headSafe(url: string): Promise<{ status: number; size: number | null; type: string | null }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
    });
    const size = Number(res.headers.get("content-range")?.split("/")?.[1] ?? res.headers.get("content-length") ?? "");
    return {
      status: res.status,
      size: Number.isFinite(size) && size > 0 ? size : null,
      type: res.headers.get("content-type"),
    };
  } catch {
    return { status: 0, size: null, type: null };
  }
}

export const validateShareMeta = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url) throw new Error("URL is required");
    const parsed = new URL(data.url);
    if (!["http:", "https:"].includes(parsed.protocol))
      throw new Error("Only http(s) URLs are allowed");
    return { url: parsed.toString() };
  })
  .handler(async ({ data }): Promise<ValidationResult> => {
    const checks: ValidationCheck[] = [];

    const res = await fetch(data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ColorfullMetaValidator/1.0; +https://eatcolorfull.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const finalUrl = res.url || data.url;

    if (!res.ok) {
      checks.push(
        fail("fetch", "Live page reachable", `Live URL returned HTTP ${res.status}.`, "200", String(res.status)),
      );
      return summarize(data.url, finalUrl, checks);
    }
    checks.push(pass("fetch", "Live page reachable", `HTTP ${res.status} from ${finalUrl}.`));

    const html = await res.text();
    const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[1] : html;
    const meta = parseMeta(head);

    // og:title
    const ogTitle = meta.get("og:title");
    if (!ogTitle) checks.push(fail("og:title", "og:title present", "Missing og:title meta tag."));
    else if (ogTitle.length > TITLE_MAX)
      checks.push(
        warn("og:title", "og:title length", `Titles over ${TITLE_MAX} chars get truncated.`, ogTitle),
      );
    else checks.push(pass("og:title", "og:title present", `${ogTitle.length} chars.`, ogTitle));

    // og:description
    const ogDesc = meta.get("og:description");
    if (!ogDesc)
      checks.push(fail("og:description", "og:description present", "Missing og:description meta tag."));
    else if (ogDesc.length > DESC_MAX)
      checks.push(
        warn(
          "og:description",
          "og:description length",
          `Descriptions over ${DESC_MAX} chars get truncated.`,
          ogDesc,
        ),
      );
    else
      checks.push(
        pass("og:description", "og:description present", `${ogDesc.length} chars.`, ogDesc),
      );

    // og:type
    const ogType = meta.get("og:type");
    if (!ogType) checks.push(warn("og:type", "og:type present", "Missing og:type (defaults to website).", null));
    else checks.push(pass("og:type", "og:type present", ogType, ogType));

    // og:image
    const ogImage = meta.get("og:image");
    if (!ogImage) {
      checks.push(fail("og:image", "og:image present", "Missing og:image meta tag."));
    } else if (!/^https?:\/\//i.test(ogImage)) {
      checks.push(
        fail(
          "og:image",
          "og:image is absolute URL",
          "og:image must be an absolute https URL — relative paths fail on most scrapers.",
          "https://...",
          ogImage,
        ),
      );
    } else {
      checks.push(pass("og:image", "og:image is absolute URL", "Absolute https URL.", ogImage));

      const imgRes = await headSafe(ogImage);
      if (imgRes.status === 0 || imgRes.status >= 400) {
        checks.push(
          fail(
            "og:image.fetch",
            "og:image fetches successfully",
            `Image URL returned HTTP ${imgRes.status || "error"}.`,
            "200",
            String(imgRes.status),
          ),
        );
      } else {
        checks.push(
          pass("og:image.fetch", "og:image fetches successfully", `HTTP ${imgRes.status}.`),
        );

        if (imgRes.type && !/^image\//i.test(imgRes.type)) {
          checks.push(
            fail(
              "og:image.type",
              "og:image content-type is image/*",
              `Got ${imgRes.type}.`,
              "image/*",
              imgRes.type,
            ),
          );
        } else if (imgRes.type) {
          checks.push(
            pass("og:image.type", "og:image content-type is image/*", imgRes.type, imgRes.type),
          );
        }

        if (imgRes.size != null) {
          if (imgRes.size < MIN_OG_IMAGE_BYTES) {
            checks.push(
              warn(
                "og:image.size",
                "og:image size sane",
                `Only ${formatBytes(imgRes.size)} — likely a placeholder.`,
                formatBytes(imgRes.size),
              ),
            );
          } else if (imgRes.size > MAX_OG_IMAGE_BYTES) {
            checks.push(
              fail(
                "og:image.size",
                "og:image size under 8MB",
                `Facebook rejects images over 8MB.`,
                "< 8MB",
                formatBytes(imgRes.size),
              ),
            );
          } else {
            checks.push(
              pass(
                "og:image.size",
                "og:image size sane",
                formatBytes(imgRes.size),
                formatBytes(imgRes.size),
              ),
            );
          }
        }
      }

      // og:image dimensions hints
      const w = Number(meta.get("og:image:width") ?? "");
      const h = Number(meta.get("og:image:height") ?? "");
      if (!w || !h) {
        checks.push(
          warn(
            "og:image.dims",
            "og:image:width/height declared",
            "Declaring dimensions speeds up first-time renders on Facebook & LinkedIn.",
          ),
        );
      } else if (w < 600 || h < 315) {
        checks.push(
          warn(
            "og:image.dims",
            "og:image dimensions ≥ 1200×630",
            `${w}×${h} is below Facebook's recommended minimum.`,
            `${w}×${h}`,
          ),
        );
      } else {
        checks.push(
          pass(
            "og:image.dims",
            "og:image dimensions declared",
            `${w}×${h}`,
            `${w}×${h}`,
          ),
        );
      }
    }

    // twitter:card
    const twCard = meta.get("twitter:card");
    if (twCard !== REQUIRED_TWITTER_CARD) {
      checks.push(
        fail(
          "twitter:card",
          "twitter:card = summary_large_image",
          "X uses summary_large_image for full-bleed previews.",
          REQUIRED_TWITTER_CARD,
          twCard ?? null,
        ),
      );
    } else {
      checks.push(pass("twitter:card", "twitter:card = summary_large_image", twCard, twCard));
    }

    // twitter:title
    const twTitle = meta.get("twitter:title");
    if (!twTitle)
      checks.push(fail("twitter:title", "twitter:title present", "Missing twitter:title."));
    else checks.push(pass("twitter:title", "twitter:title present", twTitle, twTitle));

    // twitter:description
    const twDesc = meta.get("twitter:description");
    if (!twDesc)
      checks.push(
        fail("twitter:description", "twitter:description present", "Missing twitter:description."),
      );
    else
      checks.push(
        pass("twitter:description", "twitter:description present", `${twDesc.length} chars.`, twDesc),
      );

    // twitter:image
    const twImage = meta.get("twitter:image");
    if (!twImage) {
      checks.push(fail("twitter:image", "twitter:image present", "Missing twitter:image."));
    } else if (!/^https?:\/\//i.test(twImage)) {
      checks.push(
        fail(
          "twitter:image",
          "twitter:image is absolute URL",
          "twitter:image must be an absolute https URL.",
          "https://...",
          twImage,
        ),
      );
    } else {
      checks.push(
        pass("twitter:image", "twitter:image is absolute URL", "Absolute https URL.", twImage),
      );
      // If twitter:image differs from og:image, fetch it too
      if (twImage !== ogImage) {
        const tw = await headSafe(twImage);
        if (tw.status === 0 || tw.status >= 400) {
          checks.push(
            fail(
              "twitter:image.fetch",
              "twitter:image fetches successfully",
              `Returned HTTP ${tw.status || "error"}.`,
              "200",
              String(tw.status),
            ),
          );
        } else {
          checks.push(
            pass(
              "twitter:image.fetch",
              "twitter:image fetches successfully",
              `HTTP ${tw.status}.`,
            ),
          );
        }
      }
    }

    return summarize(data.url, finalUrl, checks);
  });

function summarize(url: string, finalUrl: string, checks: ValidationCheck[]): ValidationResult {
  let passed = 0,
    failed = 0,
    warned = 0;
  for (const c of checks) {
    if (c.status === "pass") passed++;
    else if (c.status === "fail") failed++;
    else warned++;
  }
  return {
    url,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    passed,
    failed,
    warned,
    checks,
  };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
