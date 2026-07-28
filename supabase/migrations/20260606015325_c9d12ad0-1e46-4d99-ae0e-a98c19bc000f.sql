
ALTER TABLE public.chef_orders
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS guest_email text;

CREATE TABLE IF NOT EXISTS public.order_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.chef_orders(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  template text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'both',
  status text NOT NULL DEFAULT 'pending',
  in_app_sent_at timestamptz,
  sms_sent_at timestamptz,
  sms_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_reminders_status_chk CHECK (status IN ('pending','sent','cancelled','failed')),
  CONSTRAINT order_reminders_channel_chk CHECK (channel IN ('in_app','sms','both'))
);

CREATE INDEX IF NOT EXISTS idx_order_reminders_due
  ON public.order_reminders (status, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_reminders_order
  ON public.order_reminders (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reminders TO authenticated;
GRANT ALL ON public.order_reminders TO service_role;

ALTER TABLE public.order_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef manages reminders on own orders"
  ON public.order_reminders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chef_profiles cp
      WHERE cp.id = order_reminders.chef_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chef_profiles cp
      WHERE cp.id = order_reminders.chef_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Guest views reminders on own order"
  ON public.order_reminders
  FOR SELECT
  TO authenticated
  USING (guest_user_id = auth.uid());

CREATE POLICY "Admins manage reminders"
  ON public.order_reminders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER order_reminders_updated
  BEFORE UPDATE ON public.order_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
