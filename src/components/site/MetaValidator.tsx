import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  validateShareMeta,
  type ValidationResult,
  type ValidationCheck,
} from "@/lib/validate-share-meta.functions";

const STATUS_STYLES: Record<ValidationCheck["status"], string> = {
  pass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  fail: "bg-destructive/15 text-destructive border-destructive/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

const STATUS_LABEL: Record<ValidationCheck["status"], string> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
};

export function MetaValidator({ defaultUrl }: { defaultUrl: string }) {
  const validate = useServerFn(validateShareMeta);
  const [url, setUrl] = useState(defaultUrl);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setResult(await validate({ data: { url } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">After publish</p>
          <h2 className="mt-2 font-serif text-2xl">Live meta validator</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fetches the live URL and runs pass/fail checks against every required
            og:* and twitter:* tag, including verifying the image URL actually
            loads.
          </p>
        </div>
      </div>

      <form onSubmit={run} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Validating…" : "Run validation"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge status="pass" count={result.passed} />
            <Badge status="warn" count={result.warned} />
            <Badge status="fail" count={result.failed} />
            <span className="text-muted-foreground">
              · {new Date(result.fetchedAt).toLocaleTimeString()}
            </span>
          </div>

          <ul className="space-y-2">
            {result.checks.map((c) => (
              <li
                key={c.id}
                className={`rounded-md border px-4 py-3 ${STATUS_STYLES[c.status]}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{c.label}</div>
                  <span className="font-mono text-[10px] tracking-wider">
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">{c.detail}</p>
                {(c.expected || c.actual) && (
                  <div className="mt-2 grid gap-1 font-mono text-[11px] opacity-80 sm:grid-cols-2">
                    {c.expected && (
                      <div>
                        <span className="opacity-60">expected:</span> {c.expected}
                      </div>
                    )}
                    {c.actual && (
                      <div className="break-all">
                        <span className="opacity-60">actual:</span> {c.actual}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Badge({ status, count }: { status: ValidationCheck["status"]; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="font-mono">{STATUS_LABEL[status]}</span>
      <span>{count}</span>
    </span>
  );
}
