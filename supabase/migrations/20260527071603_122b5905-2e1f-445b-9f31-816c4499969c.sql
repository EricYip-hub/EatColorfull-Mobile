
CREATE TABLE public.chef_share_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chef_id UUID NOT NULL,
  listing_id UUID,
  platform TEXT NOT NULL,
  share_url TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_share_events_chef ON public.chef_share_events(chef_id, created_at DESC);
CREATE INDEX idx_chef_share_events_listing ON public.chef_share_events(listing_id);

GRANT SELECT, INSERT ON public.chef_share_events TO authenticated;
GRANT ALL ON public.chef_share_events TO service_role;

ALTER TABLE public.chef_share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef reads own share events"
  ON public.chef_share_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chef_profiles cp
    WHERE cp.id = chef_share_events.chef_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Admins read share events"
  ON public.chef_share_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated record share events"
  ON public.chef_share_events
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
