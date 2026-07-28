
REVOKE SELECT (venmo_handle, zelle_handle) ON public.chef_profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_chef_payment_handles(_chef_id uuid)
RETURNS TABLE(zelle_handle text, venmo_handle text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _allowed boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  SELECT (cp.user_id = _uid) OR public.has_role(_uid, 'admin'::app_role)
    INTO _allowed
    FROM public.chef_profiles cp
    WHERE cp.id = _chef_id;

  IF NOT COALESCE(_allowed, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.chef_orders co
      WHERE co.chef_id = _chef_id
        AND co.user_id = _uid
        AND co.status <> 'cancelled'::chef_order_status
    ) INTO _allowed;
  END IF;

  IF NOT _allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT cp.zelle_handle, cp.venmo_handle
    FROM public.chef_profiles cp
    WHERE cp.id = _chef_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chef_payment_handles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chef_payment_handles(uuid) TO authenticated;
