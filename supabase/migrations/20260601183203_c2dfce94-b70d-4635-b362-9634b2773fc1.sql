
-- Table for meal prep requests submitted via the chef page
CREATE TABLE public.chef_meal_prep_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_slug text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  requested_date date,
  requested_time text,
  guest_count integer,
  city_state text,
  dining_setting text,
  dietary_restrictions text,
  food_allergies text,
  preferred_menu_items text,
  occasion_type text,
  service_type text,
  additional_notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.chef_meal_prep_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.chef_meal_prep_requests TO authenticated;
GRANT ALL ON public.chef_meal_prep_requests TO service_role;

ALTER TABLE public.chef_meal_prep_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit meal prep requests"
ON public.chef_meal_prep_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins view meal prep requests"
ON public.chef_meal_prep_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update meal prep requests"
ON public.chef_meal_prep_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_chef_meal_prep_requests_updated_at
BEFORE UPDATE ON public.chef_meal_prep_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Table for editable per-chef service info (first use dates, etc.)
CREATE TABLE public.chef_service_info (
  chef_slug text PRIMARY KEY,
  first_use_date date,
  first_interstate_use_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chef_service_info TO anon, authenticated;
GRANT ALL ON public.chef_service_info TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.chef_service_info TO authenticated;

ALTER TABLE public.chef_service_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read chef service info"
ON public.chef_service_info FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage chef service info"
ON public.chef_service_info FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_chef_service_info_updated_at
BEFORE UPDATE ON public.chef_service_info
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed Moshe's row
INSERT INTO public.chef_service_info (chef_slug) VALUES ('moshe-fhima')
ON CONFLICT (chef_slug) DO NOTHING;
