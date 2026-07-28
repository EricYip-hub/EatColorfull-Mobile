
REVOKE ALL ON FUNCTION public.promote_waitlist(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_join_request_changes() FROM PUBLIC, anon, authenticated;
-- request_seat is the public RPC; allow only authenticated
REVOKE ALL ON FUNCTION public.request_seat(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_seat(text, text) TO authenticated;
