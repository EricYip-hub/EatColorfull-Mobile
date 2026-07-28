
ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS zelle_handle text,
  ADD COLUMN IF NOT EXISTS venmo_handle text;

ALTER TABLE public.chef_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_proof_note text;

CREATE TABLE IF NOT EXISTS public.chef_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  chef_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  payment_method text,
  amount_cents integer,
  currency text DEFAULT 'USD',
  reference text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_payment_events_order ON public.chef_payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_chef_payment_events_chef ON public.chef_payment_events(chef_id);
CREATE INDEX IF NOT EXISTS idx_chef_payment_events_created ON public.chef_payment_events(created_at DESC);

GRANT SELECT, INSERT ON public.chef_payment_events TO authenticated;
GRANT ALL ON public.chef_payment_events TO service_role;

ALTER TABLE public.chef_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment events"
ON public.chef_payment_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Chef views payment events for own orders"
ON public.chef_payment_events
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chef_profiles cp
  WHERE cp.id = chef_payment_events.chef_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users view own payment events"
ON public.chef_payment_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own payment events"
ON public.chef_payment_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
