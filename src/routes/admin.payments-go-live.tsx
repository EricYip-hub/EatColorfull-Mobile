import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Loader2, ExternalLink, Lock, BellOff, Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/payments-go-live")({
  head: () => ({
    meta: [
      { title: "Payments Go-Live Checklist" },
      { name: "description", content: "Track Stripe go-live progress for Eat Colorfull payments." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PaymentsGoLivePage,
});

type StepStatus = "completed" | "in_progress" | "not_started" | "locked";

interface Step {
  num: number;
  title: string;
  status: StepStatus;
  description: string;
  action: { label: string; href?: string } | null;
  estimate: string;
}

const steps: Step[] = [
  {
    num: 1,
    title: "Connect your sandbox to a Stripe account",
    status: "completed",
    description: "Done — the project's sandbox is claimed.",
    action: null,
    estimate: "Complete",
  },
  {
    num: 2,
    title: "Complete the go-live form on Stripe",
    status: "in_progress",
    description:
      "Fill out business info, bank account for payouts, and ID verification in the Stripe dashboard. This is where you decide whose bank account receives the money (Moshe's, or yours).",
    action: {
      label: "Open Stripe go-live form",
      href: "https://dashboard.stripe.com/account/onboarding",
    },
    estimate: "10–15 min + up to 24h for Stripe review",
  },
  {
    num: 3,
    title: "Install the Lovable app on your LIVE Stripe account",
    status: "locked",
    description:
      "One click to connect Lovable to your activated live account. Unlocks after step 2 is approved.",
    action: null,
    estimate: "~1 min",
  },
  {
    num: 4,
    title: "Provision live API keys",
    status: "locked",
    description:
      "Lovable provisions live publishable + secret keys automatically. Nothing for you to do.",
    action: null,
    estimate: "~1–2 min (automated)",
  },
  {
    num: 5,
    title: "Readiness check",
    status: "locked",
    description:
      "Automated validation that products, prices, and webhooks are wired correctly. Run from the Payments tab once steps 2–4 complete.",
    action: null,
    estimate: "~30 sec",
  },
];

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
  if (status === "in_progress")
    return <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />;
  if (status === "locked")
    return <Lock className="h-6 w-6 text-muted-foreground/50" />;
  return <Circle className="h-6 w-6 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: StepStatus }) {
  const styles: Record<StepStatus, string> = {
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    in_progress: "bg-amber-100 text-amber-900 border-amber-200",
    not_started: "bg-muted text-foreground border-border",
    locked: "bg-muted/50 text-muted-foreground border-border",
  };
  const labels: Record<StepStatus, string> = {
    completed: "Complete",
    in_progress: "Action required",
    not_started: "Not started",
    locked: "Locked",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PaymentsGoLivePage() {
  const completed = steps.filter((s) => s.status === "completed").length;
  const pct = Math.round((completed / steps.length) * 100);
  const qc = useQueryClient();

  const { data: state } = useQuery({
    queryKey: ["payments-go-live-state"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments_go_live_state")
        .select("completed, completed_at")
        .eq("id", true)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const setCompleted = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("payments_go_live_state")
        .update({
          completed: next,
          completed_at: next ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["payments-go-live-state"] });
      toast.success(
        next
          ? "Reminders paused — daily emails will stop."
          : "Reminders re-enabled — you'll get a daily email until complete."
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update state"),
  });

  const isDone = !!state?.completed;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Admin
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Payments go-live checklist
          </h1>
          <p className="text-muted-foreground">
            Real credit-card payments are <strong>not active yet</strong>. The
            checkout buttons on Moshe's profile only accept Stripe test cards
            until every step below is complete.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">
                Progress: {completed} of {steps.length} steps
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div
            className={`mt-6 rounded-xl border p-4 flex flex-wrap items-start justify-between gap-3 ${
              isDone
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-2 text-sm">
              {isDone ? (
                <BellOff className="h-4 w-4 mt-0.5 text-emerald-700" />
              ) : (
                <Bell className="h-4 w-4 mt-0.5 text-amber-700" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isDone
                    ? "Reminders paused"
                    : "Daily reminders active"}
                </p>
                <p className="text-muted-foreground">
                  {isDone
                    ? "You won't receive go-live reminder emails."
                    : "You'll get an email at info@eatcolorfull.com each morning until you mark this complete. An in-app banner also shows on your dashboard."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompleted.mutate(!isDone)}
              disabled={setCompleted.isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition disabled:opacity-50 ${
                isDone
                  ? "border border-emerald-700 text-emerald-800 hover:bg-emerald-100"
                  : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              {setCompleted.isPending
                ? "Saving…"
                : isDone
                ? "Re-enable reminders"
                : "Mark go-live complete"}
            </button>
          </div>
        </header>

        <ol className="space-y-4">
          {steps.map((step) => (
            <li
              key={step.num}
              className={`rounded-xl border p-5 transition ${
                step.status === "in_progress"
                  ? "border-amber-300 bg-amber-50/50 shadow-sm"
                  : step.status === "locked"
                  ? "border-border bg-muted/20 opacity-70"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <StatusIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-muted-foreground">
                      Step {step.num}
                    </span>
                    <StatusBadge status={step.status} />
                  </div>
                  <h2 className="font-semibold text-foreground mb-1">
                    {step.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      ⏱ {step.estimate}
                    </span>
                    {step.action && (
                      <a
                        href={step.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
                      >
                        {step.action.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-2">
            What happens when all steps are green?
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>The same "Pay & reserve" buttons start accepting real cards automatically.</li>
            <li>Stripe deducts ~2.9% + 30¢ per transaction, plus 0.5% tax automation.</li>
            <li>Funds deposit to the bank account entered in step 2 (typically 2–3 business days).</li>
            <li>You'll see real transactions appear in the Payments tab.</li>
          </ul>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Tip: Bookmark this page so you can check progress at a glance. Status
          reflects manual tracking — for the live state, open the Payments tab
          in your Lovable project.
        </p>
      </div>
    </main>
  );
}
