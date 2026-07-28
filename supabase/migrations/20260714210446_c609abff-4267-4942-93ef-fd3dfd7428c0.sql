-- Restrict anonymous access to sensitive payment handle columns on chef_profiles.
-- Anonymous visitors can still read public profile fields, but not payment identifiers.
REVOKE SELECT (venmo_handle, zelle_handle) ON public.chef_profiles FROM anon;
-- Ensure authenticated users retain access to all columns (owner + checkout flows).
GRANT SELECT ON public.chef_profiles TO authenticated;