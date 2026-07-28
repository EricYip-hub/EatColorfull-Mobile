
-- 1) Hide payment handles from anon (public internet)
REVOKE SELECT (venmo_handle, zelle_handle) ON public.chef_profiles FROM anon;

-- 2) Lock down SECURITY DEFINER helpers that should NOT be callable via PostgREST
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.email_queue_wake()',
    'public.email_queue_dispatch()',
    'public.purge_old_notifications()',
    'public.promote_waitlist(text)',
    'public.finalize_chef_order_paid(uuid, text, text, text)',
    'public.handle_new_user()',
    'public.set_updated_at()',
    'public.trg_join_request_changes()',
    'public.trg_form_submission_notify()',
    'public.trg_chef_order_notifications()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- 3) Ensure client-callable RPCs keep the execute grants they need
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_application_form(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_application_status(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_event_coupon(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_seat(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_manual_chef_payment(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_manual_chef_payment(uuid, text) TO authenticated, service_role;
