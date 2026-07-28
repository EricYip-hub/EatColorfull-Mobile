
CREATE OR REPLACE FUNCTION public.confirm_manual_chef_payment(_order_id uuid, _note text DEFAULT NULL)
RETURNS public.chef_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _order public.chef_orders;
  _is_admin boolean;
  _is_chef_owner boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO _order FROM public.chef_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  _is_admin := public.has_role(_uid, 'admin'::app_role);
  SELECT EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = _order.chef_id AND cp.user_id = _uid
  ) INTO _is_chef_owner;

  IF NOT (_is_admin OR _is_chef_owner) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _order.payment_status = 'paid' THEN
    RETURN _order;
  END IF;

  IF _order.payment_method NOT IN ('zelle', 'venmo') THEN
    RAISE EXCEPTION 'not_a_manual_payment';
  END IF;

  UPDATE public.chef_orders
    SET payment_status = 'paid',
        status = 'confirmed',
        paid_at = now(),
        updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO _order;

  UPDATE public.chef_listings
    SET inventory_remaining = GREATEST(0, inventory_remaining - _order.quantity),
        updated_at = now()
    WHERE id = _order.listing_id
      AND inventory_remaining IS NOT NULL;

  INSERT INTO public.chef_payment_events
    (order_id, chef_id, user_id, event_type, payment_method, amount_cents, currency, reference, note, actor_user_id, metadata)
  VALUES
    (_order.id, _order.chef_id, _order.user_id, 'manual_payment_confirmed',
     _order.payment_method, _order.total_cents, 'USD',
     _order.payment_reference, NULLIF(btrim(_note), ''),
     _uid,
     jsonb_build_object('confirmed_by', CASE WHEN _is_admin THEN 'admin' ELSE 'chef' END));

  RETURN _order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_manual_chef_payment(uuid, text) TO authenticated;
