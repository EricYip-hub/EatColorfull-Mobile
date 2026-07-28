
CREATE OR REPLACE FUNCTION public.finalize_chef_order_paid(_order_id uuid, _stripe_session_id text, _stripe_payment_intent text, _coupon_code text DEFAULT NULL::text)
 RETURNS chef_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order public.chef_orders;
  _was_paid boolean;
BEGIN
  SELECT * INTO _order FROM public.chef_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  _was_paid := (_order.payment_status = 'paid');
  IF _was_paid THEN
    RETURN _order;
  END IF;

  UPDATE public.chef_orders
    SET payment_status = 'paid',
        status = 'confirmed',
        payment_method = COALESCE(NULLIF(payment_method, ''), 'card'),
        stripe_session_id = COALESCE(stripe_session_id, _stripe_session_id),
        stripe_payment_intent = _stripe_payment_intent,
        paid_at = now(),
        coupon_code = COALESCE(coupon_code, _coupon_code),
        updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO _order;

  UPDATE public.chef_listings
    SET inventory_remaining = GREATEST(0, inventory_remaining - _order.quantity),
        updated_at = now()
    WHERE id = _order.listing_id
      AND inventory_remaining IS NOT NULL;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    UPDATE public.event_coupons
      SET uses_count = uses_count + 1,
          updated_at = now()
      WHERE code = _coupon_code;
  END IF;

  INSERT INTO public.chef_payment_events
    (order_id, chef_id, user_id, event_type, payment_method, amount_cents, currency, reference, metadata)
  VALUES
    (_order.id, _order.chef_id, _order.user_id, 'paid',
     COALESCE(NULLIF(_order.payment_method, ''), 'card'),
     _order.total_cents, 'USD',
     COALESCE(_stripe_payment_intent, _stripe_session_id),
     jsonb_build_object(
       'stripe_session_id', _stripe_session_id,
       'stripe_payment_intent', _stripe_payment_intent,
       'coupon_code', _coupon_code
     ));

  RETURN _order;
END;
$function$;
