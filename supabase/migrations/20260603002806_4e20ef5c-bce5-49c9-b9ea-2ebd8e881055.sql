
CREATE OR REPLACE FUNCTION public.submit_manual_chef_payment(
  _order_id uuid,
  _method text,
  _reference text,
  _note text
) RETURNS public.chef_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _order public.chef_orders;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _method NOT IN ('zelle', 'venmo') THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;

  SELECT * INTO _order FROM public.chef_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF _order.user_id <> _uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF _order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'already_paid';
  END IF;

  UPDATE public.chef_orders
    SET payment_method = _method,
        payment_reference = NULLIF(btrim(_reference), ''),
        payment_proof_note = NULLIF(btrim(_note), ''),
        payment_status = 'pending_verification',
        status = 'pending',
        updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO _order;

  INSERT INTO public.chef_payment_events
    (order_id, chef_id, user_id, event_type, payment_method, amount_cents, currency, reference, note, actor_user_id, metadata)
  VALUES
    (_order.id, _order.chef_id, _order.user_id, 'manual_payment_submitted', _method,
     _order.total_cents, 'USD', NULLIF(btrim(_reference), ''), NULLIF(btrim(_note), ''), _uid,
     jsonb_build_object('quantity', _order.quantity));

  RETURN _order;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_manual_chef_payment(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_manual_chef_payment(uuid, text, text, text) TO authenticated;
