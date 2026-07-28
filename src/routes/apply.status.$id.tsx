import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ApplicationStatus = {
  id: string;
  source: string;
  name: string | null;
  status: string;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  guest_application: "Guest application",
  host_application: "Host application",
  tastemaker_application: "Tastemaker application",
};

const STATUS_COPY: Record<string, { label: string; body: string }> = {
  received: {
    label: "Received",
    body: "We've received your application and our team is reviewing it personally. We'll reach out by email once a decision is made.",
  },
};

export const Route = createFileRoute("/apply/status/$id")({
  head: () => ({
    meta: [
      { title: "Application status — Colorfull" },
      { name: "description", content: "Track the status of your Colorfull application." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplicationStatusPage,
  errorComponent: ({ reset }) => (
    <ErrorView onRetry={reset} message="Something went wrong loading this application." />
  ),
  notFoundComponent: () => (
    <ErrorView message="We couldn't find an application with that link." />
  ),
});

function ApplicationStatusPage() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["application-status", id],
    queryFn: async (): Promise<ApplicationStatus | null> => {
      const { data, error } = await supabase
        .rpc("get_application_status", { _id: id })
        .maybeSingle();
      if (error) throw error;
      return (data as ApplicationStatus | null) ?? null;
    },
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24">
        <p className="eyebrow">Application status</p>
        <p className="mt-6 text-muted-foreground">Loading your application…</p>
      </section>
    );
  }

  if (isError) {
    return <ErrorView onRetry={() => { void refetch(); void router.invalidate(); }} message="Something went wrong loading this application." />;
  }

  if (!data) {
    return <ErrorView message="We couldn't find an application with that link. Double-check the URL or contact us if you think this is a mistake." />;
  }

  const status = STATUS_COPY[data.status] ?? STATUS_COPY.received;
  const submitted = new Date(data.created_at).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <p className="eyebrow">Application status</p>
      <h1 className="mt-3 font-serif text-4xl text-balance md:text-5xl">
        {data.name ? `Thanks, ${data.name.split(" ")[0]}.` : "Thanks for applying."}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your {SOURCE_LABEL[data.source]?.toLowerCase() ?? "application"} is on its way to our review team.
      </p>

      <div className="mt-10 border border-border bg-secondary/40 p-8">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-foreground" aria-hidden />
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Current status</p>
        </div>
        <h2 className="mt-3 font-serif text-2xl">{status.label}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{status.body}</p>

        <dl className="mt-8 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Reference ID</dt>
            <dd className="mt-1 font-mono text-xs break-all">{data.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Submitted</dt>
            <dd className="mt-1">{submitted}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-10 flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          Save this page — you can return to this link anytime to check your status.
        </p>
        <div className="flex gap-4">
          <Link to="/" className="underline underline-offset-[6px] hover:text-foreground">
            Back to home
          </Link>
          <Link to="/discover" className="underline underline-offset-[6px] hover:text-foreground">
            Browse dinners
          </Link>
        </div>
      </div>
    </section>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <p className="eyebrow">Application status</p>
      <h1 className="mt-3 font-serif text-4xl">We hit a snag.</h1>
      <p className="mt-4 text-muted-foreground">{message}</p>
      <div className="mt-8 flex gap-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center bg-foreground px-6 text-[11px] uppercase tracking-[0.24em] text-background hover:bg-foreground/90"
          >
            Try again
          </button>
        )}
        <Link
          to="/apply"
          search={{ intent: "attend" }}
          className="inline-flex h-11 items-center justify-center border border-border px-6 text-[11px] uppercase tracking-[0.24em] hover:bg-secondary"
        >
          Start a new application
        </Link>
      </div>
    </section>
  );
}
