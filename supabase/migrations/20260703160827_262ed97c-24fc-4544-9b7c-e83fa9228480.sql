
CREATE POLICY "Anyone can upload safety report attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'safety-report-attachments');

CREATE POLICY "Admins can read safety report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'safety-report-attachments'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
