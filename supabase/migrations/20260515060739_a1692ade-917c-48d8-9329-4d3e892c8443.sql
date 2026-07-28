
-- Promote next waitlisted guest(s) when capacity allows
CREATE OR REPLACE FUNCTION public.promote_waitlist(_table_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _capacity int;
  _filled int;
  _slots int;
  _next public.join_requests;
BEGIN
  SELECT seats_total INTO _capacity FROM public.tables_meta WHERE id = _table_id;
  IF _capacity IS NULL THEN _capacity := 8; END IF;

  SELECT count(*) INTO _filled FROM public.join_requests
    WHERE table_id = _table_id AND status IN ('approved'::request_status, 'paid'::request_status);

  _slots := _capacity - _filled;

  WHILE _slots > 0 LOOP
    SELECT * INTO _next FROM public.join_requests
      WHERE table_id = _table_id AND status = 'waitlisted'::request_status
      ORDER BY created_at ASC
      LIMIT 1;
    EXIT WHEN _next.id IS NULL;

    UPDATE public.join_requests
      SET status = 'approved'::request_status,
          decided_at = now(),
          host_note = COALESCE(host_note, 'Auto-promoted from waitlist')
      WHERE id = _next.id;

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_next.user_id, 'promoted', 'A seat just opened',
            'You''ve been promoted from the waitlist. Pay to confirm your seat.', '/dashboard');

    _slots := _slots - 1;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_waitlist(text) FROM anon, authenticated;

-- Trigger: notifications + auto-promote when seats free up
CREATE OR REPLACE FUNCTION public.trg_join_request_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'approved'::request_status AND OLD.status = 'pending'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'approved', 'Your seat was approved',
              'Pay to confirm your reservation.', '/dashboard');
    ELSIF NEW.status = 'declined'::request_status AND OLD.status = 'pending'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'declined', 'Request not accepted',
              COALESCE(NEW.host_note, 'The host could not confirm your seat.'), '/dashboard');
    ELSIF NEW.status = 'paid'::request_status AND OLD.status = 'approved'::request_status THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'confirmed', 'Reservation confirmed',
              'Your seat is confirmed. We''ll send arrival details closer to the date.', '/dashboard');
    END IF;

    -- A confirmed/approved seat was released → try promoting waitlist
    IF (OLD.status IN ('approved'::request_status, 'paid'::request_status)
        AND NEW.status IN ('cancelled'::request_status, 'declined'::request_status)) THEN
      PERFORM public.promote_waitlist(NEW.table_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS join_requests_changes ON public.join_requests;
CREATE TRIGGER join_requests_changes
AFTER UPDATE ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_join_request_changes();

-- RPC for guests to submit a join request that auto-routes to pending or waitlisted
CREATE OR REPLACE FUNCTION public.request_seat(_table_id text, _message text)
RETURNS public.join_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _capacity int;
  _filled int;
  _row public.join_requests;
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

  INSERT INTO public.join_requests (user_id, table_id, message, status)
  VALUES (_uid, _table_id, _message, _status)
  RETURNING * INTO _row;

  IF _status = 'waitlisted'::request_status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_uid, 'waitlisted', 'You''re on the waitlist',
            'This table is full. We''ll notify you the moment a seat opens.',
            '/tables/' || _table_id);
  END IF;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_seat(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_seat(text, text) TO authenticated;
