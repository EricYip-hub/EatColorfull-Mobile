CREATE OR REPLACE FUNCTION public.submit_application_form(
  _source text,
  _name text,
  _email text,
  _phone text,
  _location text,
  _notes text,
  _payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _source NOT IN ('guest_application', 'host_application', 'tastemaker_application') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;
  INSERT INTO public.form_submissions (source, user_id, name, email, phone, location, notes, payload)
  VALUES (_source, auth.uid(), NULLIF(btrim(_name), ''), NULLIF(btrim(_email), ''),
          NULLIF(btrim(_phone), ''), NULLIF(btrim(_location), ''), NULLIF(btrim(_notes), ''),
          COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_application_form(text, text, text, text, text, text, jsonb) TO anon, authenticated;