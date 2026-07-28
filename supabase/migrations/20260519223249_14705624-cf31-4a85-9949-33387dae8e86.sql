-- Lock down internal helper: promote_waitlist is only meant to be invoked
-- from the trg_join_request_changes trigger, never directly by clients.
REVOKE EXECUTE ON FUNCTION public.promote_waitlist(text) FROM PUBLIC, anon, authenticated;

-- request_seat is intentionally an RPC for authenticated users, but we tighten
-- the grant so anonymous callers cannot reach it.
REVOKE EXECUTE ON FUNCTION public.request_seat(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_seat(text, text) TO authenticated;

-- purge_old_notifications runs from pg_cron / service role only.
REVOKE EXECUTE ON FUNCTION public.purge_old_notifications() FROM PUBLIC, anon, authenticated;