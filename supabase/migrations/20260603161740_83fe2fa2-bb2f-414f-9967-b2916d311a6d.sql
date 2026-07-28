CREATE OR REPLACE FUNCTION public.get_application_status(_id uuid)
RETURNS TABLE(id uuid, source text, name text, status text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fs.id, fs.source, fs.name,
         'received'::text AS status,
         fs.created_at
  FROM public.form_submissions fs
  WHERE fs.id = _id
    AND fs.source IN ('guest_application', 'host_application', 'tastemaker_application');
$$;

GRANT EXECUTE ON FUNCTION public.get_application_status(uuid) TO anon, authenticated;