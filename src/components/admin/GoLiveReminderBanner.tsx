import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/**
 * Persistent reminder banner shown to admins while the Stripe go-live
 * checklist has not been marked complete. Pairs with the daily email
 * reminder so the same signal is visible in-app and in inbox.
 */
export function GoLiveReminderBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["payments-go-live-state"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments_go_live_state")
        .select("completed")
        .eq("id", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // RLS hides the row from non-admins, so data === null for guests/hosts.
  if (!data || data.completed) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Action required:</strong> Stripe go-live isn't finished —
            real payments are still declined.
          </span>
        </div>
        <Link
          to="/admin/payments-go-live"
          className="inline-flex items-center rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-amber-50 hover:bg-amber-800"
        >
          Open checklist
        </Link>
      </div>
    </div>
  );
}
