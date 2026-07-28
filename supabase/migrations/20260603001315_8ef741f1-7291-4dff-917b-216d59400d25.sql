
CREATE TABLE public.payments_go_live_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payments_go_live_state (id, completed) VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.payments_go_live_state TO authenticated;
GRANT ALL ON public.payments_go_live_state TO service_role;

ALTER TABLE public.payments_go_live_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read go-live state"
  ON public.payments_go_live_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update go-live state"
  ON public.payments_go_live_state FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
