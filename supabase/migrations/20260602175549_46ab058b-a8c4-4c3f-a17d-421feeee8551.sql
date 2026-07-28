
-- Unified audit log of every public/user form submission across the site.
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  user_id uuid,
  name text,
  email text,
  phone text,
  location text,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_created_at ON public.form_submissions (created_at DESC);
CREATE INDEX idx_form_submissions_source ON public.form_submissions (source);
CREATE INDEX idx_form_submissions_email ON public.form_submissions (lower(email));

GRANT INSERT ON public.form_submissions TO anon, authenticated;
GRANT SELECT ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous form submissions) can append to the log.
CREATE POLICY "Anyone can log a form submission"
  ON public.form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the log.
CREATE POLICY "Admins read all form submissions"
  ON public.form_submissions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-log every new auth user as a 'signup' submission via the existing handle_new_user trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, 'guest');

  insert into public.form_submissions (source, user_id, name, email, payload)
  values (
    'signup',
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    jsonb_build_object('provider', coalesce(new.raw_app_meta_data->>'provider', 'email'))
  );

  return new;
end;
$function$;
