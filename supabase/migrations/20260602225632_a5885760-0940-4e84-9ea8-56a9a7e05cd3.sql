-- 1) Payment tracking on chef_orders
ALTER TABLE public.chef_orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_orders_stripe_session
  ON public.chef_orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- 2) Wire up the existing handle_new_user() function as an auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Atomic finalize-paid helper (called from Stripe webhook)
CREATE OR REPLACE FUNCTION public.finalize_chef_order_paid(
  _order_id uuid,
  _stripe_session_id text,
  _stripe_payment_intent text,
  _coupon_code text DEFAULT NULL
)
RETURNS public.chef_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.chef_orders;
BEGIN
  -- Idempotent: if already paid, return existing row
  SELECT * INTO _order FROM public.chef_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF _order.payment_status = 'paid' THEN
    RETURN _order;
  END IF;

  UPDATE public.chef_orders
    SET payment_status = 'paid',
        status = 'confirmed',
        stripe_session_id = COALESCE(stripe_session_id, _stripe_session_id),
        stripe_payment_intent = _stripe_payment_intent,
        paid_at = now(),
        coupon_code = COALESCE(coupon_code, _coupon_code),
        updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO _order;

  -- Decrement inventory (clamped at 0)
  UPDATE public.chef_listings
    SET inventory_remaining = GREATEST(0, inventory_remaining - _order.quantity),
        updated_at = now()
    WHERE id = _order.listing_id
      AND inventory_remaining IS NOT NULL;

  -- Bump coupon usage if a coupon was applied
  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    UPDATE public.event_coupons
      SET uses_count = uses_count + 1,
          updated_at = now()
      WHERE code = _coupon_code;
  END IF;

  RETURN _order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_chef_order_paid(uuid, text, text, text) TO service_role;