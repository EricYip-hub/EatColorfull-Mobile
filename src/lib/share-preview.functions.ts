import { createServerFn } from "@tanstack/react-start";

export type MetaTag = { key: string; value: string };

export type SharePreviewResult = {
  url: string;
  finalUrl: string;
  status: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  og: MetaTag[];
  twitter: MetaTag[];
  other: MetaTag[];
};

function extractTag(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? decodeEntities(m[1].trim()) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseMetaTags(html: string): {
  og: MetaTag[];
  twitter: MetaTag[];
  other: MetaTag[];
} {
  const og: MetaTag[] = [];
  const twitter: MetaTag[] = [];
  const other: MetaTag[] = [];
  const metaRegex = /<meta\b[^>]*>/gi;
  const tags = html.match(metaRegex) || [];
  for (const tag of tags) {
    const nameMatch = tag.match(/\b(?:name|property|itemprop)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    const key = nameMatch[1].toLowerCase();
    const value = decodeEntities(contentMatch[1]);
    if (key.startsWith("og:")) og.push({ key, value });
    else if (key.startsWith("twitter:")) twitter.push({ key, value });
    else if (
      ["description", "keywords", "author", "robots", "viewport", "theme-color"].includes(key)
    )
      other.push({ key, value });
  }
  return { og, twitter, other };
}

export const fetchSharePreview = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") throw new Error("URL is required");
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      throw new Error("Invalid URL");
    }
    if (!["http:", "https:"].includes(parsed.protocol))
      throw new Error("Only http(s) URLs are allowed");
    return { url: parsed.toString() };
  })
  .handler(async ({ data }): Promise<SharePreviewResult> => {
    const res = await fetch(data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ColorfullSharePreviewBot/1.0; +https://eatcolorfull.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = await res.text();
    const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[1] : html;
    const title = extractTag(head, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const { og, twitter, other } = parseMetaTags(head);
    const description = other.find((t) => t.key === "description")?.value ?? null;
    const canonical = (() => {
      const m = head.match(
        /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i,
      );
      return m ? decodeEntities(m[1]) : null;
    })();
    return {
      url: data.url,
      finalUrl: res.url || data.url,
      status: res.status,
      title,
      description,
      canonical,
      og,
      twitter,
      other,
    };
  });
