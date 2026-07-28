
-- 1. Columns on host_applications
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS max_capacity integer,
  ADD COLUMN IF NOT EXISTS food_prep_location text,
  ADD COLUMN IF NOT EXISTS county_city text,
  ADD COLUMN IF NOT EXISTS permit_number text,
  ADD COLUMN IF NOT EXISTS permit_agency text,
  ADD COLUMN IF NOT EXISTS permit_expiration date,
  ADD COLUMN IF NOT EXISTS compliance_docs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Storage policies on storage.objects for host-compliance-docs (private)
-- Admins (has_role admin) can read, insert, update, delete
DROP POLICY IF EXISTS "Admins can read host compliance docs" ON storage.objects;
CREATE POLICY "Admins can read host compliance docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'host-compliance-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can upload host compliance docs" ON storage.objects;
CREATE POLICY "Admins can upload host compliance docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'host-compliance-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can update host compliance docs" ON storage.objects;
CREATE POLICY "Admins can update host compliance docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'host-compliance-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can delete host compliance docs" ON storage.objects;
CREATE POLICY "Admins can delete host compliance docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'host-compliance-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
