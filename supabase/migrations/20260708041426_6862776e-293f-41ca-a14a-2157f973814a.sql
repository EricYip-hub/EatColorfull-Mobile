CREATE OR REPLACE FUNCTION public.request_seat(_table_id text, _message text)
 RETURNS join_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _capacity int;
  _filled int;
  _row public.join_requests;
  _existing public.join_requests;
  _status request_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- prevent duplicate active request
  IF EXISTS (
    SELECT 1 FROM public.join_requests
    WHERE user_id = _uid AND table_id = _table_id
      AND status IN ('pending'::request_status, 'approved'::request_status,
                     'paid'::request_status, 'waitlisted'::request_status)
  ) THEN
    RAISE EXCEPTION 'You already have an active request for this table';
  END IF;

  SELECT seats_total INTO _capacity FROM public.tables_meta WHERE id = _table_id;
  IF _capacity IS NULL THEN _capacity := 8; END IF;

  SELECT count(*) INTO _filled FROM public.join_requests
    WHERE table_id = _table_id AND status IN ('approved'::request_status, 'paid'::request_status);

  IF _filled >= _capacity THEN
    _status := 'waitlisted'::request_status;
  ELSE
    _status := 'pending'::request_status;
  END IF;

  -- If there's a prior cancelled/declined row, reuse it (unique constraint on user_id,table_id)
  SELECT * INTO _existing FROM public.join_requests
    WHERE user_id = _uid AND table_id = _table_id
      AND status IN ('cancelled'::request_status, 'declined'::request_status)
    ORDER BY created_at DESC
    LIMIT 1;

  IF FOUND THEN
    UPDATE public.join_requests
      SET status = _status,
          message = _message,
          host_note = NULL,
          decided_at = NULL,
          decided_by = NULL,
          paid_at = NULL,
          created_at = now()
      WHERE id = _existing.id
      RETURNING * INTO _row;
  ELSE
    INSERT INTO public.join_requests (user_id, table_id, message, status)
    VALUES (_uid, _table_id, _message, _status)
    RETURNING * INTO _row;
  END IF;

  IF _status = 'waitlisted'::request_status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_uid, 'waitlisted', 'You''re on the waitlist',
            'This table is full. We''ll notify you the moment a seat opens.',
            '/tables/' || _table_id);
  END IF;

  RETURN _row;
END;
$function$;