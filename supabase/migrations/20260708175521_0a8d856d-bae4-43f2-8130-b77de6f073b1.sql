
-- Restrict SELECT on sensitive payment handle columns of chef_profiles.
-- Anyone can still read non-sensitive profile info, but zelle_handle and
-- venmo_handle are only readable via the security-definer function
-- public.get_chef_payment_handles (which enforces owner/admin/active-buyer checks).

REVOKE SELECT ON public.chef_profiles FROM anon, authenticated;

GRANT SELECT (
  id, tastemaker_id, user_id, instagram_url, tiktok_url, youtube_url,
  service_area, extended_bio, accepting_orders, created_at, updated_at
) ON public.chef_profiles TO anon, authenticated;

-- Keep write privileges for authenticated (RLS still restricts to owner/admin).
GRANT INSERT, UPDATE, DELETE ON public.chef_profiles TO authenticated;
GRANT ALL ON public.chef_profiles TO service_role;
