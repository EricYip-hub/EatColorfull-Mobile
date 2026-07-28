REVOKE SELECT ON public.chef_profiles FROM anon;
GRANT SELECT (
  id, tastemaker_id, user_id, instagram_url, tiktok_url, youtube_url,
  service_area, extended_bio, accepting_orders, created_at, updated_at
) ON public.chef_profiles TO anon;

DROP POLICY IF EXISTS "Anyone reads active coupons" ON public.event_coupons;

CREATE OR REPLACE FUNCTION public.validate_event_coupon(_code text, _event_slug text)
RETURNS TABLE(valid boolean, discount_percent integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.event_coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.event_coupons WHERE code = _code;
  IF NOT FOUND OR NOT c.active THEN
    RETURN QUERY SELECT false, 0, 'invalid'::text; RETURN;
  END IF;
  IF c.event_slug IS NOT NULL AND c.event_slug <> _event_slug THEN
    RETURN QUERY SELECT false, 0, 'wrong_event'::text; RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT false, 0, 'expired'::text; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN QUERY SELECT false, 0, 'exhausted'::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, c.discount_percent, NULL::text;
END $$;

REVOKE ALL ON FUNCTION public.validate_event_coupon(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_event_coupon(text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone records clicks" ON public.chef_link_clicks;
CREATE POLICY "Anyone records clicks" ON public.chef_link_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (listing_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit meal prep requests" ON public.chef_meal_prep_requests;
CREATE POLICY "Anyone can submit meal prep requests" ON public.chef_meal_prep_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(full_name) BETWEEN 1 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(chef_slug) > 0
    AND status = 'new'
  );

DROP POLICY IF EXISTS "Anyone records profile views" ON public.chef_profile_views;
CREATE POLICY "Anyone records profile views" ON public.chef_profile_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (chef_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can create a booking" ON public.event_bookings;
CREATE POLICY "Anyone can create a booking" ON public.event_bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(event_slug) > 0
    AND char_length(full_name) BETWEEN 1 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND guest_count BETWEEN 1 AND 100
    AND payment_status = 'pending'
  );

DROP POLICY IF EXISTS "Anyone can log a form submission" ON public.form_submissions;
CREATE POLICY "Anyone can log a form submission" ON public.form_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(source) BETWEEN 1 AND 100
    AND (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

DROP POLICY IF EXISTS "Anyone can submit a host application" ON public.host_applications;
CREATE POLICY "Anyone can submit a host application" ON public.host_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(phone) > 0
    AND guest_count BETWEEN 1 AND 100
    AND status = 'new'
  );

DROP POLICY IF EXISTS "Public read chef photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tastemaker videos" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_manual_chef_payment(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_manual_chef_payment(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_seat(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_application_status(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_application_form(text, text, text, text, text, text, jsonb) FROM PUBLIC;
