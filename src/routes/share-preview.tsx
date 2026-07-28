import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { fetchSharePreview, type SharePreviewResult, type MetaTag } from "@/lib/share-preview.functions";
import { PublishChecklist } from "@/components/site/PublishChecklist";
import { MetaValidator } from "@/components/site/MetaValidator";

export const Route = createFileRoute("/share-preview")({
  head: () => ({
    meta: [
      { title: "Share Preview Tester — Colorfull" },
      {
        name: "description",
        content:
          "Inspect the Open Graph and Twitter Card metadata used to render link previews for any URL.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePreviewPage,
});

function SharePreviewPage() {
  const fetchPreview = useServerFn(fetchSharePreview);
  const [url, setUrl] = useState("https://eatcolorfull.com");
  const [data, setData] = useState<SharePreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await fetchPreview({ data: { url } });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch preview");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const ogImage = data?.og.find((t) => t.key === "og:image")?.value;
  const ogTitle = data?.og.find((t) => t.key === "og:title")?.value ?? data?.title;
  const ogDesc =
    data?.og.find((t) => t.key === "og:description")?.value ?? data?.description;
  const twImage = data?.twitter.find((t) => t.key === "twitter:image")?.value;

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Tools</p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl">Share Preview Tester</h1>
      <p className="mt-4 text-muted-foreground">
        Enter any URL to inspect the Open Graph and Twitter Card metadata used by
        iMessage, Slack, WhatsApp, Facebook, X, and LinkedIn for link previews.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Fetching…" : "Inspect"}
        </button>
      </form>

      <div className="mt-10">
        <MetaValidator defaultUrl={url} />
      </div>

      <div className="mt-10">
        <PublishChecklist url={url} />
      </div>


      {error && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-10 space-y-10">
          <div className="text-sm text-muted-foreground">
            HTTP {data.status} · Final URL:{" "}
            <a
              href={data.finalUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {data.finalUrl}
            </a>
          </div>

          <div>
            <h2 className="text-lg font-medium">Preview card</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              {ogImage && (
                <img
                  src={ogImage}
                  alt="og:image"
                  className="aspect-[1.91/1] w-full bg-muted object-cover"
                />
              )}
              <div className="space-y-1 p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  {new URL(data.finalUrl).hostname}
                </div>
                <div className="font-medium">{ogTitle || "(no title)"}</div>
                <div className="text-sm text-muted-foreground">
                  {ogDesc || "(no description)"}
                </div>
              </div>
            </div>
          </div>

          <MetaSection title="Basic" rows={[
            { key: "title", value: data.title },
            { key: "description", value: data.description },
            { key: "canonical", value: data.canonical },
          ]} />
          <MetaSection title="Open Graph" rows={data.og} />
          <MetaSection title="Twitter" rows={data.twitter} />
          {data.other.length > 0 && (
            <MetaSection title="Other meta" rows={data.other} />
          )}

          {(ogImage || twImage) && (
            <div className="text-xs text-muted-foreground">
              Tip: cached previews can be refreshed via{" "}
              <a
                className="underline"
                href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(data.finalUrl)}`}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
              ,{" "}
              <a
                className="underline"
                href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(data.finalUrl)}`}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              , and X.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MetaSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<MetaTag | { key: string; value: string | null }>;
}) {
  const visible = rows.filter((r) => r.value);
  if (visible.length === 0)
    return (
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">No tags found.</p>
      </div>
    );
  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <tbody>
            {visible.map((r, i) => (
              <tr key={`${r.key}-${i}`} className="border-b border-border last:border-0">
                <td className="w-1/3 bg-muted/40 px-3 py-2 align-top font-mono text-xs">
                  {r.key}
                </td>
                <td className="break-all px-3 py-2 align-top">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
