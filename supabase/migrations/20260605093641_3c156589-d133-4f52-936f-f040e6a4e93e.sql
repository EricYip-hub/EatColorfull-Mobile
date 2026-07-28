
CREATE TABLE public.chef_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  chef_name text,
  description text,
  event_date timestamptz,
  pickup_address text,
  cover_url text,
  menu jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chef_events_owner_idx ON public.chef_events(owner_id);
CREATE INDEX chef_events_slug_idx ON public.chef_events(slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chef_events TO authenticated;
GRANT SELECT ON public.chef_events TO anon;
GRANT ALL ON public.chef_events TO service_role;

ALTER TABLE public.chef_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are viewable by everyone"
  ON public.chef_events FOR SELECT
  USING (status = 'published' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hosts and admins can insert their own events"
  ON public.chef_events FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (public.has_role(auth.uid(), 'host'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Owners and admins can update their events"
  ON public.chef_events FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete their events"
  ON public.chef_events FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chef_events_set_updated_at
  BEFORE UPDATE ON public.chef_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
