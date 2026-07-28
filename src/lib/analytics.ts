import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "__cf_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "no-session";
  }
}

export async function track(
  event: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("client_events").insert({
      event,
      props: props as never,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      path: window.location.pathname + window.location.search,
      user_agent: navigator.userAgent,
    });
  } catch (e) {
    // Analytics must never break the app
    console.warn("[analytics] failed", event, e);
  }
}
